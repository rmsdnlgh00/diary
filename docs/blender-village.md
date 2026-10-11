# Blender village → web game

The default game view loads `public/assets/village/diary-village-v3.glb` in Three.js.
The asset contains only the `Diary V3 | Full Frame Village` collection from the
`Diary Test | Spread` scene. It fills the whole overview frame (about 34 × 92 units)
in the style of `assets/references/village_reference.png`: a clear lawn for 30
characters with stepping stones, a pond, a shop stall, a river with an arch bridge,
a house, fences, benches, 95 independent trees, flower bushes, rocks and the sea.
In that scene the old `Diary V2 | Terrain Trees Water` collection is only excluded
from the view layer; other scenes still use it. `diary-village-v2.glb` is kept but
no longer loaded. Test characters and Blender lights/cameras are not exported.

The source files remain on the author's Mac:

- `/Users/geun-wiho/male_master_3d/diary_village_v2.blend`
- `/Users/geun-wiho/male_master_3d/diary_village_v3_space_test.blend`

Run `scripts/export-village.py` inside Blender to update the public GLB. Point
`DIARY_REPO_ROOT` at another checkout if needed. The script does not save the blend.

## Runtime behaviour

- Portrait stage: 9:19.5. Orthographic cameras use a 74-unit overview and a
  15.05-unit basic/follow view. The animated character is normalized to 1.7 units.
- Blender coordinates `(x, y, z)` become glTF `(x, z, -y)`.
- Movement stays in a clear rectangle within the perimeter trees and pond.
  Ground clicks use camera raycasting, not screen percentages.
- Existing monthly diary positions are remapped only in memory. Saved diaries,
  equipment, coins and decorations retain their original format and coordinates.
- Picking a real character opens its existing diary. Click the lawn to move the
  last picked character, today's character, or the first available character.
- The 30-person preview is a static size/layout reference, independent of saves.
- Existing space decoration opens the legacy background. Placed decoration
  assets and clothing overlays have not been converted to 3D.
- V3 uses flat base colours only, so glTF matches Blender's material colours.
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
