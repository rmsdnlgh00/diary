"""Move a female garment's neck area with the female body's neck fix, and re-weight it from the body.

The body's neck was reshaped (backup mesh 'char_female_v3 before neck fix'); garments made on the old
body follow the same displacement (averaged from the nearest old body vertices).
Set FOLLOW_OBJECTS (list of object names) before exec(); default: the striped tee.
"""
import bpy, math
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

bo = bpy.data.objects['char_female_v3']; me = bo.data
orig = bpy.data.meshes['char_female_v3 before neck fix']; n0 = len(orig.vertices)
kd = kdtree.KDTree(n0)
for v in orig.vertices: kd.insert(v.co, v.index)
kd.balance()
disp = [me.vertices[i].co - orig.vertices[i].co for i in range(n0)]
BT = BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices[:] for p in me.polygons])
bnames = [g.name for g in bo.vertex_groups]
AX = Vector((0, -1.3, 0))
ramp = lambda x, a, b: max(0.0, min(1.0, (x - a) / (b - a)))


def wzone(co):
    r = math.hypot(co.x - AX.x, co.y - AX.y)
    return ramp(co.z, 95.0, 97.5) * (1 - ramp(co.z, 105.0, 108.0)) * (1 - ramp(r, 16, 24))


for name in globals().get('FOLLOW_OBJECTS', ['Cloth striped_tee']):
    o = bpy.data.objects[name]; cme = o.data
    names = [g.name for g in o.vertex_groups]; groups = {g.name: g for g in o.vertex_groups}
    moved = 0
    for v in cme.vertices:
        p = v.co
        w = wzone(p)
        if w <= 0: continue
        tot = 0; d = Vector()
        for co, i, dist in kd.find_n(p, 8):
            c = 1 / max(dist, 0.05); d += disp[i] * c; tot += c
        d /= tot
        if d.length < 0.01: continue
        v.co = p + d; moved += 1
        q, _, fi, _ = BT.find_nearest(v.co); poly = me.polygons[fi]
        cs = [(i, 1 / max((me.vertices[i].co - q).length, 1e-3)) for i in poly.vertices]; ct = sum(c for _, c in cs)
        bw = {}
        for i, c in cs:
            for g in me.vertices[i].groups:
                nm = bnames[g.group]
                if nm.startswith('mixamorig') and g.weight > 0: bw[nm] = bw.get(nm, 0) + g.weight * c / ct
        old = {names[g.group]: g.weight for g in v.groups if names[g.group].startswith('mixamorig')}
        for nm in set(bw) | set(old):
            ww = old.get(nm, 0) * (1 - w) + bw.get(nm, 0) * w
            if nm not in groups: groups[nm] = o.vertex_groups.new(name=nm); names.append(nm)
            if ww > 0.002: groups[nm].add([v.index], ww, 'REPLACE')
            elif nm in old: groups[nm].remove([v.index])
    cme.update()
    print('followed the neck:', name, moved)
