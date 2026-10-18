"""Rebuild a top (tee, hoodie, …) from its backup: clean sleeves, slim belly, clean waist and hem.

Rest pose throughout, object space (the top, body and shorts share one transform).
  1. sleeves cut at the shoulder and rebuilt as tapered tubes with a folded cuff
  2. belly pulled in to BELLY_GAP off the skin (horizontal rays)
  3. waist cut at WAIST_Z and rebuilt as rings down to the hem, sized from body and shorts
  4. skin weights from the body; the waist band blends to the shorts' weights
  5. cylindrical UVs from the idle pose (stripes run round the body)
Parameters come from the exec() globals (P_TOP, P_SRC, P_BODY, P_SHORTS, P_HEM_Z, …); the
defaults are the female striped tee.
"""
import bpy, bmesh, math
from collections import defaultdict
from mathutils import Vector
from mathutils.bvhtree import BVHTree

_g = globals()
TEE = bpy.data.objects[_g.get('P_TOP', 'Cloth striped_tee')]
SRC = bpy.data.meshes[_g.get('P_SRC', 'Cloth striped_tee before sleeve rebuild')]
BODY = bpy.data.objects[_g.get('P_BODY', 'char_female_v3')]
SHORTS = bpy.data.objects[_g.get('P_SHORTS', 'Cloth denim_shorts')]
HEM_Z = _g.get('P_HEM_Z', 51.0)
WAIST_Z = _g.get('P_WAIST_Z', 68.0)      # the lower torso is rebuilt as clean rings from here down
SLEEVE_CUT = 22.0
CUFF_X = _g.get('P_CUFF_X', 34.0)        # where the sleeve ends
SLEEVE_OFF = _g.get('P_SLEEVE_OFF', 2.0)
BELLY_GAP = _g.get('P_BELLY_GAP', 1.0)
SHORTS_GAP = _g.get('P_SHORTS_GAP', 1.0)
AXIS = Vector((0, -4, 0))   # torso axis (x, y) for horizontal rays
STRIPE_SHIFT = _g.get('P_STRIPE_SHIFT', 0.0)

body = BODY.data
sme = SHORTS.data
me = TEE.data
body_tree = BVHTree.FromPolygons([v.co for v in body.vertices], [p.vertices[:] for p in body.polygons])
shorts_tree = BVHTree.FromPolygons([v.co for v in sme.vertices], [p.vertices[:] for p in sme.polygons])
SHORTS_TOP = max(v.co.z for v in sme.vertices)


def outward(p):
    d = Vector((p.x - AXIS.x, p.y - AXIS.y, 0))
    return d.normalized() if d.length > 1e-6 else Vector((0, -1, 0))


def radius_on(tree, z, d, spread=(0,)):
    """Distance from the torso axis to the outermost surface of `tree` along d at height z."""
    best = None
    for dz in spread:
        o = Vector((AXIS.x, AXIS.y, z + dz))
        hit, _, _, _ = tree.ray_cast(o + d * 40, -d, 40)
        if hit is not None:
            r = (hit - o).dot(d)
            best = r if best is None else max(best, r)
    return best


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
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            try: bm.faces.new((a[i], a[j], b[j], b[i]))
            except ValueError: pass


bm = bmesh.new(); bm.from_mesh(SRC)

# ---------- 1. sleeves ----------
for s in (1, -1):
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=0.01,
                           plane_co=(s * SLEEVE_CUT, 0, 0), plane_no=(s, 0, 0), clear_outer=True)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')

arm_pts = {s: [v.co.copy() for v in body.vertices if 20 <= s * v.co.x <= CUFF_X + 5 and 76 < v.co.z < 104 and -15 < v.co.y < 13]
           for s in (1, -1)}


def arm_r(s, x, cy, cz, th):
    best = 0
    for p in arm_pts[s]:
        if abs(s * p.x - x) > 1.5: continue
        a = math.atan2(p.z - cz, p.y - cy); d = abs((a - th + math.pi) % (2 * math.pi) - math.pi)
        if d < 0.3: best = max(best, math.hypot(p.y - cy, p.z - cz))
    return best


