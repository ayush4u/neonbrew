# src/look — mesh name contract

`applyLook(scene)` assigns materials by mesh `name` (first match wins). No `island-world`
branch existed when the interior look was added, so these prefixes are the contract.

## Exterior
| name | material |
|---|---|
| `ground` | island toon (object space, centred on mesh origin, shore at `islandRadius`): noise grass patches + tufts, sand ripples, wet shoreline band, wobbly edges |
| `water` | toon water |
| `sign` | glowing pink neon "NEON BREW" + coffee-cup tubes on a dark plum backing (CanvasTexture, any 0..1 plane/box UVs; tubes >1.0 bloom) |
| `palm_*` | palm sway |
| `lights_*` | string lights (twinkle, emissive) |
| `window_*` | flat warm emissive window |
| `awning` | striped canopy |
| `path_stone_*` | warm grey-beige toon stepping stones |
| `rock_*` | soft rounded grey-beige toon rocks |
| `plant_*` | fresh green toon, gentle sway (bends more with object-space height; origin at the base) |

## Interior (`interior.js`)
| prefix | material |
|---|---|
| `glass_*` | window glass: near-clear, warm sunset fresnel at grazing angles, transparent (renderOrder 10) |
| `lamp_bulb*` (e.g. `lamp_bulb_0..2`) | emissive amber bulb (>1.0 → gentle bloom); **world position also drives a fake point light** (max 4) |
| `lamp_shade*` | peach toon shade, glowing warm inside (DoubleSide; use open-bottom geometry) |
| `lamp_*` (other: cord, cap) | warm wood toon |
| `neon_wall*` | tube geometry: soft pink wall neon, slow breathe + rare dips. Flat `Plane`/`Shape`/`Box` geometry: gets the NEON BREW text board (same as `sign`) |
| `wall_*` | cream interior toon |
| `ceiling*` | warm cream toon (prefix: `ceiling_vault` etc. match) |
| `floor*` | light warm wood toon |
| `counter_top*` | light warm wood |
| `counter_panel*` | pastel pink |
| `counter_*` (other) | light warm wood |
| `stool_seat*` | pastel pink |
| `stool_*` (other) | light warm wood |
| `shelf_*`, `table_*` | lighter wood |
| `chair_patio*` | cream-coral `#f4a088` matching patio umbrellas (matched before `chair_*`) |
| `chair_*` | pastel pink |

### Lighting / AO
- No three.js lights: up to 4 fake point lights (from `lamp_bulb*` positions, radius 3.6) are
  evaluated in the interior toon shader → mobile friendly, no extra passes.
- Fake AO: the room box is the union of `floor*` + `ceiling*` bounds **in their parent's local
  frame** (so rotated buildings work). Surfaces darken toward walls, floor and ceiling; faces
  outside that box get no AO and a flat warm exterior tone instead.
  Keep `floor*`/`ceiling*` as children of the building group.
- Toon bands are smooth (fwidth-antialiased), interior surfaces clamp < 1.0 so only bulbs/neon bloom.

## Preview
`look-preview.html?shot=interior` frames the interior blockout (`preview-interior.js`) through its arch.
