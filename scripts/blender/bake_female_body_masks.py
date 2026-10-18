"""Open the female clothes working file in the background, then run this: bakes the female body masks
for the game body (char_female_game, loaded from the game blend).

Like the male body-mask.png, each mask marks the body texture under clothes: red = covered by every
top, green = covered by every bottom, blue = covered by every long bottom. The female body has two
materials, each with its own texture and UV space, so there is one mask per material:
    public/assets/characters/female/body-mask-<material index>.png
(material 0 = hair and face texture, 1 = body texture, in the game GLB's order).

A body vertex is covered by a garment when a ray along its normal meets the garment within REACH
(rest pose, where the clothes were fitted). Covered sets are intersected over the items of a group,
eroded so the edge of an opening never loses skin, and painted into the mask through the UVs.

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
OUT = REPO / "public/assets/characters/female"
SIZE = 1024
REACH = 9.0
INSIDE = 6.0
ERODE = 1
AXES = [Vector(d) for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
GROUPS = {   # channel → items whose shared coverage it marks
    0: ["striped_tee", "hoodie_gray", "raincoat_yellow", "pajama", "winter_coat"],
    1: ["basic_pants", "denim_shorts", "jogger_pants", "pajama_pants", "check_shorts"],
    2: ["basic_pants", "jogger_pants", "pajama_pants"],
}

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
body.parent = rig_obj
body.matrix_parent_inverse = rig_obj.matrix_world.inverted()
me = body.data
me.calc_loop_triangles()
co = [v.co.copy() for v in me.vertices]
normals = [v.normal.copy() for v in me.vertices]
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
POSES = [("mixamo.com.002", f) for f in (1, 75, 150, 225)] + [("mixamo.com", f) for f in (1, 9, 17, 25)]
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
                    edge_pts += [gp[v] for (a, b), c in counts.items() if c == 1 for v in (a, b)]
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


all_items = sorted({item for items in GROUPS.values() for item in items})
# only skin that already lies close to the garment at rest (not an arm swinging past the shirt)
REST_NEAR = 4.0
rest_near = {}
for item in all_items:
    tree = garment_tree(item)
    rest_near[item] = np.array([tree.find_nearest(p, REST_NEAR)[0] is not None for p in co])
pokes = poking(all_items)
print("poking:", {item: int(p.sum()) for item, p in pokes.items()})

cache = {}
masks = [np.zeros((SIZE, SIZE, 3), np.uint8) for _ in me.materials]
uv = me.uv_layers.active.data
for channel, items in GROUPS.items():
    covered = np.ones(len(co), bool)
    for item in items:
        if item not in cache: cache[item] = covered_by(item)
        covered &= cache[item]
    for _ in range(ERODE):   # keep a margin of skin at every opening
        covered = covered & np.array([all(covered[j] for j in adjacent[i]) for i in range(len(co))])
    # plus skin that pokes out of one of them and is under or poking out of every one
    poked = np.ones(len(co), bool)
    for item in items: poked &= cache[item] | pokes[item]
    covered |= poked & np.logical_or.reduce([pokes[item] for item in items])
    painted = 0
    for t in me.loop_triangles:
        if not all(covered[v] for v in t.vertices): continue
        P = np.array([[uv[l].uv.x * SIZE, (1 - uv[l].uv.y) * SIZE] for l in t.loops])  # image rows top-down
        x0, y0 = np.floor(P.min(0)).astype(int); x1, y1 = np.ceil(P.max(0)).astype(int)
        m = np.array([[P[1, 0] - P[0, 0], P[2, 0] - P[0, 0]], [P[1, 1] - P[0, 1], P[2, 1] - P[0, 1]]])
        if abs(np.linalg.det(m)) < 1e-9: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        Q = np.c_[gx.ravel(), gy.ravel()]
        l12 = np.linalg.solve(m, (Q - P[0]).T).T
        inside = (1 - l12.sum(1) >= -1e-3) & (l12[:, 0] >= -1e-3) & (l12[:, 1] >= -1e-3)
        px = np.floor(Q[inside]).astype(int) % SIZE
        masks[me.polygons[t.polygon_index].material_index][px[:, 1], px[:, 0], channel] = 255
        painted += 1
    print(f"channel {'RGB'[channel]}: {int(covered.sum())} vertices, {painted} triangles")

OUT.mkdir(parents=True, exist_ok=True)
for index, mask in enumerate(masks):
    img = bpy.data.images.new(f"female mask {index}", SIZE, SIZE, alpha=False)
    rgba = np.concatenate([mask[::-1].astype(np.float32) / 255, np.ones((SIZE, SIZE, 1), np.float32)], axis=2)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(OUT / f"body-mask-{index}.png")
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    print("saved", OUT / f"body-mask-{index}.png", "material", me.materials[index].name)
