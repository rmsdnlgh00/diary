import bpy
from pathlib import Path
root = Path('/Users/geun-wiho/github/diary/diary-character/female-default-20261017')
old_body = bpy.data.objects['char_female_v3']
rig = bpy.data.objects['Armature Female']
collections = list(old_body.users_collection)
with bpy.data.libraries.load(str(root / 'diary_character_female_v3.blend'), link=False) as (src, dst):
    dst.objects = ['char_female_v3', 'Armature Female']
body, donor_rig = dst.objects
rig.data = donor_rig.data.copy()
rig.matrix_world = donor_rig.matrix_world.copy()
bpy.data.objects.remove(old_body, do_unlink=True)
body.name = 'char_female_v3'
body.parent = rig
for mod in body.modifiers:
    if mod.type == 'ARMATURE':
        mod.object = rig
for col in collections:
    col.objects.link(body)
bpy.data.objects.remove(donor_rig, do_unlink=True)
body.hide_render = False
body.hide_viewport = False
body.hide_set(False)
rig.hide_viewport = False
rig.hide_set(False)
bpy.context.view_layer.update()
assert len(body.data.vertices) == 52050
assert all(m.object == rig for m in body.modifiers if m.type == 'ARMATURE')
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'diary_character_clothes_female.blend'))
print('DEFAULT_FEMALE_SYNC_OK', len(body.data.vertices))
