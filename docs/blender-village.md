# Blender village → web game

The default game view loads `public/assets/village/diary-village-v2.glb` in Three.js.
The asset contains only the `Diary Village V2` terrain collection: the meadow,
36 independent trees, a small pond, 14 independent shore rocks, and a backdrop.
Original scenes, test characters and Blender lights/cameras are not exported.

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
- Blender's procedural grass colour variation is not included in glTF; the web
  version uses its pastel base colour. The web lighting is recreated in Three.js.

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