XS = [SLEEVE_CUT + (CUFF_X - SLEEVE_CUT) * k / 6 for k in range(1, 7)]
for s in (1, -1):
    loop = max(boundary_loops(bm, lambda v: abs(v.co.x - s * SLEEVE_CUT) < 0.05), key=len)
    N = len(loop)
    c0y = sum(v.co.y for v in loop) / N; c0z = sum(v.co.z for v in loop) / N
    near = [p for p in arm_pts[s] if CUFF_X - 3 <= s * p.x <= CUFF_X + 1]
    ay = sum(p.y for p in near) / len(near); az = sum(p.z for p in near) / len(near)
    ring0 = [(math.atan2(v.co.z - c0z, v.co.y - c0y), math.hypot(v.co.y - c0y, v.co.z - c0z)) for v in loop]
    targ = [max(arm_r(s, x, ay, az, th) for x in (CUFF_X - 4.5, CUFF_X - 3, CUFF_X - 1.5, CUFF_X, CUFF_X + 1.5)) + SLEEVE_OFF for th, _ in ring0]
    for _ in range(3):
        targ = [(targ[i - 1] + 2 * targ[i] + targ[(i + 1) % N]) / 4 for i in range(N)]

    def add_ring(x, cy, cz, radii):
        return [bm.verts.new((s * x, cy + r * math.cos(th), cz + r * math.sin(th))) for (th, _), r in zip(ring0, radii)]

    rings = [loop]
    for x in XS:
        f = (x - SLEEVE_CUT) / (XS[-1] - SLEEVE_CUT); g = f * (2 - f)
        cy = c0y + (ay - c0y) * f; cz = c0z + (az - c0z) * f
        rings.append(add_ring(x, cy, cz, [max(r0 + (rt - r0) * g, rt) if f > 0.6 else r0 + (rt - r0) * g
                                          for (_, r0), rt in zip(ring0, targ)]))
    rings.append(add_ring(XS[-1] + 0.45, ay, az, [r - 0.3 for r in targ]))   # rounded cuff,
    rings.append(add_ring(XS[-1] + 0.3, ay, az, [r - 0.8 for r in targ]))    # folded inwards
    rings.append(add_ring(XS[-1] - 1.3, ay, az, [r - 0.8 for r in targ]))
    bridge(bm, rings)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary and e.verts[0].co.z > 95], sides=8)

# ---------- 2. waist cut, then the belly above it ----------
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=0.01,
                       plane_co=(0, 0, WAIST_Z), plane_no=(0, 0, -1), clear_outer=True)
for _ in range(3):
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    teeth = [f for f in bm.faces if sum(1 for e in f.edges if e.is_boundary) >= 2 and all(v.co.z < WAIST_Z + 2 for v in f.verts)]
    bmesh.ops.delete(bm, geom=teeth, context='FACES')
for v in bm.verts:
    if v.is_boundary and v.co.z < WAIST_Z + 2.5 and abs(v.co.x) < 24: v.co.z = WAIST_Z

for _ in range(4):
    disp = {}
    for v in bm.verts:
        p = v.co
        if not (WAIST_Z - 0.1 < p.z < 80 and abs(p.x) < 21): continue
        d = outward(p)
        rb = radius_on(body_tree, p.z, d)
        if rb is None: continue
        r = (p - Vector((AXIS.x, AXIS.y, p.z))).dot(d)
        w = 1.0 if p.z < 74 else max(0, (80 - p.z) / 6)
        if abs(r - (rb + BELLY_GAP)) > 0.05: disp[v] = d * (rb + BELLY_GAP - r) * w
    D = {v: disp.get(v, Vector()) for v in bm.verts}
    for _ in range(2):
        D = {v: ((D[v] * 3 + sum((D[e.other_vert(v)] for e in v.link_edges), Vector())) / (3 + len(v.link_edges)))
             if v in disp else D[v] for v in D}
    for v in disp:
        if abs(v.co.z - WAIST_Z) < 0.05:   # the cut loop moves only radially, so its angle order holds
            d = outward(v.co); v.co += d * D[v].dot(d)
        else:
            v.co += D[v]

