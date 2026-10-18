"""Rebuild a pair of shorts from its backup: smooth seat and hips, clean leg openings, neat rolled cuffs.

Rest pose, object space (shorts, cuff and body share one transform).
  1. legs cut at LEG_CUT (below the crotch) and rebuilt as rings down to LEG_HEM, sized from the thigh
  2. the rest (hips and seat) relaxed with Taubin smoothing, kept CLEAR off the skin; the waistband
     (under the tee) is left alone
  3. a new rolled cuff per leg around the opening, replacing the old cuff mesh
  4. skin weights from the body (the cuff copies the shorts' weights)
Set SH_SHORTS / SH_CUFF / SH_BODY / SH_SRC / SH_CUFF_SRC before exec() for another pair.
"""
import bpy, bmesh, math
from collections import defaultdict
from mathutils import Vector
from mathutils.bvhtree import BVHTree

_g = globals()
SHORTS = bpy.data.objects[_g.get('SH_SHORTS', 'Cloth denim_shorts')]
CUFF = bpy.data.objects[_g.get('SH_CUFF', 'Cloth denim_shorts cuff')]
BODY = bpy.data.objects[_g.get('SH_BODY', 'char_female_v3')]
SRC = bpy.data.meshes[_g.get('SH_SRC', 'Cloth denim_shorts before tidy')]
LEG_CUT = 34.0
LEG_HEM = 31.0
LEG_GAP = 1.6        # loose shorts legs
CLEAR = 0.8
WAIST_KEEP = 49.0    # above this the waistband stays as it is (the tee was fitted over it)
CUFF_H = 2.2         # rolled cuff height
CUFF_T = 0.9         # rolled cuff thickness
SMOOTH_ROUNDS = 20
MID_GAP = 0.9        # the legs stop this far short of the centre line, so the two cuffs never meet

body = BODY.data
body_tree = BVHTree.FromPolygons([v.co for v in body.vertices], [p.vertices[:] for p in body.polygons])


def boundary_loops(bm, test):
    adj = defaultdict(list)
    for e in bm.edges:
        if e.is_boundary and all(test(v) for v in e.verts):
            a, b = e.verts; adj[a].append(b); adj[b].append(a)
    seen, loops = set(), []
    for start in list(adj):
        if start in seen: continue
        loop = [start]; seen.add(start); prev, cur = None, start
        while True:
            nxt = [n for n in adj[cur] if n is not prev and (n not in seen or n is start)]
            if not nxt or nxt[0] is start: break
            prev, cur = cur, nxt[0]; loop.append(cur); seen.add(cur)
        loops.append(loop)
    return loops


def bridge(bm, rings):
    n = len(rings[0])
    faces = []
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            try: faces.append(bm.faces.new((a[i], a[j], b[j], b[i])))
            except ValueError: pass
    return faces


def ordered_dirs(loop, c):
    """Unit directions from c through each loop vertex, forced into strict angle order."""
    angs = [math.atan2(v.co.y - c.y, v.co.x - c.x) for v in loop]
    N = len(angs)
    turn = sum(((angs[(i + 1) % N] - angs[i] + math.pi) % (2 * math.pi)) - math.pi for i in range(N))
    sgn = 1 if turn > 0 else -1
    un = [angs[0]]
    for i in range(1, N):
        step = ((angs[i] - angs[i - 1] + math.pi) % (2 * math.pi)) - math.pi
        un.append(un[-1] + (step if step * sgn > 1e-4 else sgn * 1e-4))
    return [Vector((math.cos(a), math.sin(a), 0)) for a in un]


def skin_radius(c, d, z):
    """Distance from the leg centre c to its own thigh skin along d at height z (first hit outwards)."""
    o = Vector((c.x, c.y, z))
    hit, _, _, _ = body_tree.ray_cast(o, d, 30)
    return None if hit is None else (hit - o).dot(d)


def ring_smooth(row, k=3):
    N = len(row)
    row = [sorted(row[(i + j) % N] for j in range(-3, 4))[3] for i in range(N)]   # drop single spikes
    for _ in range(k):
        row = [(row[i - 1] + 2 * row[i] + row[(i + 1) % N]) / 4 for i in range(N)]
    return row


