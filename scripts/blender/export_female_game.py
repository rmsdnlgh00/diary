"""Open female_character_game.blend, then run with -- /tmp/female-game-raw.glb.

Exports only the game mesh/rig and two animation tracks. Does not save/change the blend.
Compress the result with scripts/optimize-character-textures.mjs before shipping it.
"""
import sys
import bpy

output, = sys.argv[sys.argv.index('--') + 1:]
body = bpy.data.objects['char_female_game']
rig = bpy.data.objects['Armature Female']
ad = rig.animation_data
previous_action, previous_slot = ad.action, ad.action_slot
tracks = []
try:
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    for obj in (body, rig):
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    for name, action_name, end in [('Walk', 'mixamo.com', 32), ('Idle', 'mixamo.com.002', 299)]:
        action = bpy.data.actions[action_name]
        track = ad.nla_tracks.new()
        track.name = name
        tracks.append(track)
        strip = track.strips.new(name, 1, action)
        strip.action_slot = action.slots[0]
        strip.action_frame_start, strip.action_frame_end = 1, end
    ad.action = None
    bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True)
finally:
    for track in tracks:
        ad.nla_tracks.remove(track)
    ad.action, ad.action_slot = previous_action, previous_slot