# ---------- 3. waist band rebuilt as clean rings down to the hem ----------
# merge cut points that sit very close together: their thin columns would run down the band as streaks
cut_loop = max(boundary_loops(bm, lambda v: abs(v.co.z - WAIST_Z) < 0.05), key=len)
bmesh.ops.remove_doubles(bm, verts=cut_loop, dist=0.7)
bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=0.01)
waist = max(boundary_loops(bm, lambda v: abs(v.co.z - WAIST_Z) < 0.05), key=len)
N = len(waist)
# ring directions strictly in angle order (a back-step would fold the band into a crease)
angs = [math.atan2(v.co.x - AXIS.x, -(v.co.y - AXIS.y)) for v in waist]
turn = sum(((angs[(i + 1) % N] - angs[i] + math.pi) % (2 * math.pi)) - math.pi for i in range(N))
sgn = 1 if turn > 0 else -1
unwrapped = [angs[0]]
for i in range(1, N):
    step = ((angs[i] - angs[i - 1] + math.pi) % (2 * math.pi)) - math.pi
    unwrapped.append(unwrapped[-1] + (step if step * sgn > 1e-4 else sgn * 1e-4))
dirs = [Vector((math.sin(a), -math.cos(a), 0)) for a in unwrapped]
r0 = [(v.co - Vector((AXIS.x, AXIS.y, WAIST_Z))).dot(d) for v, d in zip(waist, dirs)]
NZ = max(2, round((WAIST_Z - HEM_Z) / 1.5))
ZS = [WAIST_Z - (WAIST_Z - HEM_Z) * k / NZ for k in range(1, NZ + 1)]
radii_rows, prev = [], r0
for k, z in enumerate(ZS):
    row = []
    for i, d in enumerate(dirs):
        rb = radius_on(body_tree, z, d) or prev[i] - BELLY_GAP
        want = rb + BELLY_GAP
        if z < SHORTS_TOP + 1:
            rs = radius_on(shorts_tree, z, d, spread=(-0.8, -0.4, 0, 0.4, 0.8))
            if rs is not None: want = max(want, rs + SHORTS_GAP)
        want = max(want, prev[i] - 0.3)      # the hem hangs; it doesn't tuck back in
        if k == 0: want = (want + r0[i]) / 2  # continue smoothly from the cut
        row.append(want)
    # a median first: single rays that catch a bump in the skin would otherwise poke the cloth out
    row = [sorted(row[(i + j) % N] for j in range(-3, 4))[3] for i in range(N)]
    for _ in range(3):
        row = [(row[i - 1] + 2 * row[i] + row[(i + 1) % N]) / 4 for i in range(N)]
    radii_rows.append(row); prev = row
# ease the flare over the shorts upwards, so there is no step where the waistband starts
for k in range(len(radii_rows) - 2, -1, -1):
    radii_rows[k] = [max(r, rb - 0.5) for r, rb in zip(radii_rows[k], radii_rows[k + 1])]
radii_rows[0] = [max(r, (r + r00) / 2) for r, r00 in zip(radii_rows[0], r0)]


def ring_at(z, radii):
    return [bm.verts.new((AXIS.x + d.x * r, AXIS.y + d.y * r, z)) for d, r in zip(dirs, radii)]


rings = [waist] + [ring_at(z, row) for z, row in zip(ZS, radii_rows)]
hem_r = radii_rows[-1]
rings.append(ring_at(HEM_Z + 0.15, [r - 0.35 for r in hem_r]))   # rounded hem,
rings.append(ring_at(HEM_Z + 1.4, [r - 0.7 for r in hem_r]))     # folded inwards
bridge(bm, rings)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
for f in bm.faces: f.smooth = True
bm.to_mesh(me); me.update(); bm.free()

# ---------- 4. weights ----------


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


bnames = [g.name for g in BODY.vertex_groups]
snames = [g.name for g in SHORTS.vertex_groups]
for g in list(TEE.vertex_groups): TEE.vertex_groups.remove(g)
groups = {}
for v in me.vertices:
    ws = interp_weights(body, body_tree, bnames, v.co)
    blend = min(1, max(0, (SHORTS_TOP + 6 - v.co.z) / 5))   # waist band follows the shorts
    if blend > 0:
        sw = interp_weights(sme, shorts_tree, snames, v.co)
        ws = {nm: ws.get(nm, 0) * (1 - blend) + sw.get(nm, 0) * blend for nm in set(ws) | set(sw)}
    for nm, w in ws.items():
        if w < 0.002: continue
        if nm not in groups: groups[nm] = TEE.vertex_groups.new(name=nm)
        groups[nm].add([v.index], w, 'REPLACE')

# ---------- 5. stripes: cylindrical UVs from the idle pose ----------
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
print('tee rebuilt', len(me.vertices), 'verts; waist ring', N, '; shorts top', round(SHORTS_TOP, 2))