me = SHORTS.data
bm = bmesh.new(); bm.from_mesh(SRC)

# ---------- 1. legs ----------
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=0.01,
                       plane_co=(0, 0, LEG_CUT), plane_no=(0, 0, -1), clear_outer=True)
for _ in range(3):
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    teeth = [f for f in bm.faces if sum(1 for e in f.edges if e.is_boundary) >= 2 and all(v.co.z < LEG_CUT + 2 for v in f.verts)]
    bmesh.ops.delete(bm, geom=teeth, context='FACES')
for v in bm.verts:
    if v.is_boundary and v.co.z < LEG_CUT + 2: v.co.z = LEG_CUT

legs = [l for l in boundary_loops(bm, lambda v: abs(v.co.z - LEG_CUT) < 0.05) if len(l) > 8]
for loop in legs:   # merge crowded cut points (thin columns would streak down the leg)
    bmesh.ops.remove_doubles(bm, verts=loop, dist=0.6)
bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=0.01)
legs = [l for l in boundary_loops(bm, lambda v: abs(v.co.z - LEG_CUT) < 0.05) if len(l) > 8]
print('legs', [len(l) for l in legs])

NZ = 3
ZS = [LEG_CUT - (LEG_CUT - LEG_HEM) * k / NZ for k in range(1, NZ + 1)]
leg_info = []
for loop in legs:
    c = sum((v.co for v in loop), Vector()) / len(loop); c.z = 0
    dirs = ordered_dirs(loop, c)
    r0 = [(v.co - Vector((c.x, c.y, LEG_CUT))).dot(d) for v, d in zip(loop, dirs)]
    rows, prev = [], r0
    for k, z in enumerate(ZS):
        row = []
        for i, d in enumerate(dirs):
            rs = skin_radius(c, d, z)
            want = (rs + LEG_GAP) if rs is not None else prev[i]
            want = max(want, prev[i] - 0.25)         # the leg hangs straight; it doesn't tuck in
            if k == 0: want = (want + r0[i]) / 2
            row.append(want)
        row = ring_smooth(row)
        rows.append(row); prev = row
    s = 1 if c.x > 0 else -1
    rings = [loop] + [[bm.verts.new((s * max(s * (c.x + d.x * r), MID_GAP), c.y + d.y * r, z)) for d, r in zip(dirs, row)]
                      for z, row in zip(ZS, rows)]
    bridge(bm, rings)
    leg_info.append((c, dirs, rows[-1]))

# ---------- 2. hips and seat ----------
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bm.verts.ensure_lookup_table()
movable = [v for v in bm.verts
           if not v.is_boundary and LEG_CUT + 0.5 < v.co.z < WAIST_KEEP
           and not any(e.other_vert(v).is_boundary for e in v.link_edges)]


def relax(factor):
    P = {v: v.co.copy() for v in movable}
    for v in movable:
        nb = [e.other_vert(v) for e in v.link_edges]
        avg = sum((P.get(n, n.co) for n in nb), Vector()) / len(nb)
        v.co = P[v] + (avg - P[v]) * factor


def clear(v):
    q, n, _, _ = body_tree.find_nearest(v.co)
    if q is None: return
    out = (v.co - q).dot(n)
    if out < CLEAR: v.co = v.co + n * (CLEAR - out)


# no push off the skin here: the thighs and hips under the shorts are hidden, and the nearest-skin
# normals around the crotch point every which way, which crumples the cloth
for _ in range(SMOOTH_ROUNDS):
    relax(0.6); relax(-0.63)
for f in bm.faces: f.smooth = True
bm.normal_update()
bm.to_mesh(me); me.update(); bm.free()
if me.has_custom_normals:
    with bpy.context.temp_override(object=SHORTS, active_object=SHORTS, selected_objects=[SHORTS]):
        bpy.ops.mesh.customdata_custom_splitnormals_clear()

