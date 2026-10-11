"""Run in Blender with the village blend open; export the background without saving."""
import os
from pathlib import Path
import bpy

repo = Path(os.environ.get("DIARY_REPO_ROOT", "/Users/geun-wiho/github/diary"))
output = repo / "public/assets/village/diary-village-v4.glb"
output.parent.mkdir(parents=True, exist_ok=True)
original_scene = bpy.context.window.scene
bpy.context.window.scene = bpy.data.scenes["Diary Village V4 | Legacy View"]
selected = list(bpy.context.selected_objects)
active = bpy.context.view_layer.objects.active
try:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.collections["Diary V4 | Legacy View Village"].objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format="GLB", use_selection=True,
        use_active_scene=True, export_animations=False, export_apply=True,
        export_cameras=False, export_lights=False,
    )
    print(f"Exported {output} ({output.stat().st_size:,} bytes)")
finally:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in selected:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.context.window.scene = original_scene
