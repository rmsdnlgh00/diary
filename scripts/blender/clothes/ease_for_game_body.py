"""Female working file, rest pose: ease the female top out so the light game body (and the full body)
stays CLEAR inside it. Torso: outward only along horizontal rays, spread smoothly; sleeves: ring by
ring from each ring's centre, capped, faded in from the shoulder. Set ITEM before exec()."""
import bpy, math, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
_g = globals()
F = bpy.data.objects[f"Cloth {_g['ITEM']}"]; me = F.data
CLEAR = _g.get('CLEAR', 1.4)
rig = bpy.data.objects['Armature Female']; rig.data.pose_position = 'REST'; bpy.context.view_layer.update()
if me.name + ' before game ease' not in bpy.data.meshes:
    b = me.copy(); b.name = me.name + ' before game ease'; b.use_fake_user = True
import os
REPO = os.environ.get('DIARY_REPO_ROOT', '/Users/geun-wiho/github/diary')
GAME = REPO + '/diary-character/female-game-20261017/female_character_game.blend'
with bpy.data.libraries.load(GAME, link=False) as (src, dst): dst.meshes = ['Female default body and rounded face.002']
gm = dst.meshes[0]
tree = lambda m: BVHTree.FromPolygons([v.co for v in m.vertices], [p.vertices[:] for p in m.polygons])
G, V = tree(gm), tree(bpy.data.objects['char_female_v3'].data)
AX = Vector((0, -4, 0))
ramp = lambda x, a, b: max(0.0, min(1.0, (x - a) / (b - a)))
adj = [[] for _ in me.vertices]
for e in me.edges:
    a, b = e.vertices; adj[a].append(b); adj[b].append(a)
disp = [Vector() for _ in me.vertices]
for i, v in enumerate(me.vertices):
    p = v.co; w = (1 - ramp(abs(p.x), 19, 23)) * (1 - ramp(p.z, 96, 99)) * ramp(math.hypot(p.x, p.y + 1.3), 8, 10)
    if w <= 0: continue
    d = Vector((p.x - AX.x, p.y - AX.y, 0))
    if d.length < 1: continue
    d.normalize(); o = Vector((AX.x, AX.y, p.z)); r = (p - o).dot(d); need = 0
    for T in (G, V):
        h = T.ray_cast(o + d * 40, -d, 40)[0]
        if h is not None: need = max(need, (h - o).dot(d) + CLEAR)
    if need > r: disp[i] = d * min(need - r, 3.0) * w
for _ in range(3):
    disp = [max([disp[i]] + [disp[j] * 0.85 for j in adj[i]], key=lambda x: x.length) for i in range(len(disp))]
for _ in range(3):
    disp = [(disp[i] * 2 + sum((disp[j] for j in adj[i]), Vector())) / (2 + len(adj[i])) for i in range(len(disp))]
for v, d in zip(me.vertices, disp): v.co += d
rings = []
for side in (1, -1):
    xs = sorted({round(v.co.x * side, 2) for v in me.vertices if 25.5 < v.co.x * side < 44})
    groups = []
    for x in xs:
        if groups and x - groups[-1][-1] < 0.3: groups[-1].append(x)
        else: groups.append([x])
    for g in groups:
        ring = [v for v in me.vertices if g[0] - 0.01 <= v.co.x * side <= g[-1] + 0.01]
        if len(ring) < 12: continue
        cy = sum(v.co.y for v in ring) / len(ring); cz = sum(v.co.z for v in ring) / len(ring)
        data = sorted(((math.atan2(v.co.z - cz, v.co.y - cy), v) for v in ring), key=lambda t: t[0])
        ang = [a for a, _ in data]; vs = [v for _, v in data]
        r = np.array([math.hypot(v.co.y - cy, v.co.z - cz) for v in vs]); need = r.copy()
        if r.mean() > 14: continue
        for k, (a, v) in enumerate(data):
            d = Vector((0, math.cos(a), math.sin(a))); o = Vector((v.co.x, cy, cz))
            for T in (G, V):
                h = T.ray_cast(o, d, r[k] + 4)[0]
                if h is not None: need[k] = max(need[k], min((h - o).dot(d) + CLEAR, r[k] + 2.5))
        env = np.max([np.roll(need, s) for s in range(-2, 3)], axis=0)
        for _ in range(4): env = (np.roll(env, 1) + 2 * env + np.roll(env, -1)) / 4
        new = np.maximum(env, need)
        for _ in range(3): new = (np.roll(new, 1) + 2 * new + np.roll(new, -1)) / 4
        f = ramp(sum(g) / len(g), 25.5, 28.5)
        new = r + (new - r) * f
        for a, v, rn in zip(ang, vs, new): v.co.y = cy + rn * math.cos(a); v.co.z = cz + rn * math.sin(a)
        rings.append(round(float((new - r).max()), 2))
me.update(); bpy.data.meshes.remove(gm)
rig.data.pose_position = 'POSE'
print('game ease', F.name, 'torso moved', sum(1 for d in disp if d.length > 0.05), 'sleeve rings', rings)
