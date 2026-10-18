"""Smooth out creases and dents in a striped tee's body, keeping it clear of the skin and the shorts.

Rest pose, object space. Clears leftover custom normals, welds stray duplicate vertices, then
alternates Laplacian smoothing of the torso with a push back out to CLEAR off the body (and the
shorts near the waist). Edges (neck, cuffs, hem) stay put. Stripe UVs are rebuilt afterwards.
Set SMOOTH_TEE / SMOOTH_BODY / SMOOTH_SHORTS / SMOOTH_STRIPE_SHIFT before exec() for another tee.
"""
import bpy, bmesh, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

_g = globals()
TEE = bpy.data.objects[_g.get('SMOOTH_TEE', 'Cloth striped_tee')]
BODY = bpy.data.objects[_g.get('SMOOTH_BODY', 'char_female_v3')]
SHORTS = bpy.data.objects[_g.get('SMOOTH_SHORTS', 'Cloth denim_shorts')]
STRIPE_SHIFT = _g.get('SMOOTH_STRIPE_SHIFT', 0.0)
SMOOTH_FROM = _g.get('SMOOTH_FROM', 60.5)   # the rebuilt waist rings below this stay as they are
CLEAR = _g.get("SMOOTH_CLEAR", 1.0)
ROUNDS = 12
AXIS = Vector((0, -4, 0))

body_tree = BVHTree.FromPolygons([v.co for v in BODY.data.vertices], [p.vertices[:] for p in BODY.data.polygons])
sme = SHORTS.data
shorts_tree = BVHTree.FromPolygons([v.co for v in sme.vertices], [p.vertices[:] for p in sme.polygons])
SHORTS_TOP = max(v.co.z for v in sme.vertices)

me = TEE.data
if me.has_custom_normals:
    me.free_normals_split() if hasattr(me, 'free_normals_split') else None
    bpy.context.view_layer.objects.active = TEE
    with bpy.context.temp_override(object=TEE, active_object=TEE, selected_objects=[TEE]):
        bpy.ops.mesh.customdata_custom_splitnormals_clear()

bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if SMOOTH_FROM - 1 < v.co.z < 98 and abs(v.co.x) < 23], dist=0.02)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bm.verts.ensure_lookup_table()

neck = lambda p: p.z > 93 and math.hypot(p.x, p.y + 1.3) < 10
movable = [v for v in bm.verts
           if not v.is_boundary and not any(e.other_vert(v).is_boundary for e in v.link_edges)
           and SMOOTH_FROM < v.co.z < 98 and abs(v.co.x) < 23 and not neck(v.co)]
print('smoothing', len(movable), 'of', len(bm.verts))


def clear(v):
    """Push v out so it sits at least CLEAR off the skin (and the shorts at the waist)."""
    p = v.co
    q, n, _, _ = body_tree.find_nearest(p)
    if q is None: return
    out = (p - q).dot(n)
    if out < CLEAR: v.co = p + n * (CLEAR - out)
    if p.z < SHORTS_TOP + 1:
        q, n, _, d = shorts_tree.find_nearest(v.co)
        if q is not None and d < 6:
            out = (v.co - q).dot(n)
            if out < CLEAR: v.co = v.co + n * (CLEAR - out)


# In the armpits the nearest skin flips between arm and torso, so pushing off it folds the cloth;
# the skin there is hidden under the tee anyway.
armpit = lambda p: abs(p.x) > 13 and p.z > 74
# Below CLEAR_FROM the rings were already sized from the skin (median-filtered against bumps).
CLEAR_FROM = _g.get("CLEAR_FROM", 70.0)


def relax(factor):
    P = {v: v.co.copy() for v in movable}
    for v in movable:
        nb = [e.other_vert(v) for e in v.link_edges]
        avg = sum((P.get(n, n.co) for n in nb), Vector()) / len(nb)
        v.co = P[v] + (avg - P[v]) * factor


for _ in range(ROUNDS):   # Taubin smoothing: removes creases without shrinking the shirt
    relax(0.6)
    relax(-0.63)
    for v in movable:
        if not armpit(v.co) and v.co.z > CLEAR_FROM: clear(v)
for f in bm.faces: f.smooth = True
bm.normal_update()
bm.to_mesh(me); me.update(); bm.free()

# stripes: cylindrical UVs from the idle pose (object space)
sc = bpy.context.scene; fr = sc.frame_current; sc.frame_set(1)
dg = bpy.context.evaluated_depsgraph_get()
ev = TEE.evaluated_get(dg); em = ev.to_mesh(); W = [v.co.copy() for v in em.vertices]; ev.to_mesh_clear()
uvl = me.uv_layers.active
span = 2 * math.pi * 20 / 11
for p in me.polygons:
    us = [(math.atan2(W[me.loops[li].vertex_index].x, -W[me.loops[li].vertex_index].y) * 20 / 11,
           (W[me.loops[li].vertex_index].z - STRIPE_SHIFT) / 11) for li in p.loop_indices]
    if max(u for u, _ in us) - min(u for u, _ in us) > span / 2:
        us = [(u + span if u < 0 else u, v) for u, v in us]
    for li, uv in zip(p.loop_indices, us): uvl.data[li].uv = uv
sc.frame_set(fr)
print('smoothed', TEE.name, 'custom normals:', me.has_custom_normals)
