"""Background Blender: update only the female body and matching rest skeleton.

Open the prepared clothes-file copy before running this script. Arguments after --:
    fixed_female_blend prepared_clothes_blend audit_json
"""
import array
import bpy
import hashlib
import json
import struct
import sys

source_path, output_path, report_path = sys.argv[sys.argv.index('--')+1:]
body = bpy.data.objects['char_female_v3']
rig = bpy.data.objects['Armature Female']
male = bpy.data.objects['char1.001']

def mesh_hash(obj):
    return hashlib.sha256(b''.join(struct.pack('<3f', *v.co) for v in obj.data.vertices)).hexdigest()

def image_hash(image):
    pixels = array.array('f', [0]) * len(image.pixels)
    image.pixels.foreach_get(pixels)
    return hashlib.sha256(pixels.tobytes()).hexdigest()

def image_of(obj):
    return next(n.image for m in obj.data.materials if m and m.use_nodes
                for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)

before_male = mesh_hash(male)
clothes = {o.name: mesh_hash(o) for o in bpy.data.objects
           if o.type == 'MESH' and o.name.startswith('Cloth ')}
previous_groups = [g.name for g in body.vertex_groups]
previous_action = rig.animation_data.action if rig.animation_data else None
previous_slot = rig.animation_data.action_slot if rig.animation_data else None

with bpy.data.libraries.load(source_path, link=False) as (source, target):
    assert 'char_female_v3' in source.objects and 'Armature Female' in source.objects
    target.objects = ['char_female_v3', 'Armature Female']
donor_body, donor_rig = target.objects
assert previous_groups == [g.name for g in donor_body.vertex_groups], 'Vertex group ordering differs'
assert [b.name for b in rig.data.bones] == [b.name for b in donor_rig.data.bones], 'Bone order differs'
assert max(abs(rig.matrix_basis[i][j]-donor_rig.matrix_basis[i][j]) for i in range(4) for j in range(4)) < 1e-5, 'Rig transforms differ'
source_mesh_hash = mesh_hash(donor_body)
source_image_hash = image_hash(image_of(donor_body))
old_mesh = body.data
old_mesh.use_fake_user = True
old_mesh.name = 'char_female_v3 before latest body sync'
old_armature = rig.data
old_armature.use_fake_user = True
old_armature.name = 'Armature Female before latest body sync'
body.data = donor_body.data.copy()
body.data.name = 'char_female_v3 synced body'
# The modified head pivots must match the new body; garment objects themselves are untouched.
rig.data = donor_rig.data.copy()
rig.data.name = 'Armature Female synced body'
if rig.animation_data:
    rig.animation_data.action = previous_action
    if previous_slot:
        rig.animation_data.action_slot = previous_slot
assert mesh_hash(body) == source_mesh_hash
assert image_hash(image_of(body)) == source_image_hash
assert mesh_hash(male) == before_male
assert all(mesh_hash(bpy.data.objects[name]) == value for name, value in clothes.items())
assert previous_groups == [g.name for g in body.vertex_groups]
assert max(sum(g.weight > 1e-6 for g in v.groups) for v in body.data.vertices) <= 4
assert max(abs(sum(g.weight for g in v.groups)-1) for v in body.data.vertices) < 1e-5
report = {
    'source': source_path,
    'output': output_path,
    'body_mesh_hash': mesh_hash(body),
    'texture_hash': source_image_hash,
    'rest_height': max(v.co.z for v in body.data.vertices),
    'vertex_group_order_matches': True,
    'rest_skeleton_synced': True,
    'clothes_objects_unchanged': len(clothes),
    'original_male_unchanged': True,
    'clothes_refitting': 'not performed; remains a separate task',
}
for obj in [donor_body, donor_rig]:
    bpy.data.objects.remove(obj, do_unlink=True)
assert not any(o.name.startswith(('TEMP fix67', 'TEMP bodyshape')) for o in bpy.data.objects)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=output_path)
with open(report_path, 'w') as fp:
    json.dump(report, fp, indent=2)
print('FEMALE_CLOTHES_SYNC', json.dumps(report))
