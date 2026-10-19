"""Export the arrival dock and boat from diary-village/arrival_dock_boat.blend.

  blender diary-village/arrival_dock_boat.blend --background --python scripts/blender/export_arrival.py

- dock.glb keeps its place in the village (same coordinates as diary-village-v4.glb, metres),
  so the game adds it to the scene as is.
- boat.glb is centred on the origin at the waterline, bow towards -Z in glTF (+Y in Blender).
  Its sail uses the material "Boat sail", which the game tints with the day's mood.
"""
import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'village', 'arrival')
os.makedirs(OUT, exist_ok=True)


def export(objects, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.hide_set(False)
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True,
        export_draco_mesh_compression_enable=True, export_materials='EXPORT',
        export_cameras=False, export_lights=False, export_animations=False)
    print('exported', path, os.path.getsize(path), 'bytes')


dock = [o for o in bpy.data.collections['Dock'].objects]
export(dock, os.path.join(OUT, 'dock.glb'))

boat_root = bpy.data.objects['Arrival boat']
saved = boat_root.matrix_world.copy()
boat_root.location = (0, 0, 0)
boat_root.rotation_euler = (0, 0, 0)
bpy.context.view_layer.update()
try:
    export([boat_root, *boat_root.children_recursive], os.path.join(OUT, 'boat.glb'))
finally:
    boat_root.matrix_world = saved
