# Blender village → web game

The default game view loads `public/assets/village/diary-village-v4.glb` in Three.js.
It is a 3D remake of the legacy painted village
(`public/assets/worlds/2026-09/background.webp`, also `assets/references/village_reference.png`):
every object was placed by casting rays from the legacy camera through the painting,
and the materials use colours measured from it (lawn ≈ #C8D078). The asset contains only
the `Diary V4 | Legacy View Village` collection of the `Diary Village V4 | Legacy View`
scene: lawn, stepping stones, pond with duck and lilies, shop stall, house, river,
arch bridge, fences, bench, lamp, notice board, signpost, 29 trees, bushes and rocks.
Preview characters, Blender lights and cameras are not exported.
`diary-village-v2.glb` and `diary-village-v3.glb` are kept but no longer loaded.

The source files remain on the author's Mac:

- `/Users/geun-wiho/male_master_3d/diary_village_v4_legacy_view.blend` (V4)
- `/Users/geun-wiho/male_master_3d/diary_village_v3_space_test.blend` (V2/V3 tests)
- `/Users/geun-wiho/male_master_3d/diary_village_v2.blend`

Run `scripts/export-village.py` inside Blender to update the public GLB. Point
`DIARY_REPO_ROOT` at another checkout if needed. The script does not save the blend.

## Runtime behaviour

- Same 16:9 stage and view as the legacy village: a perspective camera with a 28°
  pitch and 20° vertical FOV, where the 1.7-unit character is about 8% of the frame
  height. "마을 전체" is exactly the legacy view; "기본 시점" and "따라가기" keep the same
  angle at 0.62× and 0.45× of the distance (`VILLAGE_VIEW_DISTANCE`).
- Blender coordinates `(x, y, z)` become glTF `(x, z, -y)`.
- World coordinates 0–1 span the painted lawn (18 × 22.5 units around `VILLAGE_CENTER`).
  Movement follows the lawn's shape through nine touching rectangles
  (`VILLAGE_WALKABLE_AREAS`, ≈ 277 m²) measured in Blender: 0.6 units clear of the pond,
  bench, bushes, fences and trees, and kept above the bottom menu. Walks stop at the
  furthest reachable point, and saved positions that land off the lawn are moved to
  the nearest lawn point in memory only. Ground clicks use camera raycasting.
- Existing monthly diary positions are remapped only in memory. Saved diaries,
  equipment, coins and decorations retain their original format and coordinates.
- Picking a real character opens its existing diary. Click the lawn to move the
  last picked character, today's character, or the first available character.
- The 30-person preview is a static size/layout reference, independent of saves.
- Existing space decoration opens the legacy background. Placed decoration
  assets and clothing overlays have not been converted to 3D.
- The GLB is Draco-compressed (about 1.4 MB instead of 10 MB). `GLTFLoader` decodes it
  with the WASM decoder copied to `public/draco/` from `three/examples/jsm/libs/draco/gltf`.
- Rendering quality: on desktop an `EffectComposer` adds 4× MSAA and GTAO ambient
  occlusion, with a 4096 shadow map. Touch devices and screens under 600 px use the
  low-power path: direct rendering and a 2048 shadow map. Both use a light distance haze
  (`HAZE`) so only the far trees and sea fade a little.
- Water: the pond (rebuilt as rings) and the river carry a "Water Depth" colour attribute
  (0 at the shore → 1 in the middle), exported with `export_vertex_color="ACTIVE"`. In the
  game `makeWater` replaces the `V4 water`/`V4 sea` materials: shallow aqua to base blue,
  a foam line, drifting ripples and sun glints. Other parts ignore those vertex colours.
- Characters in the 3D village use light copies made in Blender:
  `character-walk-light.glb` (9.4k instead of 31k triangles, JPEG texture, Draco, 0.8 MB
  instead of 7.8 MB) and `character-idle-anim.glb` (only the idle animation is used,
  1.1 MB instead of 9.5 MB). Bone names, animation tracks and durations match the
  originals, which the legacy village still uses.
- Decorations: `public/assets/village/decorations-v1.glb` (79 KB, Draco) holds one model
  per shop decoration, named `Deco <item id>` (flower pot, picnic mat, small lamp, flower
  bed, chair, sign, plant). They come from the `Diary V4 | Decorations` collection in the
  `Diary Decorations V4` scene, scaled 1.3–1.5× to match the village props. Saved
  decorations keep their legacy coordinates; `fromLegacyPoint` maps them onto the lawn
  (`toLegacyPoint` is the inverse) and `VillageStage` shows them as 3D clones.
- Decorating happens in the 3D village (the legacy view keeps its own 2D editor). While
  placing, a translucent ghost follows the pointer, green when `canPlaceInVillage` allows
  it: the whole footprint (`DECORATION_RADIUS`) on the lawn areas, clear of the stepping
  stones (`VILLAGE_STEPPING_STONES`), other decorations and standing characters. The
  store's `placeAt` takes that check and saves legacy coordinates (`toLegacyPoint`).
  Tapping a decoration selects it (orange ring) for moving or recalling. Placed
  decorations become blocked squares in `villageWorld`, so characters walk around them.
- V4 uses flat base colours only, so glTF matches Blender's material colours.
  The web lighting is recreated in Three.js. Flat parts (ground, sea, river, paths,
  pond, stepping stones, lawn flowers) receive shadows but do not cast them.

## Verification and deployment

```sh
npm run build
npm run check:village
npm run check:game
```

Browser checks use a separate headless Chrome profile and temporary screenshots.
They isolate external Google font requests; local assets and app errors remain checked.

`vercel.json` selects Vite, `npm run build`, and `dist`. Vercel account/project
metadata belongs in ignored `.vercel/`, never in Git. `.blend` files are authoring
assets and are not needed by the browser.
