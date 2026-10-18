"""Background, on ~/male_master_3d/diary_character_clothes.blend: copy one tidied item from the comparison
male in the female working file. The skinned main piece swaps its mesh (weights come with it, materials
stay the male file's); rigid pieces (buttons, hood, strings…) take the same vertex positions in world space.
char1.001 is never touched. Pass the item id after --."""
import sys
import bpy
from mathutils import Vector

import os
from pathlib import Path
REPO = Path(os.environ.get("DIARY_REPO_ROOT", Path(__file__).resolve().parents[3]))
SOURCE = str(REPO / "diary-character/diary_character_clothes_female.blend")
item = sys.argv[sys.argv.index("--") + 1]
names = [n for n in bpy.data.objects.keys() if n == f"Cloth {item}" or n.startswith(f"Cloth {item} ")]
with bpy.data.libraries.load(SOURCE, link=False) as (src, dst):
    dst.objects = ["Comparison male rig | striped tee"] + [f"Comparison male | {n}" for n in names]
rig_src, *pieces = dst.objects
bpy.context.scene.collection.objects.link(rig_src)
for p in pieces: bpy.context.scene.collection.objects.link(p)
rig = bpy.data.objects["Armature.002"]
for r in (rig, rig_src): r.data.pose_position = "REST"
bpy.context.view_layer.update()
off = Vector((rig_src.matrix_world.translation.x, 0, 0))
for name, s in zip(names, pieces):
    t = bpy.data.objects[name]
    if any(m.type == "ARMATURE" for m in t.modifiers):
        old = t.data; mesh = s.data.copy()
        mesh.materials.clear()
        for m in old.materials: mesh.materials.append(m)
        t.data = mesh; nm = old.name; bpy.data.meshes.remove(old); mesh.name = nm
        print("mesh swapped", name, len(mesh.vertices))
    else:
        world = [s.matrix_world @ v.co - off for v in s.data.vertices]
        assert len(world) == len(t.data.vertices), name
        inv = t.matrix_world.inverted()
        for v, p in zip(t.data.vertices, world): v.co = inv @ p
        t.data.update()
        print("rigid moved", name)
for o in [rig_src, *pieces]: bpy.data.objects.remove(o)
rig.data.pose_position = "POSE"
assert bpy.data.objects["char1.001"].data.name == "char1.001"
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_mainfile(); print("saved", bpy.data.filepath)
