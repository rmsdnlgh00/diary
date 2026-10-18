"""In the female working file: dress the comparison male (rig at x=90) in one item from the male original,
named 'Comparison male | Cloth <item> …'. Skinned pieces keep their armature modifier (pointed at the
comparison rig); rigid pieces keep their bone parent and sit where they sit on the male original.
Set ITEM before exec(). The male original is only read."""
import bpy
from mathutils import Matrix

import os
from pathlib import Path
SRC = str(Path.home() / 'male_master_3d/diary_character_clothes.blend')
item = globals()['ITEM']
rig = bpy.data.objects['Comparison male rig | striped tee']
coll = bpy.data.collections['Comparison male striped tee | preview']
male = bpy.data.objects['Armature.002']
before = set(bpy.data.objects.keys())
with bpy.data.libraries.load(SRC, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n == f'Cloth {item}' or n.startswith(f'Cloth {item} ')]
saved = (male.data.pose_position, rig.data.pose_position)
male.data.pose_position = rig.data.pose_position = 'REST'
strays = set()
for o in dst.objects:
    base = o.name if o.name in (f'Cloth {item}',) or o.name.startswith(f'Cloth {item} ') else o.name.rsplit('.', 1)[0]
    if '.' in base and base.rsplit('.', 1)[1].isdigit(): base = base.rsplit('.', 1)[0]
    ptype, pbone, pinv = o.parent_type, o.parent_bone, o.matrix_parent_inverse.copy()
    if o.parent and o.parent.name not in before: strays.add(o.parent)
    coll.objects.link(o)
    for m in o.modifiers:
        if m.type == 'ARMATURE':
            if m.object and m.object.name not in before: strays.add(m.object)
            m.object = rig
    if ptype == 'BONE':
        # where it sits on the male original (same rig at the origin), then shifted to x=90
        o.parent = male; o.parent_type = 'BONE'; o.parent_bone = pbone; o.matrix_parent_inverse = pinv
        bpy.context.view_layer.update()
        world = o.matrix_world.copy()
        o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = pbone
        bpy.context.view_layer.update()
        o.matrix_world = Matrix.Translation(rig.matrix_world.translation) @ world
    else:
        o.parent = rig; o.parent_type = ptype; o.matrix_parent_inverse = pinv
    o.name = 'Comparison male | ' + base
    print('dressed', o.name, ptype, pbone, len(o.data.vertices))
for s in strays:
    if s.name not in before: bpy.data.objects.remove(s)
male.data.pose_position, rig.data.pose_position = saved
bpy.context.view_layer.update()
