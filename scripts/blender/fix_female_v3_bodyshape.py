"""Correct the raised shoulder strip, shorten the torso and shape waist/hips.

Requires bpy.app.driver_namespace['female_bodyshape']; no remeshing or material edits.
"""
import bpy
import math
from mathutils import Vector

ns = bpy.app.driver_namespace['female_bodyshape']
assert not ns.get('applied')
obj = bpy.data.objects['char_female_v3']
rig = bpy.data.objects['Armature Female']
source = ns['original']
old = bpy.data.meshes['char_female_v3 before fix6_7 20261017']
assert len(source) == len(old.vertices) == len(obj.data.vertices)
names = {g.index: g.name for g in obj.vertex_groups}

def smooth(t):
    t = max(0., min(1., t))
    return t*t*(3-2*t)

# Shift each bone rigidly: existing local axes, roll and animation channels are preserved.
bone_offsets = {}
for bone in rig.data.bones:
    suffix = bone.name.split(':')[-1]
    world_head = rig.matrix_world @ bone.head_local
    upper_chain = any(part in suffix for part in ['Shoulder', 'Arm', 'Hand', 'Head', 'Neck'])
    dz = -3.5 if upper_chain else -3.5*smooth((world_head.z-62)/31)
    bone_offsets[bone.name] = dz

repaired = 0
for vertex, current, previous in zip(obj.data.vertices, source, old.vertices):
    p = current.copy()
    previous_weights = {names[g.group]: g.weight for g in previous.groups}
    neck_influence = previous_weights.get('mixamorig:Neck', 0) + previous_weights.get('mixamorig:Head', 0)
    if 94 < previous.co.z < 102 and current.z-previous.co.z > .05 and neck_influence < .9:
        # The earlier height-only transition also lifted mixed Spine2 shoulder vertices.
        keep_lift = smooth((neck_influence-.35)/.55)
        p = previous.co.lerp(current, keep_lift)
        repaired += 1
    groups = {names[g.group]: g.weight for g in vertex.groups}
    torso_influence = sum(weight for name, weight in groups.items()
                          if name.split(':')[-1] in ['Hips','Spine','Spine1','Spine2','LeftUpLeg','RightUpLeg'])
    envelope = min(1., torso_influence)
    envelope *= 1-smooth((abs(current.x)-22)/5)
    waist = .115*math.exp(-((current.z-73)/6.5)**2)
    hip = .095*math.exp(-((current.z-59)/6)**2)*smooth((current.z-49)/5)
    p.x *= 1 + (hip-waist)*envelope
    p.z += sum(bone_offsets.get(name, 0)*weight for name,weight in groups.items())
    spine2 = groups.get('mixamorig:Spine2', 0)
    if current.z > 94 and 5 < abs(current.x) < 22 and spine2 > .35 and groups.get('mixamorig:Head', 0) < .2:
        roof = 99.0-.58*(abs(p.x)-5)
        if p.z > roof:
            p.z += (roof-p.z)*smooth((spine2-.35)/.45)
    vertex.co = p
obj.data.update()

for ob in list(bpy.context.selected_objects):
    ob.select_set(False)
rig.hide_viewport = False
rig.hide_set(False)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
before = {b.name: (b.head.copy(), b.tail.copy(), b.roll, b.use_connect) for b in rig.data.edit_bones}
for b in rig.data.edit_bones:
    b.use_connect = False
for b in rig.data.edit_bones:
    h,t,roll,_ = before[b.name]
    delta = rig.matrix_world.inverted().to_3x3() @ Vector((0,0,bone_offsets[b.name]))
    b.head = h+delta
    b.tail = t+delta
    b.roll = roll
for b in rig.data.edit_bones:
    # Keep the same parent hierarchy, but allow the two spine pivots to move
    # independently. Reconnecting would rotate their local animation axes.
    b.use_connect = before[b.name][3] and b.name not in ['mixamorig:Spine1', 'mixamorig:Spine2']
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)
for ob in ns['state']['selected']:
    ob.select_set(True)
bpy.context.view_layer.objects.active = ns['state']['active']
bpy.context.scene.frame_set(ns['state']['frame'])
bpy.context.view_layer.update()
ns.update({'applied': True, 'shoulder_vertices_repaired': repaired,
           'bone_offsets': bone_offsets, 'edit_bones_before': before})
print('Shoulder/torso correction applied:', repaired, 'shoulder points, rest height',
      max(v.co.z for v in obj.data.vertices))
