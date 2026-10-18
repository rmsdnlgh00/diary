"""Female working file, rest pose: settle a top's rigid parts on the tidied tops of both characters.

Set ITEM (e.g. 'hoodie_gray') and PARTS before exec(); each part is 'Cloth <ITEM> <part>':
  conform  buttons, pocket: the male part's shape (from '<mesh> before conform', made on first run),
           at the same distance from the coat as on the male original's surface, on both tops
  strings  hood strings: each cord's top and bottom ring (and its tip) moved to just in front of the
           chest, so the cord lies down the chest instead of standing off it
  hood     a hood on the back: from the neck roll (fullest) down to a rounded point between the
           shoulder blades, its edges on the back, plump in the middle (THICK)
    PARTS = {'pocket': 'conform', 'strings': 'strings', 'hood': 'hood'}
The comparison male's rig sits at x=90; everything is measured in its own space.
"""
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

_g = globals()
ITEM = _g['ITEM']
PARTS = _g['PARTS']
THICK = _g.get('THICK', {'female': 7.0, 'male': 6.5})

rig_f = bpy.data.objects['Armature Female']
rig_m = bpy.data.objects['Comparison male rig | striped tee']
for r in (rig_f, rig_m): r.data.pose_position = 'REST'
bpy.context.view_layer.update()
OX = Vector((rig_m.matrix_world.translation.x, 0, 0))
SIDES = {   # body, top object, offset
    'female': (f'Cloth {ITEM}', Vector()),
    'male': (f'Comparison male | Cloth {ITEM}', OX),
}


def tree_of(obj, off, mesh=None):
    mesh = mesh or obj.data
    return BVHTree.FromPolygons([obj.matrix_world @ v.co - off for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])


def front(tree, x, z):
    hit = tree.ray_cast(Vector((x, -60, z)), Vector((0, 1, 0)), 80)[0]
    return hit.y if hit is not None and hit.y < -4 else None


def back(tree, x, z):
    hit = tree.ray_cast(Vector((x, 60, z)), Vector((0, -1, 0)), 80)[0]
    return hit.y if hit is not None else None


def keep(obj, suffix):
    name = f'{obj.data.name} {suffix}'
    if name not in bpy.data.meshes:
        copy = obj.data.copy(); copy.name = name; copy.use_fake_user = True
    return bpy.data.meshes[name]


def islands(mesh):
    bm = bmesh.new(); bm.from_mesh(mesh); bm.verts.ensure_lookup_table()
    seen, out = set(), []
    for v in bm.verts:
        if v.index in seen: continue
        stack, comp = [v], []
        while stack:
            x = stack.pop()
            if x.index in seen: continue
            seen.add(x.index); comp.append(x.index); stack += [e.other_vert(x) for e in x.link_edges]
        out.append(comp)
    bm.free()
    return out


def conform(part):
    male = bpy.data.objects[f'Comparison male | Cloth {ITEM} {part}']
    template = keep(male, 'before conform')
    top_m = bpy.data.objects[SIDES['male'][0]]
    ref_mesh = bpy.data.meshes.get(top_m.data.name + ' before rebuild')
    ref = tree_of(top_m, OX, ref_mesh) if ref_mesh else tree_of(top_m, OX)
    pts = [male.matrix_world @ v.co - OX for v in template.vertices]
    offset = [p.y - (front(ref, p.x, p.z) or p.y) for p in pts]
    for side, (top_name, off) in SIDES.items():
        obj = bpy.data.objects[f'Cloth {ITEM} {part}' if side == 'female' else f'Comparison male | Cloth {ITEM} {part}']
        keep(obj, 'before conform')
        if len(obj.data.vertices) != len(pts):   # take the male part's shape, keep this object's materials
            mesh = template.copy(); mesh.materials.clear()
            for m in obj.data.materials: mesh.materials.append(m)
            obj.data = mesh
        tree = tree_of(bpy.data.objects[top_name], off)
        inv = obj.matrix_world.inverted()
        for v, p, o in zip(obj.data.vertices, pts, offset):
            v.co = inv @ (Vector((p.x, front(tree, p.x, p.z) + o, p.z)) + off)
        obj.data.update()
    print(f'{part}: conformed on both tops')


