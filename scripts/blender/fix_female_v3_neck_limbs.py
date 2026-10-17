"""Apply only approved fixes 6 and 7 to the live female-v3 scene.

Requires the pre-edit snapshot in bpy.app.driver_namespace['female_fix67'].
Never changes char1.001, topology, UVs, materials, images or animation curves.
"""
import bpy
from mathutils import Vector

ns = bpy.app.driver_namespace['female_fix67']
assert not ns.get('applied'), 'Already applied; restore the snapshot before rerunning.'
obj = bpy.data.objects['char_female_v3']
rig = bpy.data.objects['Armature Female']
original = ns['original']
weights = ns['weights']
names = {g.index: g.name for g in obj.vertex_groups}
head_group = obj.vertex_groups['mixamorig:Head']
backup = obj.data.copy()
backup.name = 'char_female_v3 before fix6_7 20261017'
backup.use_fake_user = True

def smooth(value):
    value = max(0., min(1., value))
    return value * value * (3 - 2 * value)

delta = 5.0
head_base = 102.0
target_height = 170.0
head_scale = (target_height - head_base - delta) / (max(p.z for p in original) - head_base)
pivot = Vector((0, -1, head_base))
axes = {}
inverse = obj.matrix_world.inverted()
for bone in rig.data.bones:
    axes[bone.name] = (inverse @ (rig.matrix_world @ bone.head_local),
                       inverse @ (rig.matrix_world @ bone.tail_local))

def shrink_radially(point, groups, suffixes, ratio, envelope):
    candidates = [(name, w) for name, w in groups.items()
                  if name.startswith('mixamorig:') and name.split(':')[-1] in suffixes and w > 1e-6]
    influence = sum(w for _, w in candidates)
    if influence < .01 or envelope <= 0:
        return point
    move = Vector()
    for name, w in candidates:
        start, end = axes[name]
        axis = (end - start).normalized()
        nearest = start + axis * (point - start).dot(axis)
        move += (nearest - point) * (w / influence)
    return point + move * ((1-ratio) * smooth(influence/.95) * envelope)

counts = {'head': 0, 'neck': 0, 'arms': 0, 'legs': 0}
for vertex, source, groups in zip(obj.data.vertices, original, weights):
    p = source.copy()
    ws = {names[index]: weight for index, weight in groups}
    hand = abs(source.x) > 46
    chest = source.y < -12 and 70 < source.z < 96 and abs(source.x) < 16
    if not hand and not chest:
        if source.z >= 102 or ws.get('mixamorig:Head', 0) > .9:
            p = pivot + (source - pivot) * head_scale + Vector((0, 0, delta))
            counts['head'] += 1
        elif source.z > 94 and ws.get('mixamorig:Neck', 0) + ws.get('mixamorig:Head', 0) > .05:
            destination = pivot + (source - pivot) * head_scale + Vector((0, 0, delta))
            p = source.lerp(destination, smooth((source.z-94)/8))
            counts['neck'] += 1
        else:
            # Full reduction near x=40; a soft transition protects the hand at x=46.
            arm_envelope = 1 - smooth((abs(source.x)-42)/4)
            arm_point = shrink_radially(p, ws, {'LeftArm','RightArm','LeftForeArm','RightForeArm'}, .8, arm_envelope)
            if (arm_point-p).length > 1e-7:
                counts['arms'] += 1
            p = arm_point
            # Leave shoes and their ground contact alone; blend at the ankle.
            leg_point = shrink_radially(p, ws, {'LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'}, .88,
                                         smooth((source.z-9)/5))
            if (leg_point-p).length > 1e-7:
                counts['legs'] += 1
            p = leg_point
    vertex.co = p

# Normalize existing influences without adding bones; bind the head rigidly as specified.
for vertex, source, groups in zip(obj.data.vertices, original, weights):
    if source.z >= 102:
        for index, _ in groups:
            obj.vertex_groups[index].remove([vertex.index])
        head_group.add([vertex.index], 1., 'REPLACE')
    else:
        total = sum(weight for _, weight in groups)
        if total > 0 and abs(total-1) > 1e-7:
            for index, weight in groups:
                obj.vertex_groups[index].add([vertex.index], weight/total, 'REPLACE')
obj.data.update()

# Translate in WORLD Z. The armature's local vertical is Y, due to its import transform.
# The three bones keep exactly the same lengths, directions and roll.
state = ns['state']
active = bpy.context.view_layer.objects.active
selected = list(bpy.context.selected_objects)
rig_visibility = (rig.hide_viewport, rig.hide_get())
rig.hide_viewport = False
rig.hide_set(False)
for ob in selected:
    ob.select_set(False)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
translation = rig.matrix_world.inverted().to_3x3() @ Vector((0,0,delta))
ns['edit_bones_before'] = {}
for suffix in ['Neck','Head','HeadTop_End']:
    bone = rig.data.edit_bones['mixamorig:'+suffix]
    ns['edit_bones_before'][bone.name] = (bone.head.copy(), bone.tail.copy(), bone.roll)
    bone.head += translation
    bone.tail += translation
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)
for ob in selected:
    ob.select_set(True)
bpy.context.view_layer.objects.active = active
rig.hide_set(rig_visibility[1])
rig.hide_viewport = rig_visibility[0]
bpy.context.view_layer.update()
ns['applied'] = True
ns['counts'] = counts
ns['head_scale'] = head_scale
print('Applied approved fixes only:', counts, 'head scale:', head_scale,
      'rest height:', max(v.co.z for v in obj.data.vertices))
