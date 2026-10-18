"""Open female_character_game.blend in the background, then run this: carries the neck fix made on the
clothes working file's body onto the light game body (char_female_game), and saves the game blend.

The clothes working file (diary-character/diary_character_clothes_female.blend) keeps the body as it
was before the fix ('char_female_v3 before neck fix', same coordinates as the game file's hidden
master) and after it (char_female_v3). The light body was decimated from the master, so each of its
vertices moves by the displacement of the nearest master vertices. Skin weights around the neck are
re-read from the fixed body, and the two colour textures take the fixed body's (neck skin repainted).
Hair is left where it is. Run it once: it adds the difference again on every run.

    Blender -b diary-character/female-game-20261017/female_character_game.blend \
        --python scripts/blender/sync_female_game_neck.py
"""
import math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

REPO = Path(__file__).resolve().parents[2] if "__file__" in globals() else Path("/Users/geun-wiho/github/diary")
CLOTHES = str(REPO / "diary-character/diary_character_clothes_female.blend")
FIXED_IMAGES = {"texture_0.001": "texture_0.002", "female_v3_diffuse.001": "female_v3_diffuse.004"}

with bpy.data.libraries.load(CLOTHES, link=False) as (src, dst):
    dst.meshes = ["char_female_v3 before neck fix"]
    dst.objects = ["char_female_v3"]
    dst.images = list(FIXED_IMAGES.values())
before = bpy.data.meshes["char_female_v3 before neck fix"]
fixed_obj = next(o for o in dst.objects)
fixed = fixed_obj.data
game = bpy.data.objects["char_female_game"]
gme = game.data
AX = Vector((0, -1.3, 0))


def ramp(x, a, b): return max(0.0, min(1.0, (x - a) / (b - a)))


def zone(co):   # the neck and nape, where the fix moved things
    r = math.hypot(co.x - AX.x, co.y - AX.y)
    return ramp(co.z, 94.0, 96.5) * (1 - ramp(co.z, 108.0, 111.0)) * (1 - ramp(r, 18, 26))


def hair_flags(mesh, images):
    """Vertices only on the hair/face material that are painted hair-coloured."""
    mats = [set() for _ in mesh.vertices]
    for p in mesh.polygons:
        for v in p.vertices: mats[v].add(p.material_index)
    tex = []
    for m in mesh.materials:
        im = images.get(m.name) or next(n.image for n in m.node_tree.nodes if n.type == "TEX_IMAGE")
        w, h = im.size
        tex.append((np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4), w, h))
    hair = np.zeros(len(mesh.vertices), bool)
    uv = mesh.uv_layers.active.data
    for p in mesh.polygons:
        px, w, h = tex[p.material_index]
        for li in p.loop_indices:
            u, v = uv[li].uv
            c = px[int((v % 1) * h) % h, int((u % 1) * w) % w]
            if c[1] < 0.7 and c[0] > 0.5: hair[mesh.loops[li].vertex_index] = True
    return np.array([hair[i] and mats[i] == {1} for i in range(len(mesh.vertices))])


n0 = len(before.vertices)
before_hair = hair_flags(before, {})
disp = [fixed.vertices[i].co - before.vertices[i].co for i in range(n0)]
kd_skin, kd_hair = kdtree.KDTree(n0), kdtree.KDTree(n0)
for v in before.vertices: (kd_hair if before_hair[v.index] else kd_skin).insert(v.co, v.index)
kd_skin.balance(); kd_hair.balance()
kd_all = kdtree.KDTree(n0)
for v in before.vertices: kd_all.insert(v.co, v.index)
kd_all.balance()

fixed_tree = BVHTree.FromPolygons([v.co for v in fixed.vertices], [p.vertices[:] for p in fixed.polygons])
fixed_names = [g.name for g in fixed_obj.vertex_groups]
groups = {g.name: g for g in game.vertex_groups}
names = [g.name for g in game.vertex_groups]
moved = reweighted = 0
for v in gme.vertices:
    w = zone(v.co)
    if w <= 0: continue
    _, nearest, _ = kd_all.find(v.co)
    if before_hair[nearest]: continue            # hair stays as it is
    d = Vector(); tot = 0
    for co, i, dist in kd_skin.find_n(v.co, 8):
        c = 1 / max(dist, 0.05); d += disp[i] * c; tot += c
    d /= tot
    if d.length > 0.01:
        v.co += d; moved += 1
    # skin weights from the fixed body, blended in over the zone
    q, _, fi, _ = fixed_tree.find_nearest(v.co)
    poly = fixed.polygons[fi]
    cs = [(i, 1 / max((fixed.vertices[i].co - q).length, 1e-3)) for i in poly.vertices]; ct = sum(c for _, c in cs)
    fw = {}
    for i, c in cs:
        for g in fixed.vertices[i].groups:
            nm = fixed_names[g.group]
            if nm.startswith("mixamorig") and g.weight > 0: fw[nm] = fw.get(nm, 0) + g.weight * c / ct
    old = {names[g.group]: g.weight for g in v.groups if names[g.group].startswith("mixamorig")}
    for nm in set(fw) | set(old):
        ww = old.get(nm, 0) * (1 - w) + fw.get(nm, 0) * w
        if nm not in groups: groups[nm] = game.vertex_groups.new(name=nm); names.append(nm)
        if ww > 0.002: groups[nm].add([v.index], ww, "REPLACE")
        elif nm in old: groups[nm].remove([v.index])
    reweighted += 1
gme.update()

for game_name, fixed_name in FIXED_IMAGES.items():
    target, source = bpy.data.images[game_name], bpy.data.images[fixed_name]
    assert tuple(target.size) == tuple(source.size)
    target.pixels.foreach_set(np.array(source.pixels[:], dtype=np.float32))
    target.update(); target.pack()

bpy.data.objects.remove(fixed_obj)
for name in FIXED_IMAGES.values(): bpy.data.images.remove(bpy.data.images[name])
bpy.data.meshes.remove(before)
bpy.data.meshes.remove(fixed)
bpy.ops.wm.save_mainfile()
print(f"neck synced: {moved} verts moved, {reweighted} re-weighted; textures replaced; saved {bpy.data.filepath}")
