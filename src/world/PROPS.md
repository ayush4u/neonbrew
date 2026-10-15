# World prop mesh names (for the look layer)

Kept for src/look: `ground`, `water`, `sign`, `awning`, `palm_0..3`, `lights_*`,
`window_0..3` (glowing arched window frames: 0/1 front, 2/3 side walls).

Interior contract names (look/README): `glass_front_0/1`, `glass_side_0/1` (panes in the arched openings),
`lamp_bulb_0..2`, `lamp_shade_0..2`, `lamp_cord_0..2`, `neon_wall_heart`, `neon_wall_cup`, `neon_wall_cup_handle`,
`neon_wall_steam_0..2`, `wall_front`, `wall_left`, `wall_right`, `wall_back`, `wall_inner_back`, `wall_gable_front`,
`wall_gable_back`, `ceiling_vault`, `floor` (floor + ceiling_vault are direct children of group `cafe`),
`counter_body`, `counter_top`, `counter_kick`, `counter_panel_0..10`, `stool_seat_0..3`, `stool_leg_0..3` (GLB),
`shelf_{0,1}_{0,1}`, `table_cafe_0/1`, `table_patio_0/1` (GLB), `chair_cafe_{0,1}_{0,1}`, `chair_patio_{0,1}_{0,1}` (GLB).

Other new props (own colours, no look rule needed):
- shell/trim: `cafe_tiles` (checker floor texture, above `floor`), `cafe_wainscot_back`, `cafe_roof`, `roof_trim_0..16`,
  `roof_finial`, `door_frame`, `sill_0..3`, `planter_0/1`, `flower_{0,1}_{0..4}`, `awning_scallop_0..13`, `cafe_base`
- counter: `espresso_body/top/tray/base/gauge`, `espresso_head_0/1`, `espresso_handle_0/1`, `espresso_warmcup_0..3`,
  `espresso_cup_0`, `blender_*`, `cake_stand_foot`, `cake_stand_plate`, `cake`, `register`, `register_screen`,
  `pastry_case_base/top/glass/shelf`, `pastry_<croissant|donut_sprinkles|cupcake|muffin>_*`, `pastry_cookie`
- wall: `menu_board`, `menu_frame`, `mug_shelf_*`, `plant_shelf_0_*`
- seating/decor: `cup_cafe_0/1`, `cup_patio_0/1`, `sill_plant_0/1_*`, `cafe_plant_0/1_*`, `door_plant_0/1_*`, `cafe_rug_*`,
  `umb_pole_0/1`, `umbrella_0/1` (vertex-colour stripes), `umbrella_finial_0/1`, `chalkboard_aframe_0/1`
- nature: `path_stone_*`, `rock_*`, `shell_*`, `plant_bush_*`, `plant_bush_flower_*`, `plant_flower_*`, `plant_flower_stem_*`, `plant_grass_*`
- dock: `plank_*`, `post_*`, `dock_post_cap_*`, `dock_rope_{0,1}_{0,1}`, `dock_buoy`, `dock_buoy_stripe_0..3`, `dock_lantern`

GLB meshes with several primitives get `<name>_<k>` unless renamed via `parts`. Full runtime list: `island.propNames`
(also `window.__nbProps` in the preview) once `island.ready` resolves.
