"""Female working file: make the female top from the tidied comparison-male top (both rest pose, object
space; the female body was built on the male one with the same rig). Set ITEM before exec().
  1. copy the male mesh; keep its distance from the male body, measured on the female body (min MIN_GAP)
  2. keep the hem/waist band out of the shorts and the hips (SHORTS_GAP)
  3. skin weights from the female body (waist band from the shorts), sleeve ends from the game body
The female object keeps its name, materials and parenting; its old mesh stays as '<mesh> before male transfer'."""
import bpy, bmesh, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

_g = globals()
ITEM = _g['ITEM']
MIN_GAP = _g.get('MIN_GAP', 1.4)
SHORTS_GAP = _g.get('SHORTS_GAP', 1.4)
F = bpy.data.objects[f'Cloth {ITEM}']
M = bpy.data.objects[f'Comparison male | Cloth {ITEM}']
BO = bpy.data.objects['char_female_v3']; SO = bpy.data.objects['Cloth denim_shorts']
MBO = bpy.data.objects['Comparison male body | striped tee']
import os
REPO = os.environ.get('DIARY_REPO_ROOT', '/Users/geun-wiho/github/diary')
GAME = REPO + '/diary-character/female-game-20261017/female_character_game.blend'
rig = bpy.data.objects['Armature Female']; rig.data.pose_position = 'REST'
bpy.context.view_layer.update()

if F.data.name + ' before male transfer' not in bpy.data.meshes:
    b = F.data.copy(); b.name = F.data.name + ' before male transfer'; b.use_fake_user = True
me = M.data.copy(); me.name = F.data.name + ' from male'
me.materials.clear()
for m in F.data.materials: me.materials.append(m)

tree = lambda mesh: BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])
V, MV, ST = tree(BO.data), tree(MBO.data), tree(SO.data)
SHORTS_TOP = max(v.co.z for v in SO.data.vertices)
AX = Vector((0, -4, 0))
ramp = lambda x, a, b: max(0.0, min(1.0, (x - a) / (b - a)))


def rad(T, z, d, spread=(0,)):
    best = None
    for dz in spread:
        o = Vector((AX.x, AX.y, z + dz)); h = T.ray_cast(o + d * 40, -d, 40)[0]
        if h is not None:
            r = (h - o).dot(d); best = r if best is None else max(best, r)
    return best


adj = [[] for _ in me.vertices]
for e in me.edges:
    a, b = e.vertices; adj[a].append(b); adj[b].append(a)

# 1. torso: same distance from the body as on the male
disp = [Vector() for _ in me.vertices]
for i, v in enumerate(me.vertices):
    p = v.co
    w = (1 - ramp(abs(p.x), 19, 23)) * (1 - ramp(p.z, 95, 99))
    if w <= 0: continue
    d = Vector((p.x - AX.x, p.y - AX.y, 0))
    if d.length < 1: continue
    d.normalize()
    rf, rm = rad(V, p.z, d), rad(MV, p.z, d)
    if rf is None or rm is None: continue
    r = (p - Vector((AX.x, AX.y, p.z))).dot(d)
    disp[i] = d * (rf + max(r - rm, MIN_GAP) - r) * w
for _ in range(6):
    disp = [(disp[i] * 2 + sum((disp[j] for j in adj[i]), Vector())) / (2 + len(adj[i])) for i in range(len(disp))]
for v, d in zip(me.vertices, disp): v.co += d

# 2. hem and hips: out of the shorts and the skin, all the way round
ST2, V2 = ST, V
for _ in range(3):
    disp = [Vector() for _ in me.vertices]
    for i, v in enumerate(me.vertices):
        p = v.co
        if p.z > 62 or abs(p.x) > 30: continue
        d = Vector((p.x - AX.x, p.y - AX.y, 0))
        if d.length < 1: continue
        d.normalize()
        r = (p - Vector((AX.x, AX.y, p.z))).dot(d)
        need = 0
        rs = rad(ST2, p.z, d, (-0.8, -0.4, 0, 0.4, 0.8)) if p.z < SHORTS_TOP + 2 else None
        if rs is not None: need = max(need, rs + SHORTS_GAP)
        rb = rad(V2, p.z, d)
        if rb is not None: need = max(need, rb + MIN_GAP)
        if need > r: disp[i] = d * (need - r)
    for _ in range(3):
        disp = [max([disp[i]] + [disp[j] * 0.85 for j in adj[i]], key=lambda x: x.length) for i in range(len(disp))]
    for _ in range(2):
        disp = [(disp[i] * 2 + sum((disp[j] for j in adj[i]), Vector())) / (2 + len(adj[i])) for i in range(len(disp))]
    for v, d in zip(me.vertices, disp): v.co += d
me.update()
F.data = me


# 3. weights
def iw(mesh, T, names, co):
    q, _, fi, _ = T.find_nearest(co); poly = mesh.polygons[fi]
    cs = [(i, 1 / max((mesh.vertices[i].co - q).length, 1e-3)) for i in poly.vertices]; tot = sum(c for _, c in cs); ws = {}
    for i, c in cs:
        for g in mesh.vertices[i].groups:
            nm = names[g.group]
            if nm.startswith('mixamorig') and g.weight > 0: ws[nm] = ws.get(nm, 0) + g.weight * c / tot
    return ws


with bpy.data.libraries.load(GAME, link=False) as (src, dst): dst.objects = ['char_female_game']
game = dst.objects[0]
GT = tree(game.data)
bn = [g.name for g in BO.vertex_groups]; sn = [g.name for g in SO.vertex_groups]; gn = [g.name for g in game.vertex_groups]
weights = []
for v in me.vertices:
    ws = iw(BO.data, V, bn, v.co)
    blend = min(1, max(0, (SHORTS_TOP + 6 - v.co.z) / 5))
    if blend > 0:
        sw = iw(SO.data, ST, sn, v.co); ws = {k: ws.get(k, 0) * (1 - blend) + sw.get(k, 0) * blend for k in set(ws) | set(sw)}
    b = ramp(abs(v.co.x), 26, 32)
    if b > 0:
        gw = iw(game.data, GT, gn, v.co); ws = {k: ws.get(k, 0) * (1 - b) + gw.get(k, 0) * b for k in set(ws) | set(gw)}
    weights.append(ws)
arm_strays = [m.object for m in game.modifiers if m.type == 'ARMATURE' and m.object]
gmesh = game.data
bpy.data.objects.remove(game); bpy.data.meshes.remove(gmesh)
for s in arm_strays:
    if s.name not in ('Armature Female', 'Armature.002') and s.users_collection == (): bpy.data.objects.remove(s)
bm = bmesh.new(); bm.from_mesh(me)
dl = bm.verts.layers.deform.active
if dl:
    for v in bm.verts: v[dl].clear()
bm.to_mesh(me); bm.free()
for g in list(F.vertex_groups): F.vertex_groups.remove(g)
groups = {}
for v, ws in zip(me.vertices, weights):
    for nm, w in ws.items():
        if w < 0.002: continue
        if nm not in groups: groups[nm] = F.vertex_groups.new(name=nm)
        groups[nm].add([v.index], w, 'REPLACE')
me.update()
rig.data.pose_position = 'POSE'
print(f'transferred {ITEM}: {len(me.vertices)} verts, {len(F.vertex_groups)} groups')
