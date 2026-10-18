"""Run in Blender with a clothes .blend open; export every clothing item to its own GLB, without saving.

Layout (public/assets/clothes, mirrored by src/data/items.ts → clothesFolder):
    <group>/<category folder>/<item id>/<body>.glb
group is `shared` (both bodies can wear it; one fitted GLB per body), or `male` / `female`
for items only that body wears (EXCLUSIVE below). Category folders: hats, tops, bottoms,
shoes, accessories (bag and accessory slots).

The blend holds the armature plus the objects in the "Clothes | <slot>" collections, named
`Cloth <item id>` (extra parts: `Cloth <item id> <part>`). Each GLB carries the armature and
that item's objects. Tops, bottoms and shoes are skinned; hats, hoods, buttons, laces, the
backpack and the scarf hang from a bone. The body mesh is not exported: the game binds the
clothes to the bones of the character it already loads.

    Blender -b ~/male_master_3d/diary_character_clothes.blend --python scripts/export-clothes.py -- male
The last argument is the body the blend is fitted to (default: male). Pass item ids after it
to export only those.
"""
import os
import sys
from pathlib import Path
import bpy

repo = Path(os.environ.get("DIARY_REPO_ROOT", "/Users/geun-wiho/github/diary"))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
body = args[0] if args else "male"
only = set(args[1:])

SLOT_DIRS = {"hat": "hats", "top": "tops", "bottom": "bottoms", "shoes": "shoes", "bag": "accessories", "accessory": "accessories"}
EXCLUSIVE = {}   # item id → "male" / "female"; everything else is shared

ARMATURES = {"male": "Armature.002", "female": "Armature Female"}   # the female working file holds both
armature = bpy.data.objects[ARMATURES[body]]
items = {}   # item id → (slot, [objects])
for slot in SLOT_DIRS:
    collection = bpy.data.collections.get(f"Clothes | {slot}")
    if not collection: continue
    for o in collection.objects:
        if not o.name.startswith("Cloth ") or o.parent is not armature: continue
        item_id = o.name.split(" ")[1]
        items.setdefault(item_id, (slot, []))[1].append(o)

pose = armature.data.pose_position
armature_hidden = armature.hide_get()
state = {o.name: (o.hide_viewport, o.hide_get()) for _, objs in items.values() for o in objs}
try:
    armature.data.pose_position = "REST"
    armature.hide_set(False)  # hidden objects cannot be selected for export
    for item_id, (slot, objects) in sorted(items.items()):
        if only and item_id not in only: continue
        group = EXCLUSIVE.get(item_id, "shared")
        output = repo / "public/assets/clothes" / group / SLOT_DIRS[slot] / item_id / f"{body}.glb"
        output.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.object.select_all(action="DESELECT")
        for o in objects:
            o.hide_viewport = False
            o.hide_set(False)
            o.select_set(True)
        armature.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=str(output), export_format="GLB", use_selection=True,
            export_animations=False, export_apply=True, export_skins=True,
            export_cameras=False, export_lights=False,
            export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
            export_draco_position_quantization=14, export_draco_normal_quantization=10,
            export_draco_texcoord_quantization=12, export_draco_generic_quantization=12,
        )
        print(f"Exported {output.relative_to(repo)} ({output.stat().st_size:,} bytes, {len(objects)} objects)")
finally:
    armature.data.pose_position = pose
    armature.hide_set(armature_hidden)
    for _, objects in items.values():
        for o in objects:
            o.hide_viewport, hidden = state[o.name]
            o.hide_set(hidden)
