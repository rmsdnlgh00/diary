"""Run in Blender: bake the six mood faces into small patches of the character texture.

The village character's face is painted into its texture (always a gentle smile). This
script sets up the same front view as scripts/render-portrait-base.py, then for every texel
of the face it finds where that texel appears in the front image and copies the colour from
assets/portraits/flat/<emotion>.png (the faces drawn on the unlit render by
scripts/make-portraits.py --flat). Only the area where any face differs from the original is
baked: assets/portraits/baked/<emotion>.png (full texture) and mask.png (changed texels).
scripts/pack-face-atlas.py cuts the changed tiles into the small atlas the game uses.
Nothing is saved; reopen your blend afterwards.
"""
import os
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

repo = Path(os.environ.get("DIARY_REPO_ROOT", "/Users/geun-wiho/github/diary"))
EMOTIONS = ("normal", "happy", "joyful", "sad", "angry", "annoyed")

# Same scene as the portrait render (character, idle pose, orthographic front camera).
setup = (repo / "scripts/render-portrait-base.py").read_text().split("scene.render.filepath = str(output)")[0]
exec(setup)
scene = bpy.context.scene
bpy.context.view_layer.update()  # the new camera's matrix_world is stale until now
cam = scene.camera
ch = bpy.data.objects["char1.001"]


def load(path):
    img = bpy.data.images.load(str(path), check_existing=False)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top row first
    bpy.data.images.remove(img)
    return px


base = load(repo / "assets/portraits/base-flat.png")
faces = {e: load(repo / f"assets/portraits/flat/{e}.png") for e in EMOTIONS}
SIZE = base.shape[0]
changed = np.zeros(base.shape[:2], bool)
for img in faces.values():
    changed |= np.abs(img[..., :3] - base[..., :3]).sum(-1) > 0.03
# Grow a little so anti-aliased edges are carried over too.
for _ in range(3):
    g = changed.copy()
    g[1:] |= changed[:-1]; g[:-1] |= changed[1:]; g[:, 1:] |= changed[:, :-1]; g[:, :-1] |= changed[:, 1:]
    changed = g
ys, xs = np.nonzero(changed)
print("changed pixels", len(xs), "bbox", xs.min(), xs.max(), ys.min(), ys.max())

# Orthographic projection: world → image pixels (x right, y down).
to_cam = cam.matrix_world.inverted()
scale = cam.data.ortho_scale


def project(points):  # (n, 3) world → (n, 2) image px
    p = np.c_[points, np.ones(len(points))] @ np.array(to_cam).T
    return np.c_[(p[:, 0] / scale + 0.5) * SIZE, (0.5 - p[:, 1] / scale) * SIZE]


view = (cam.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()  # towards the camera
dg = bpy.context.evaluated_depsgraph_get()
ev = ch.evaluated_get(dg)
me = ev.to_mesh()
me.calc_loop_triangles()
mw = ch.matrix_world
co = np.array([mw @ v.co for v in me.vertices])
uv = np.zeros(len(me.loops) * 2, np.float32)
me.uv_layers.active.data.foreach_get("uv", uv)
uv = uv.reshape(-1, 2)
print('uv range', uv.min(0), uv.max(0))
tex = next(n.image for n in ch.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE")
TW, TH = tex.size
img_xy = project(co)

out = {e: np.zeros((TH, TW, 4), np.float32) for e in EMOTIONS}  # texture space, bottom row first
written = np.zeros((TH, TW), bool)
normal_m = mw.to_3x3()
for tri in me.loop_triangles:
    n = (normal_m @ tri.normal).normalized()
    if n.dot(view) < 0.15:
        continue
    vs = list(tri.vertices)
    q = img_xy[vs]
    x0, y0 = np.floor(q.min(0)).astype(int)
    x1, y1 = np.ceil(q.max(0)).astype(int)
    if x1 < 0 or y1 < 0 or x0 >= SIZE or y0 >= SIZE or not changed[max(y0, 0):y1 + 1, max(x0, 0):x1 + 1].any():
        continue
    # Hidden behind something else (e.g. bangs over the brows)? Ask the ray from the camera.
    centre = Vector(co[vs].mean(0))
    hit, loc, _, index, obj, _ = scene.ray_cast(dg, centre + view * 500, -view)
    if not hit or (loc - centre).length > 0.6:
        continue
    t = uv[list(tri.loops)] * [TW, TH]
    u0, v0 = np.floor(t.min(0)).astype(int)
    u1, v1 = np.ceil(t.max(0)).astype(int)
    gu, gv = np.meshgrid(np.arange(u0, u1 + 1) + 0.5, np.arange(v0, v1 + 1) + 0.5)
    p = np.c_[gu.ravel(), gv.ravel()]
    a, b, c = t
    m = np.array([[b[0] - a[0], c[0] - a[0]], [b[1] - a[1], c[1] - a[1]]])
    if abs(np.linalg.det(m)) < 1e-9:
        continue
    l12 = np.linalg.solve(m, (p - a).T).T
    l0 = 1 - l12.sum(1)
    inside = (l0 >= -0.01) & (l12[:, 0] >= -0.01) & (l12[:, 1] >= -0.01)
    if not inside.any():
        continue
    bary = np.c_[l0, l12][inside]
    ixy = bary @ q                       # image position of each texel
    # UVs run outside 0–1 on this mesh (the texture repeats): wrap the texels back in.
    texel = np.floor(p[inside]).astype(int) % [TW, TH]
    px = np.clip(ixy[:, 0].astype(int), 0, SIZE - 1)
    py = np.clip(ixy[:, 1].astype(int), 0, SIZE - 1)
    keep = changed[py, px]
    if not keep.any():
        continue
    texel, px, py = texel[keep], px[keep], py[keep]
    for e in EMOTIONS:
        out[e][texel[:, 1], texel[:, 0]] = faces[e][py, px]
    written[texel[:, 1], texel[:, 0]] = True
ev.to_mesh_clear()

# Full textures with each face baked in (scratch files, not shipped): the packer cuts the
# changed tiles out of these into the atlas the game uses.
baked = repo / "assets/portraits/baked"
baked.mkdir(parents=True, exist_ok=True)
original = np.array(tex.pixels[:], dtype=np.float32).reshape(TH, TW, 4)  # bottom row first
for e in EMOTIONS:
    full = original.copy()
    full[written] = out[e][written]
    full[..., 3] = 1
    img = bpy.data.images.new(f"face_{e}", TW, TH, alpha=False)
    img.pixels.foreach_set(full.ravel())
    img.filepath_raw = str(baked / f"{e}.png")
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
mask = bpy.data.images.new("face_mask", TW, TH, alpha=False)
m = np.zeros((TH, TW, 4), np.float32)
m[written] = 1
m[..., 3] = 1
mask.pixels.foreach_set(m.ravel())
mask.filepath_raw = str(baked / "mask.png")
mask.file_format = "PNG"
mask.save()
bpy.data.images.remove(mask)
print("texels", int(written.sum()), "baked into", baked)
