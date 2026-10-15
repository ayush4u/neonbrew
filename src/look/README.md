# src/look — mesh name contract

`applyLook(scene)` assigns materials by mesh `name` (first match wins). No `island-world`
branch existed when the interior look was added, so these prefixes are the contract.

## Exterior
| name | material |
|---|---|
| `ground` | sand/grass toon |
| `water` | toon water |
| `sign` | exterior neon sign |
| `palm_*` | palm sway |
| `lights_*` | string lights (twinkle, emissive) |
| `window_*` | flat warm emissive window |
| `awning` | striped canopy |

## Interior (`interior.js`)
| prefix | material |
|---|---|
| `glass_*` | window glass: near-clear, warm sunset fresnel at grazing angles, transparent (renderOrder 10) |
| `lamp_bulb*` | emissive amber bulb (>1.0 → gentle bloom); **world position also drives a fake point light** (max 4) |
| `lamp_shade*` | peach toon shade, glowing warm inside (DoubleSide; use open-bottom geometry) |
| `lamp_*` (other: cord, cap) | warm wood toon |
| `neon_wall*` | soft pink wall neon, slow breathe + rare short dips |
| `wall_*` | cream interior toon |
| `ceiling*` | warm cream toon |
| `floor*` | light warm wood toon |
| `counter_top*` | light warm wood |
| `counter_panel*` | pastel pink |
| `counter_*` (other) | light warm wood |
| `stool_seat*` | pastel pink |
| `stool_*` (other) | light warm wood |
| `shelf_*`, `table_*` | lighter wood |
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
