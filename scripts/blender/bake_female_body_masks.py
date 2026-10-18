"""Open the female clothes working file in the background, then run this: bakes one body mask per top
and bottom for the female game body (char_female_game, loaded from the game blend).

Each mask marks the body texels that item covers, so the game can skip drawing them while it is
worn: public/assets/clothes/<group>/<kind>/<id>/female-mask.png, next to female.glb. The female
body has two materials with their own textures and UV spaces: red marks material 0 (body, face and
hair texture), green material 1 (head texture), in the game GLB's order.

A body vertex is covered when the garment lies just outside it or surrounds it (rest pose, where the
clothes were fitted); the covered set is eroded so the edge of an opening never loses skin. Skin that
pokes out through the garment in the idle and walk poses is added. Coverage is painted into the mask
through the UVs, blended across each triangle (texels nearer covered corners are hidden).

    Blender -b diary-character/diary_character_clothes_female.blend \
        --python scripts/blender/bake_female_body_masks.py
"""
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils import kdtree
from mathutils.bvhtree import BVHTree

REPO = Path(__file__).resolve().parents[2] if "__file__" in globals() else Path("/Users/geun-wiho/github/diary")
CLOTHES = REPO / "public/assets/clothes"
SIZE = 1024
REACH = 9.0
INSIDE = 6.0
ERODE = 1
AXES = [Vector(d) for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
ITEMS = ["striped_tee", "hoodie_gray", "raincoat_yellow", "pajama", "winter_coat",
         "basic_pants", "denim_shorts", "jogger_pants", "pajama_pants", "check_shorts"]

# Work on the light body the game draws (its UVs and how it bends), brought in from the game blend
# and driven by this file's rig, next to the clothes.
GAME_BLEND = REPO / "diary-character/female-game-20261017/female_character_game.blend"
with bpy.data.libraries.load(str(GAME_BLEND), link=False) as (src, dst):
    dst.objects = ["char_female_game"]
body = dst.objects[0]
rig_obj = bpy.data.objects["Armature Female"]
bpy.context.scene.collection.objects.link(body)
for m in body.modifiers:
    if m.type == "ARMATURE":
        stray = m.object
        m.object = rig_obj
        if stray and stray is not rig_obj: bpy.data.objects.remove(stray)
body.parent = rig_obj   # same relation to the rig as the clothes (their parent inverse is identity)
body.matrix_parent_inverse.identity()
me = body.data
me.calc_loop_triangles()
co = [v.co.copy() for v in me.vertices]
normals = [v.normal.copy() for v in me.vertices]
FILL_RADIUS = 2.0
skin_kd = kdtree.KDTree(len(co))
for i, p in enumerate(co): skin_kd.insert(p, i)
skin_kd.balance()
adjacent = [[] for _ in me.vertices]
for e in me.edges:
    a, b = e.vertices; adjacent[a].append(b); adjacent[b].append(a)


def garment_tree(item):
    """The item's main pieces (the cuff counts with the shorts; buttons and hoods don't matter)."""
    verts, polys = [], []
    for o in bpy.data.objects:
        if o.type != "MESH" or o.parent is None or o.parent.name != "Armature Female": continue
        if o.name != f"Cloth {item}" and o.name != f"Cloth {item} cuff": continue
        base = len(verts)
        verts += [v.co.copy() for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(verts, polys)


def covered_by(item):
    """A vertex is covered when the garment lies just outside it: a ray along its normal meets the
    garment within REACH, or the garment's nearest surface is within INSIDE and faces away from it."""
    tree = garment_tree(item)
    hit = np.zeros(len(co), bool)
    for i, (p, n) in enumerate(zip(co, normals)):
        if tree.ray_cast(p + n * 0.05, n, REACH)[0] is not None:
            hit[i] = True
            continue
        # surrounded: the torso inside a shirt, an upper arm inside its sleeve, a thigh inside its leg
        if sum(tree.ray_cast(p, d, 40)[0] is not None for d in AXES) >= 4:
            hit[i] = True
            continue
        q, gn, _, d = tree.find_nearest(p, INSIDE)
        if q is not None and (p - q).dot(gn) < 0: hit[i] = True
    return hit


# Posed: with the arms down and the legs walking, skin around the armpits, shoulder blades and hips
# pushes out through the cloth. Such skin is hidden too: it is within POKE of the garment, on its
# outside, and away from the garment's openings (so skin just past a hem or cuff keeps showing).
POKE = 3.0
EDGE = 3.0
EDGE_RINGS = 3
POSES = [("mixamo.com.002", f) for f in range(1, 300, 20)] + [("mixamo.com", f) for f in range(1, 33, 4)]
rig = bpy.data.objects["Armature Female"]
garments = {o.name: o for o in bpy.data.objects
            if o.type == "MESH" and o.parent is rig and o.name.startswith("Cloth ")}


def evaluated(obj, depsgraph):
    ev = obj.evaluated_get(depsgraph)
    m = ev.to_mesh()
    pts = [v.co.copy() for v in m.vertices]
    ev.to_mesh_clear()
    return pts


def poking(items):
    """Per item, the vertices that poke out of it in some pose."""
    masks_off = [m for m in body.modifiers if m.type == "MASK"]
    for m in masks_off: m.show_viewport = False
    result = {item: np.zeros(len(co), bool) for item in items}
    ad = rig.animation_data
    saved = (ad.action, ad.action_slot, rig.data.pose_position, bpy.context.scene.frame_current)
    rig.data.pose_position = "POSE"
    try:
        for action_name, frame in POSES:
            action = bpy.data.actions[action_name]
            ad.action = action
            ad.action_slot = action.slots[0]
            bpy.context.scene.frame_set(frame)
            dg = bpy.context.evaluated_depsgraph_get()
            pts = evaluated(body, dg)
            for item in items:
                verts, polys, edge_pts = [], [], []
                for name in (f"Cloth {item}", f"Cloth {item} cuff"):
                    o = garments.get(name)
                    if not o: continue
                    gp = evaluated(o, dg)
                    base = len(verts)
                    verts += gp
                    polys += [[base + i for i in p.vertices] for p in o.data.polygons]
                    counts = {}
                    for p in o.data.polygons:
                        for k in range(len(p.vertices)):
                            a, b = sorted((p.vertices[k], p.vertices[(k + 1) % len(p.vertices)]))
                            counts[(a, b)] = counts.get((a, b), 0) + 1
                    # the opening: the open edge plus the folded rim round it (a few rings in), so skin
                    # just past a cuff or hem counts as outside, not as poking through
                    ring = {v for (a, b), c in counts.items() if c == 1 for v in (a, b)}
                    links = {}
                    for (a, b) in counts:
                        links.setdefault(a, []).append(b); links.setdefault(b, []).append(a)
                    for _ in range(EDGE_RINGS):
                        ring |= {n for v in list(ring) for n in links.get(v, ())}
                    edge_pts += [gp[v] for v in ring]
                tree = BVHTree.FromPolygons(verts, polys)
                edges = kdtree.KDTree(len(edge_pts))
                for k, p in enumerate(edge_pts): edges.insert(p, k)
                edges.balance()
                hit = result[item]
                near = rest_near[item]
                for i, p in enumerate(pts):
                    if hit[i] or not near[i]: continue
                    q, gn, _, d = tree.find_nearest(p, POKE)
                    if q is None or (p - q).dot(gn) <= 0: continue
                    if edge_pts and edges.find(p)[2] < EDGE: continue
                    hit[i] = True
    finally:
        ad.action, ad.action_slot, rig.data.pose_position, frame = saved
        bpy.context.scene.frame_set(frame)
        for m in masks_off: m.show_viewport = True
    return result


all_items = ITEMS
# only skin that already lies close to the garment at rest (not an arm swinging past the shirt)
REST_NEAR = 4.0
rest_near = {}
for item in all_items:
    tree = garment_tree(item)
    rest_near[item] = np.array([tree.find_nearest(p, REST_NEAR)[0] is not None for p in co])
pokes = poking(all_items)
print("poking:", {item: int(p.sum()) for item, p in pokes.items()})

uv = me.uv_layers.active.data
def past_openings(item):
    """Skin beyond the garment's reach at rest: past its sleeve ends (arms) or below its hem. Posed, a
    hanging forearm brushes a coat's side; it must never count as poking through."""
    tree_pts = []
    for name in (f"Cloth {item}", f"Cloth {item} cuff"):
        o = garments.get(name)
        if o: tree_pts += [v.co for v in o.data.vertices]
    sleeve = max((abs(p.x) for p in tree_pts if p.z > 75), default=0)
    hem = min(p.z for p in tree_pts)
    top = max(p.z for p in tree_pts)
    out = np.zeros(len(co), bool)
    for i, p in enumerate(co):
        if sleeve and p.z > 70 and abs(p.x) > 22 and abs(p.x) > sleeve - 0.5: out[i] = True
        if p.z < hem + 0.5 or p.z > top - 0.5: out[i] = True   # below the hem, above the collar
    return out


for item in ITEMS:
    beyond = past_openings(item)
    pokes[item] &= ~beyond
    covered = covered_by(item)
    for _ in range(ERODE):   # keep a margin of skin at every opening
        covered = covered & np.array([all(covered[j] for j in adjacent[i]) for i in range(len(co))])
    covered |= pokes[item]
    # close small holes (the light body has thin rings of tiny triangles): skin near the garment
    # counts as covered when most of the skin around it is
    for _ in range(2):
        filled = covered.copy()
        for i in np.where(~covered & rest_near[item] & ~beyond)[0]:
            around = [j for _, j, _ in skin_kd.find_range(co[i], FILL_RADIUS)]
            if len(around) > 2 and covered[around].mean() >= 0.6: filled[i] = True
        covered = filled
    covered &= ~beyond   # some texels are shared (UV islands overlap), so this must hold to the end
    mask = np.zeros((SIZE, SIZE, 3), np.uint8)
    painted = 0
    for t in me.loop_triangles:
        cov = np.array([covered[v] for v in t.vertices], np.float32)
        if not cov.any(): continue
        P = np.array([[uv[l].uv.x * SIZE, (1 - uv[l].uv.y) * SIZE] for l in t.loops])  # image rows top-down
        x0, y0 = np.floor(P.min(0)).astype(int); x1, y1 = np.ceil(P.max(0)).astype(int)
        m = np.array([[P[1, 0] - P[0, 0], P[2, 0] - P[0, 0]], [P[1, 1] - P[0, 1], P[2, 1] - P[0, 1]]])
        if abs(np.linalg.det(m)) < 1e-9: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        Q = np.c_[gx.ravel(), gy.ravel()]
        l12 = np.linalg.solve(m, (Q - P[0]).T).T
        inside = (1 - l12.sum(1) >= -1e-3) & (l12[:, 0] >= -1e-3) & (l12[:, 1] >= -1e-3)
        # low-poly triangles can run from under the cloth to past a cuff: blend the corners' coverage
        # per texel and hide the covered part only
        weight = np.c_[1 - l12.sum(1), l12] @ cov
        px = np.floor(Q[inside & (weight >= 0.5)]).astype(int)
        # triangles smaller than a texel hold no texel centre: mark the texels under their covered
        # corners and, when mostly covered, under their middle
        extra = [P[k] for k in range(3) if cov[k]] + ([P.mean(0)] if cov.sum() >= 2 else [])
        px = np.vstack([px.reshape(-1, 2), np.floor(np.array(extra)).astype(int)]) % SIZE
        mask[px[:, 1], px[:, 0], me.polygons[t.polygon_index].material_index] = 255   # red: material 0, green: 1
        painted += 1
    folders = sorted(CLOTHES.glob(f"*/*/{item}"))
    if not folders:
        print("no folder for", item); continue
    out = folders[0] / "female-mask.png"
    img = bpy.data.images.new(f"mask {item}", SIZE, SIZE, alpha=False)
    rgba = np.concatenate([mask[::-1].astype(np.float32) / 255, np.ones((SIZE, SIZE, 1), np.float32)], axis=2)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(out)
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    print(f"{item}: {int(covered.sum())} vertices, {painted} triangles → {out.relative_to(REPO)}")