def strings(part, gap=0.15):
    for side, (top_name, off) in SIDES.items():
        obj = bpy.data.objects[f'Cloth {ITEM} {part}' if side == 'female' else f'Comparison male | Cloth {ITEM} {part}']
        source = keep(obj, 'before lay')
        tree = tree_of(bpy.data.objects[top_name], off)
        pts = [obj.matrix_world @ v.co - off for v in source.vertices]
        out = list(pts)
        for s in (1, -1):
            group = [c for c in islands(source) if sum(pts[i].x for i in c) / len(c) * s > 0]
            cord = max(group, key=lambda c: max(pts[i].z for i in c) - min(pts[i].z for i in c))
            zs = [pts[i].z for i in cord]; zmid = (max(zs) + min(zs)) / 2
            shift = {}
            for end, ring in (('top', [i for i in cord if pts[i].z > zmid]), ('bottom', [i for i in cord if pts[i].z <= zmid])):
                cx = sum(pts[i].x for i in ring) / len(ring); cy = sum(pts[i].y for i in ring) / len(ring)
                cz = sum(pts[i].z for i in ring) / len(ring)
                half = max(pts[i].y for i in ring) - cy
                shift[end] = (front(tree, cx, cz) - half - gap) - cy
                for i in ring: out[i] = pts[i] + Vector((0, shift[end], 0))
            for c in group:
                if c is not cord:
                    for i in c: out[i] = pts[i] + Vector((0, shift['bottom'], 0))
        inv = obj.matrix_world.inverted()
        for v, p in zip(obj.data.vertices, out): v.co = inv @ (p + off)
        obj.data.update()
    print(f'{part}: laid on both chests')


def hood(part, top_z=100.5, bottom_z=82.0):
    for side, (top_name, off) in SIDES.items():
        obj = bpy.data.objects[f'Cloth {ITEM} {part}' if side == 'female' else f'Comparison male | Cloth {ITEM} {part}']
        source = keep(obj, 'before lay flat')
        tree = tree_of(bpy.data.objects[top_name], off)
        pts = [obj.matrix_world @ v.co - off for v in source.vertices]
        xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
        cx, hw = (min(xs) + max(xs)) / 2, (max(xs) - min(xs)) / 2
        z0, z1, y0, y1 = min(zs), max(zs), min(ys), max(ys)
        half = 13.5 if side == 'female' else 12.5
        zt = top_z if side == 'female' else top_z - 0.5
        inv = obj.matrix_world.inverted()
        for v, p in zip(obj.data.vertices, pts):
            u = (p.x - cx) / hw; s = (p.z - z0) / (z1 - z0); t = (p.y - y0) / (y1 - y0)
            width = 0.5 + 0.5 * math.sin(min(1, s * 1.15) * math.pi / 2)   # point at the bottom, full at the neck
            nx, nz = u * half * width, bottom_z + s * (zt - bottom_z)
            roll = 0.55 + 0.45 * s ** 1.2                                   # fullest at the neck roll
            e = max(0.0, 1 - u * u) ** 0.35 * roll * min(1, (1 - s) * 5 + 0.35)
            yb = back(tree, nx, nz)
            if yb is None: yb = back(tree, nx, nz - 1.5) or back(tree, 0, nz - 1.5)
            v.co = inv @ (Vector((nx, yb + 0.3 + t * THICK[side] * max(e, 0.05), nz)) + off)
        obj.data.update()
    print(f'{part}: laid on both backs')


for part, how in PARTS.items():
    {'conform': conform, 'strings': strings, 'hood': hood}[how](part)
for r in (rig_f, rig_m): r.data.pose_position = 'POSE'
