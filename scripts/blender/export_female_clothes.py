"""Export fitted female clothes only, without changing/saving the source blend.

Open diary-character/diary_character_clothes_female.blend; args: -- output.glb
"""
import sys
import bpy

output, = sys.argv[sys.argv.index('--') + 1:]
rig = bpy.data.objects['Armature Female']
clothes = [o for o in bpy.data.objects if o.name.startswith('Cloth ')]
selected = list(bpy.context.selected_objects)
active = bpy.context.view_layer.objects.active
hidden = {o: (o.hide_viewport, o.hide_get()) for o in [rig, *clothes]}
pose = rig.data.pose_position
try:
    rig.data.pose_position = 'REST'
    for o in [rig, *clothes]:
        o.hide_viewport = False
        o.hide_set(False)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [rig, *clothes]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True,
        export_animations=False, export_apply=True, export_skins=True,
        export_cameras=False, export_lights=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12, export_draco_generic_quantization=12)
finally:
    rig.data.pose_position = pose
    for o, (viewport, hidden_set) in hidden.items():
        o.hide_viewport = viewport
        o.hide_set(hidden_set)
    bpy.ops.object.select_all(action='DESELECT')
    for o in selected:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active