# ---------- 3. rolled cuffs ----------
# cross-section of the roll: (radial offset from the leg opening, height above the hem), a closed loop
PROFILE = [(0.15, -0.35), (CUFF_T * 0.75, -0.2), (CUFF_T, 0.4), (CUFF_T, CUFF_H - 0.6),
           (CUFF_T * 0.75, CUFF_H - 0.1), (0.15, CUFF_H), (-0.25, CUFF_H - 0.4), (-0.3, 0.0)]
cme = CUFF.data
cb = bmesh.new()
for c, dirs, radii in leg_info:
    N = len(dirs)
    s = 1 if c.x > 0 else -1
    rings = [[cb.verts.new((s * max(s * (c.x + d.x * (r + dr)), MID_GAP - 0.3 + dr * 0.25), c.y + d.y * (r + dr), LEG_HEM + dz))
              for d, r in zip(dirs, radii)]
             for dr, dz in PROFILE]
    bridge(cb, rings + [rings[0]])
bmesh.ops.recalc_face_normals(cb, faces=cb.faces[:])
for f in cb.faces: f.smooth = True
uvs = cb.loops.layers.uv.verify()
for f in cb.faces:
    for l in f.loops: l[uvs].uv = (0.5, 0.5)   # flat colour texture
cb.to_mesh(cme); cme.update(); cb.free()
if cme.has_custom_normals:
    with bpy.context.temp_override(object=CUFF, active_object=CUFF, selected_objects=[CUFF]):
        bpy.ops.mesh.customdata_custom_splitnormals_clear()

# ---------- 4. weights ----------
bnames = [g.name for g in BODY.vertex_groups]


def interp_weights(mesh, tree, names, co):
    q, _, fi, _ = tree.find_nearest(co)
    poly = mesh.polygons[fi]
    cs = [(i, 1 / max((mesh.vertices[i].co - q).length, 1e-3)) for i in poly.vertices]
    tot = sum(c for _, c in cs); ws = {}
    for i, c in cs:
        for g in mesh.vertices[i].groups:
            nm = names[g.group]
            if nm.startswith('mixamorig') and g.weight > 0: ws[nm] = ws.get(nm, 0) + g.weight * c / tot
    return ws


def assign(obj, src_mesh, src_tree, src_names):
    for g in list(obj.vertex_groups): obj.vertex_groups.remove(g)
    groups = {}
    for v in obj.data.vertices:
        for nm, w in interp_weights(src_mesh, src_tree, src_names, v.co).items():
            if w < 0.002: continue
            if nm not in groups: groups[nm] = obj.vertex_groups.new(name=nm)
            groups[nm].add([v.index], w, 'REPLACE')


# the waistband moves with the tee's hem (which was weighted from these shorts); below it, the skin
TEE = bpy.data.objects[_g.get('SH_TEE', 'Cloth striped_tee')]
tme = TEE.data
tee_tree = BVHTree.FromPolygons([v.co for v in tme.vertices], [p.vertices[:] for p in tme.polygons])
tee_names = [g.name for g in TEE.vertex_groups]
saved = [interp_weights(tme, tee_tree, tee_names, v.co) if v.co.z > WAIST_KEEP - 3 else None for v in me.vertices]
assign(SHORTS, body, body_tree, bnames)
groups = {g.name: g for g in SHORTS.vertex_groups}
for v, ws in zip(me.vertices, saved):
    if ws is None: continue
    blend = min(1, (v.co.z - (WAIST_KEEP - 3)) / 3)
    cur = {SHORTS.vertex_groups[g.group].name: g.weight for g in v.groups}
    for nm in set(ws) | set(cur):
        w = cur.get(nm, 0) * (1 - blend) + ws.get(nm, 0) * blend
        if nm not in groups: groups[nm] = SHORTS.vertex_groups.new(name=nm)
        if w > 0.002: groups[nm].add([v.index], w, 'REPLACE')
        elif nm in cur: groups[nm].remove([v.index])
shorts_tree = BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices[:] for p in me.polygons])
assign(CUFF, me, shorts_tree, [g.name for g in SHORTS.vertex_groups])
print('shorts rebuilt', len(me.vertices), 'verts; cuffs', len(cme.vertices))
