"""Cut a striped tee's neckline along a reference neckline, with a folded rim and a pink trim.

Defaults: the female tee, cut along the male tee's neckline (run after the female neck fix).
Set FIT_TEE / FIT_REF / FIT_STRIPE_SHIFT / FIT_RAISE / FIT_WEIGHTS before exec() to fit another tee,
e.g. the male tee against its own backup to just clean its collar. Everything is in object space.
"""
import bpy, bmesh, math
from mathutils import Vector

_g = globals()
TEE = bpy.data.objects[_g.get('FIT_TEE', 'Cloth striped_tee')]
MALE_TEE = bpy.data.objects['Comparison male | Cloth striped_tee.001']
REF_MESH = bpy.data.meshes[_g['FIT_REF']] if 'FIT_REF' in _g else MALE_TEE.data
AXIS = Vector((0, -1.3, 0))
STRIPE_SHIFT = _g.get('FIT_STRIPE_SHIFT', 2.75)
NECK_RAISE = _g.get('FIT_RAISE', 1.0)   # the smoothed top edge sits about this much under the male collar
COPY_WEIGHTS = _g.get('FIT_WEIGHTS', True)


def angle(p):
    return math.atan2(p.x - AXIS.x, -(p.y - AXIS.y))


# reference neckline: height and radius by angle around the neck
mb = bmesh.new(); mb.from_mesh(REF_MESH)
samples = []
for v in mb.verts:
    if v.is_boundary and v.co.z > 95 and abs(v.co.x) < 12:
        p = v.co
        samples.append((angle(p), p.z, math.hypot(p.x - AXIS.x, p.y - AXIS.y)))
mb.free()
samples.sort()
# The male tee's boundary includes its folded inner rim: keep only the top edge, per angle bin.
BINS = 48
top = [None] * BINS
for b, z, r in samples:
    k = int((b + math.pi) / (2 * math.pi) * BINS) % BINS
    if top[k] is None or z > top[k][0]: top[k] = (z, r)
for k in range(BINS):   # fill empty bins from neighbours
    if top[k] is None:
        top[k] = next(top[(k + j) % BINS] for j in range(1, BINS) if top[(k + j) % BINS] is not None)
for _ in range(2):
    top = [tuple((top[k - 1][i] + 2 * top[k][i] + top[(k + 1) % BINS][i]) / 4 for i in range(2)) for k in range(BINS)]


def neckline(a):
    """(height, radius) of the male neckline's top edge at angle a."""
    f = (a + math.pi) / (2 * math.pi) * BINS - 0.5
    k = math.floor(f); t = f - k
    z0, r0 = top[k % BINS]; z1, r1 = top[(k + 1) % BINS]
    return z0 + (z1 - z0) * t + NECK_RAISE, r0 + (r1 - r0) * t


me = TEE.data
bm = bmesh.new(); bm.from_mesh(me)
in_neck = lambda p: p.z > 94 and math.hypot(p.x - AXIS.x, p.y - AXIS.y) < 13 and abs(p.x) < 13
cut = [v for v in bm.verts if in_neck(v.co) and v.co.z > neckline(angle(v.co))[0] + 0.15]
bmesh.ops.delete(bm, geom=cut, context='VERTS')
for _ in range(3):
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    teeth = [f for f in bm.faces if sum(1 for e in f.edges if e.is_boundary) >= 2 and all(in_neck(v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=teeth, context='FACES')

# the rim: every open edge around the neck, including any left a little further out by the cut
in_rim = lambda p: p.z > 94 and math.hypot(p.x - AXIS.x, p.y - AXIS.y) < 16 and abs(p.x) < 16
rim = [v for v in bm.verts if v.is_boundary and in_rim(v.co)]
for v in rim:
    a = angle(v.co); z, r = neckline(a)
    d = Vector((math.sin(a), -math.cos(a), 0))
    v.co = Vector((AXIS.x, AXIS.y, z)) + d * r
# relax the ring just below the new edge so it meets it without folds
ring = {e.other_vert(v) for v in rim for e in v.link_edges} - set(rim)
for _ in range(3):
    for v in ring:
        nb = [e.other_vert(v) for e in v.link_edges]
        v.co = v.co * 0.5 + sum((n.co for n in nb), Vector()) / len(nb) * 0.5
# folded rim on the inside
edges = [e for e in bm.edges if e.is_boundary and all(v in set(rim) for v in e.verts)]
res = bmesh.ops.extrude_edge_only(bm, edges=edges)
for v in [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]:
    d = Vector((v.co.x - AXIS.x, v.co.y - AXIS.y, 0)).normalized()
    v.co += -d * 0.5 + Vector((0, 0, -1.0))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
for f in bm.faces: f.smooth = True
bm.to_mesh(me); me.update(); bm.free()

# stripes: cylindrical UVs from the idle pose
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

# a pink trim along the neckline (and its folded rim), like the male tee's collar
TRIM = _g.get("FIT_TRIM", 1.4)
trim = 0
for p in me.polygons:
    cos = [me.vertices[i].co for i in p.vertices]
    if TRIM <= 0 or not all(in_neck(c) and c.z > neckline(angle(c))[0] - TRIM for c in cos): continue
    for li in p.loop_indices:
        u, v = uvl.data[li].uv
        uvl.data[li].uv = (u, math.floor(v) + 0.25)   # lower half of the repeat = pink
    trim += 1
me.update()
print('collar trim faces', trim)
print('neckline cut', len(cut), 'verts; rim', len(rim))

# the collar moves like the male tee's collar (same skin weights around the neck)
from mathutils.bvhtree import BVHTree
mme = MALE_TEE.data
male_co = [v.co.copy() for v in mme.vertices]
mtree = BVHTree.FromPolygons(male_co, [p.vertices[:] for p in mme.polygons])
mnames = [g.name for g in MALE_TEE.vertex_groups]
fnames = [g.name for g in TEE.vertex_groups]; fgroups = {g.name: g for g in TEE.vertex_groups}
ramp = lambda x, a, b: max(0.0, min(1.0, (x - a) / (b - a)))
for v in (me.vertices if COPY_WEIGHTS else []):
    p = v.co
    blend = ramp(p.z, 92, 95) * (1 - ramp(math.hypot(p.x - AXIS.x, p.y - AXIS.y), 13, 18))
    if blend <= 0: continue
    q, _, fi, _ = mtree.find_nearest(p); poly = mme.polygons[fi]
    cs = [(i, 1 / max((male_co[i] - q).length, 1e-3)) for i in poly.vertices]; tot = sum(c for _, c in cs)
    mw = {}
    for i, c in cs:
        for g in mme.vertices[i].groups:
            nm = mnames[g.group]
            if nm.startswith('mixamorig') and g.weight > 0: mw[nm] = mw.get(nm, 0) + g.weight * c / tot
    old = {fnames[g.group]: g.weight for g in v.groups}
    for nm in set(mw) | set(old):
        w = old.get(nm, 0) * (1 - blend) + mw.get(nm, 0) * blend
        if nm not in fgroups: fgroups[nm] = TEE.vertex_groups.new(name=nm); fnames.append(nm)
        if w > 0.002: fgroups[nm].add([v.index], w, 'REPLACE')
        elif nm in old: fgroups[nm].remove([v.index])
if COPY_WEIGHTS: print('collar weights from the male tee')
