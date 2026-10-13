"""Run in Blender: render shop icons for every item that has a 3D model.

Opens an empty file, appends the clothes (diary_character_clothes.blend) and the
decorations (diary_village_v4_legacy_view.blend), and renders each item alone on a
transparent background from the game camera's side (front, looking down) into
public/assets/items/<item id>.webp. Nothing is saved; reopen your blend afterwards.
"""
import math
import os
from pathlib import Path
import bpy
from mathutils import Vector

repo = Path(os.environ.get("DIARY_REPO_ROOT", "/Users/geun-wiho/github/diary"))
source = Path.home() / "male_master_3d"
out = repo / "public/assets/items"
out.mkdir(parents=True, exist_ok=True)
SIZE = 256

bpy.ops.wm.read_homefile(use_empty=True)
scene = bpy.context.scene


def append(blend, collections):
    with bpy.data.libraries.load(str(blend), link=False) as (src, dst):
        dst.collections = [c for c in src.collections if c in collections]
        dst.objects = []
    for col in dst.collections:
        scene.collection.children.link(col)
    return dst.collections


append(source / "diary_character_clothes.blend",
       [f"Clothes | {slot}" for slot in ("hat", "top", "bottom", "shoes", "bag", "accessory")])
append(source / "diary_village_v4_legacy_view.blend", ["Diary V4 | Decorations"])
armature = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
if armature:
    if armature.name not in scene.collection.objects:
        scene.collection.objects.link(armature)
    armature.data.pose_position = "POSE"   # idle pose: arms down, like in the village
scene.frame_set(1)

# Soft pastel studio: sky-tinted world light plus a warm key from the front-left.
for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.film_transparent = True
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.quality = 90
scene.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("Icon World")
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.92, 0.95, 1.0, 1)
bg.inputs["Strength"].default_value = 0.6
scene.world = world
sun = bpy.data.objects.new("Icon Sun", bpy.data.lights.new("Icon Sun", "SUN"))
sun.data.energy = 2.7
sun.data.color = (1.0, 0.96, 0.9)
sun.data.angle = math.radians(20)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
scene.collection.objects.link(sun)
cam = bpy.data.objects.new("Icon Camera", bpy.data.cameras.new("Icon Camera"))
cam.data.type = "ORTHO"
scene.collection.objects.link(cam)
scene.camera = cam
VIEW = Vector((0.35, -1.0, 0.62)).normalized()   # game camera: front (-Y) and from above
# Clothes read better from the front, a little above (like a shop window).
CLOTH_VIEW = Vector((0.35, -1.0, 0.22)).normalized()
# Worn on the back: show it from behind.
BACK_VIEW = {"backpack"}

meshes = [o for o in bpy.data.objects if o.type == "MESH"]


def item_of(name):
    for prefix in ("Cloth ", "Deco "):
        if name.startswith(prefix):
            return name[len(prefix):].split(" ")[0]
    return None


items = sorted({item_of(o.name) for o in meshes if item_of(o.name)})
deps = bpy.context.evaluated_depsgraph_get
for item in items:
    parts = [o for o in meshes if item_of(o.name) == item]
    for o in meshes:
        o.hide_render = o not in parts
    bpy.context.view_layer.update()
    pts = []
    dg = deps()
    for o in parts:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        pts += [o.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    centre = (lo + hi) / 2
    radius = (hi - lo).length / 2
    view = CLOTH_VIEW if parts[0].name.startswith("Cloth ") else VIEW
    if item in BACK_VIEW:
        view = Vector((-view.x, -view.y, view.z))
    cam.location = centre + view * radius * 4
    cam.rotation_euler = (-view).to_track_quat("-Z", "Y").to_euler()
    cam.data.clip_end = radius * 10
    # Fit the projected box with a small margin.
    bpy.context.view_layer.update()
    right = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
    up = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
    w = max(abs((p - centre).dot(right)) for p in pts) * 2
    h = max(abs((p - centre).dot(up)) for p in pts) * 2
    cam.data.ortho_scale = max(w, h) * 1.12
    scene.render.filepath = str(out / f"{item}.webp")
    bpy.ops.render.render(write_still=True)
    print("icon", item)
print(f"{len(items)} icons in {out}")
