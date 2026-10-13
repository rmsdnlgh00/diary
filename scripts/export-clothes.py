"""Run in Blender with diary_character_clothes.blend open; export the clothes without saving.

The GLB holds the character armature plus every object in the "Clothes | <slot>"
collections (hat, top, bottom, shoes, bag, accessory), named `Cloth <item id>` (extra
parts: `Cloth <item id> <part>`). Tops, bottoms and shoes are skinned to the armature;
hats, hoods, buttons, laces, the backpack and the scarf are parented to a bone.
The body mesh (char1.001) is not exported: the game binds the clothes to the bones of
the character it already loads.
"""
import os
from pathlib import Path
import bpy

repo = Path(os.environ.get("DIARY_REPO_ROOT", "/Users/geun-wiho/github/diary"))
output = repo / "public/assets/characters/male/clothes-v1.glb"
output.parent.mkdir(parents=True, exist_ok=True)
armature = bpy.data.objects["Armature.002"]
SLOTS = ("hat", "top", "bottom", "shoes", "bag", "accessory")
clothes = [o for slot in SLOTS for o in bpy.data.collections[f"Clothes | {slot}"].objects]
selected = list(bpy.context.selected_objects)
active = bpy.context.view_layer.objects.active
hidden = {o.name: o.hide_viewport for o in clothes}
pose = armature.data.pose_position
armature_hidden = armature.hide_get()
try:
    armature.data.pose_position = "REST"
    armature.hide_set(False)  # hidden objects cannot be selected for export
    for o in clothes:
        o.hide_viewport = False
        o.hide_set(False)
    bpy.ops.object.select_all(action="DESELECT")
    for o in [armature, *clothes]:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format="GLB", use_selection=True,
        export_animations=False, export_apply=True, export_skins=True,
        export_cameras=False, export_lights=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12, export_draco_generic_quantization=12,
    )
    print(f"Exported {output} ({output.stat().st_size:,} bytes, {len(clothes)} objects)")
finally:
    armature.data.pose_position = pose
    armature.hide_set(armature_hidden)
    for o in clothes:
        o.hide_viewport = hidden[o.name]
    bpy.ops.object.select_all(action="DESELECT")
    for o in selected:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active
