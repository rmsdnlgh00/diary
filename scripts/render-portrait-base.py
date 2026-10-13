"""Run in Blender: render the character's head for the mood portraits.

Opens an empty file, appends the character (char1.001 and its armature) from
diary_character_clothes.blend, poses it at frame 1 of the idle animation and renders the
head and shoulders from the front (orthographic, 1024 px, transparent) into
assets/portraits/base.png, and the same view unlit into base-flat.png.
scripts/make-portraits.py then draws the six faces.
Nothing is saved; reopen your blend afterwards.
"""
import math
import os
from pathlib import Path
import bpy
from mathutils import Vector

repo = Path(os.environ.get("DIARY_REPO_ROOT", "/Users/geun-wiho/github/diary"))
source = Path.home() / "male_master_3d/diary_character_clothes.blend"
output = repo / "assets/portraits/base.png"
output.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_homefile(use_empty=True)
scene = bpy.context.scene
with bpy.data.libraries.load(str(source), link=False) as (src, dst):
    dst.objects = [name for name in src.objects if name in ("char1.001", "Armature.002")]
for obj in dst.objects:
    scene.collection.objects.link(obj)
bpy.data.objects["Armature.002"].data.pose_position = "POSE"
scene.frame_set(1)

for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
scene.render.resolution_x = scene.render.resolution_y = 1024
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("Portrait World")
world.use_nodes = True
background = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
background.inputs["Color"].default_value = (0.92, 0.95, 1.0, 1)
background.inputs["Strength"].default_value = 0.55
scene.world = world
sun = bpy.data.objects.new("Portrait Sun", bpy.data.lights.new("Portrait Sun", "SUN"))
sun.data.energy = 2.1
sun.data.color = (1.0, 0.96, 0.9)
sun.data.angle = math.radians(25)
sun.rotation_euler = (math.radians(55), 0, math.radians(-25))
scene.collection.objects.link(sun)
camera = bpy.data.objects.new("Portrait Camera", bpy.data.cameras.new("Portrait Camera"))
camera.data.type = "ORTHO"
camera.data.ortho_scale = 88
camera.data.clip_end = 1000
scene.collection.objects.link(camera)
scene.camera = camera
view = Vector((0.12, -1.0, 0.1)).normalized()   # the face looks down -Y; a little from the right
camera.location = Vector((0.5, 0, 129)) + view * 300
camera.rotation_euler = (-view).to_track_quat("-Z", "Y").to_euler()
scene.render.filepath = str(output)
bpy.ops.render.render(write_still=True)
print(f"Rendered {output}")

# The same view unlit (texture colours only), for baking the village faces.
if __name__ == "__main__":
    tree = bpy.data.objects["char1.001"].data.materials[0].node_tree
    texture = next(n for n in tree.nodes if n.type == "TEX_IMAGE")
    emission = tree.nodes.new("ShaderNodeEmission")
    tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    tree.links.new(emission.outputs["Emission"], next(n for n in tree.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
    scene.render.filepath = str(output.with_name("base-flat.png"))
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {scene.render.filepath}")
