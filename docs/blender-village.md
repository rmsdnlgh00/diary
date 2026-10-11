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
- Movement stays in an 11 × 13 unit rectangle on the lawn (`VILLAGE_CENTER`), clear of
  the pond, bench, bushes and trees. Ground clicks use camera raycasting.
- Existing monthly diary positions are remapped only in memory. Saved diaries,
  equipment, coins and decorations retain their original format and coordinates.
- Picking a real character opens its existing diary. Click the lawn to move the
  last picked character, today's character, or the first available character.
- The 30-person preview is a static size/layout reference, independent of saves.
- Existing space decoration opens the legacy background. Placed decoration
  assets and clothing overlays have not been converted to 3D.
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
