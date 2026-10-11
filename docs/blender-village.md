# Blender village → web game

The default game view loads `public/assets/village/diary-village-v4.glb` in Three.js.
It is a 3D remake of the legacy painted village
(`public/assets/worlds/2026-09/background.webp`, also `assets/references/village_reference.png`):
every object was placed by casting rays from the legacy camera through the painting,
and the materials use colours measured from it (lawn ≈ #C8D078). The asset contains only
the `Diary V4 | Legacy View Village` collection of the `Diary Village V4 | Legacy View`
scene: one rounded island with an open lawn, pond with a swimming duck and three lily pads, shop stall, house, river,
arch bridge, fences, lamp, notice board, signpost, 29 trees, bushes, reeds and rocks.
The painted bench is now the "긴 벤치" decoration, and the scattered small flowers were removed.
Preview characters, Blender lights and cameras are not exported.
Older village GLBs (v2, v3) were removed; git history still has them.

The source files remain on the author's Mac:

- `/Users/geun-wiho/male_master_3d/diary_village_v4_legacy_view.blend` (V4)
- `/Users/geun-wiho/male_master_3d/diary_village_v3_space_test.blend` (V2/V3 tests)
- `/Users/geun-wiho/male_master_3d/diary_village_v2.blend`

Run `scripts/export-village.py` inside Blender to update the public GLB. Point
`DIARY_REPO_ROOT` at another checkout if needed. The script does not save the blend.

## Runtime behaviour

- Same angle as the legacy village: a perspective camera with a 28° pitch and 20°
  vertical FOV. The map was widened 1.35× around the lawn in Blender (surroundings
  pushed out, river/paths/island scaled), and the whole-village camera sits 1.3× further
  back, so the 1.7-unit character is about 6% of the frame height there. "기본 시점" and
  "따라가기" keep their earlier close-ups at 0.48× and 0.35× (`VILLAGE_VIEW_DISTANCE`).
- Blender coordinates `(x, y, z)` become glTF `(x, z, -y)`.
- World coordinates 0–1 span the lawn (25.5 × 32 units around `VILLAGE_CENTER`). The
  island was tidied for player decorating: the ground is one rounded island with cliffs
  (the river runs through its right side to the sea at both ends), and the stepping
  stones, lawn trees, flower islands and inner bushes were removed. Movement and
  placement use eight touching rectangles (`VILLAGE_WALKABLE_AREAS`, ≈ 650 m², one of
  them 15 × 28 units) measured in Blender: 3 units inside the coast, 0.6 units clear of
  ground-level obstacles and on screen in the whole-village view.
- Characters spread over the wide lawn: they wander up to `wanderRadius` (0.2 of the
  width, ≈ 5 units) from home, and with `roamChance` (30 %) an idle character walks
  anywhere on the lawn via pathfinding and makes that spot its new home. Every step is
  checked; if separation nudged someone off the path, they re-plan from where they are. Saved positions that land off the
  lawn are moved to the nearest lawn point in memory only. Ground clicks use camera
  raycasting.
- Pathfinding (`src/systems/pathSystem.ts`, both villages): when the straight line to a
  clicked point is blocked, A* on a grid of ~0.2-unit cells (built once per world, so
  again only after decorations change) finds a way around ponds, fences and decorations,
  then keeps only the corner waypoints. Unreachable targets resolve to the nearest
  walkable spot. Agents chain the waypoints without stopping; slowing down uses the
  distance left to the final point. Wandering stays straight and short.
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
- Decorations: `public/assets/village/decorations-v1.glb` (118 KB, Draco) holds one model
  per shop decoration, named `Deco <item id>` (flower pot, picnic mat, small lamp, flower
  bed, chair, long bench, sign, plant, fountain, bicycle, floor tile). The fountain's two water discs carry their own "Water Depth"
  colours and get `makeWater` in fountain mode (finer ripples plus rings spreading from the
  middle). Its falling water is two open lathe meshes with the `V4 fountain fall` material:
  a curtain over the upper bowl's rim and an umbrella jet from the top ornament. Their UV
  v runs along the flow in metres, and `makeFall` scrolls bright threads along it, so the
  water pours down. To add flowing water elsewhere, model a thin open surface, unwrap it
  so v follows the flow, and give it that material. They come from the `Diary V4 | Decorations` collection in the
  `Diary Decorations V4` scene, scaled 1.3–1.5× to match the village props. Saved
  decorations keep their legacy coordinates; `fromLegacyPoint` maps them onto the lawn
  (`toLegacyPoint` is the inverse) and `VillageStage` shows them as 3D clones.
- Decorating happens in the 3D village (the legacy view keeps its own 2D editor). While
  placing, a translucent ghost follows the pointer, green when `canPlaceInVillage` allows
  it: the whole footprint (`DECORATION_RADIUS`) on the lawn areas, clear of other
  decorations and standing characters. The
  store's `placeAt` takes that check and saves legacy coordinates (`toLegacyPoint`).
  While placing or dragging, a graph-paper grid (`makePlacementGrid`, one shader plane)
  fades in over the placeable lawn: 2-unit lines matching the floor-tile grid, fainter
  1-unit lines, a light outline around the area, and red footprints of what the item
  must keep clear of (tiles for tiles, other decorations otherwise).
  Tapping a decoration selects it (orange ring) for moving or recalling. Placed
  decorations become blocked squares in `villageWorld`, so characters walk around them.
- Floor tiles (`floor: true`, `stackable: true` in `items.ts`): bought once, laid many
  times. `snapDecoration` snaps them to a 2-unit grid around `VILLAGE_CENTER` so
  neighbours touch; the whole 2 × 2 square must be on the lawn and must not overlap
  another tile. Tiles are not blocked areas (characters walk over them), other
  decorations ignore them (a chair can stand on one), and the place tool stays active
  after each tile. They receive shadows but do not cast them.
- The duck is its own object (`V4 Duck`) so the game can animate it: it swims a slow,
  wobbly loop around the pond centre (`DUCK_POND`, about a minute per lap), faces where
  it goes, bobs, and leaves ripple rings. The game lifts it out of the cm-scaled village
  group into world units. The pond keeps three lily pads near the front shore.
- Lawn: `makeLawn` replaces the `V4 grass` material in the game with painted patches
  (sunny yellow-green and calmer green from world-position noise), a faint grain, and a
  slightly deeper green away from the lawn centre. Blender keeps the flat base colour.
- V4 uses flat base colours only, so glTF matches Blender's material colours.
  The web lighting is recreated in Three.js. Flat parts (ground, sea, river, paths,
  pond) receive shadows but do not cast them.

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
