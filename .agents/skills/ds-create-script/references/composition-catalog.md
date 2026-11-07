# Firework Composition Catalog & Taxonomy Reference

All firework shells in the system strictly adhere to the Component-based Composition Architecture:
- **Shape**: Spatial geometry of burning stars at burst birth ($t = 0$).
- **Dynamics**: Kinematic motion, air drag, drooping, and drift ($t > 0$).
- **Active Effects**: Stackable optical modifiers (strobes, crackles, ghosts, splits).
- **Preset**: Preconfigured composition template combining a base shape, dynamics, and effects.

---

## 1. Canonical Preset Directory (71 Presets)

All preset keys must be written in lowercase `snake_case`.

### Classical Spherical & Peony Shells
- `crysanthemum`: Classical spherical burst with lingering charcoal golden spark trail.
- `crysanthemum_v2`: High-velocity spherical burst with dual-layer spark dispersion.
- `crysanthemum_uniform_sphere`: Perfectly uniform star distribution on a Fibonacci sphere.
- `crysanthemum_smoke`: Spherical burst accompanied by dense lingering atmospheric smoke puffs.
- `crysanthemum_spiral`: Spherical star cluster with radial spiral angular velocity.
- `crysanthemum_spiral_v2`: Dual counter-rotating spiral star streams.
- `crysanthemum_cc`: Color-changing spherical stars that shift hue during burnout.
- `crysanthemum_nested`: Concentric dual-shell burst (outer chrysanthemum, inner pistil).
- `chrysanthemum_tadpole_burst`: Large chrysanthemum explosion with arrow-spark comets.
- `crysanthemum_sphere_rings`: Spherical core surrounded by nested equatorial Saturn rings.
- `sphere_rings_cascade`: Stepped cascading ring bursts.
- `sphere_rings_strobe`: Multi-ring explosion with pulsating white strobe stars.
- `egg_crysanthemum`: Elongated vertical oval / egg-shaped pyrotechnic burst.

### Optical & Scintillation Shells
- `strobe`: Rhythmic pulsating strobe flashing stars.
- `white_strobe`: Intense bright white high-frequency strobe.
- `glitter_strobe`: Golden shimmering starlight with trailing micro-flashes.
- `strobe_dying_embers`: Lingering slow-falling dark orange glowing dying coals.
- `strobe_breathing_pulse`: Smoothly undulating breathing brightness modulation.
- `glitter_diamond_scintillation`: Sharp diamond-like optical twinkle effect.
- `crackle`: Energetic micro-detonations creating crackling audibles and flash bursts.
- `sparking`: Crisp bright metallic spark sparks.
- `sparking_v2`: High-density metallic titanium spark streams.
- `rumble`: Low-frequency rumbling heavy acoustic star explosion.

### Lingering Willow & Kamuro Embers
- `weeping_willow_comets`: Heavy golden comets drooping in deep downward arches.
- `weeping_willow_comets_v2`: Extended burn willow comets reaching close to water level.
- `weeping_willow_comets_v3`: Ultra-dense golden rain cascading curtain.
- `weeping_willow_arch`: Broad sweeping parabolic willow branches.
- `falling_leaves`: Drifting floating ember stars fluttering like autumn leaves.
- `falling_comets`: Slender comets trailing gentle burning streamers.
- `horsetail_waterfall`: Vertical drooping horsetail waterfall cascade falling from apex.
- `ghost`: Stars that temporarily dim to invisible darkness then flare back to full luminance.
- `ghost_kamuro`: Kamuro golden rain that vanishes in mid-flight and suddenly flashes bright before burnout.

### Geometric & Novelty Shapes
- `ring`: Single crisp circular ring of pyrotechnic stars.
- `ring_v2`: Dual-color reinforced circular ring shell.
- `ring_comet`: Thin circular ring formed by high-speed streaming comets.
- `oval`: Elliptical ring shell oriented along the viewing axis.
- `heart`: Planar heart contour shape facing the audience.
- `star`: Five-pointed geometric star contour in sky.
- `cat`: Cat head outline complete with pointed ears.
- `flower`: Multi-petal floral flower pattern in sky.
- `floral`: Multi-cluster blossom arrangement.
- `smiley`: Classic smiling face contour in sky.
- `fish`: Swimming fish silhouette contour with tail flick.
- `fish_v2`: Dual schooling fish trajectories.
- `fish_v3`: Darting school of pyrotechnic fish embers.
- `wave`: Ocean wave undulating sinusoidal pattern.
- `snow`: Gentle falling white crystal embers simulating snow flurry.
- `text_word`: Planar typographic word spelled in sky stars (customized via `textWord`).

### Comet Streams & Mines
- `comet_single`: Single thick luminous rising beam with dense trailing sparks.
- `comet_cluster`: Cluster of simultaneous rising comets.
- `comet_cluster_notrail`: Crisp clean beam cluster without trailing spark wake.
- `comet_cluster_cc`: Color-changing comet beam cluster.
- `comet_cluster_thick`: Heavy luminous comets with massive spark tails.
- `comet_cluster_detached`: Space-aged comets with detached trailing spark segments.
- `comet_cluster_cascade`: Staggered launch comet cascade.
- `comet_tadpole_burst`: Comets with bulbous head, corkscrew spiral, and apex flurry.
- `sparkling_comet`: Rising comet trail emitting micro-burst sparkles.
- `sparkling_comet_branches`: Branching comet streams splitting outward like tree limbs.
- `bouquet`: Low-level ground mine bouquet exploding outward from the barge.
- `bouquet_v2`: High-density multi-angle bouquet mine.
- `bouquet_v2_multicolor`: Multi-chromatic bouquet mine.
- `bouquet_comet`: Bouquet mine launching secondary ascending comets.
- `bouquet_comet_sphere`: Ground bouquet launching into an aerial spherical burst.

### Multi-Stage & Advanced Splitting Shells
- `crossette`: Stars that split cleanly into four perpendicular secondary darts (+).
- `double_helix`: Dual intertwining DNA-like helical particle streams.
- `galaxy`: Spiral galaxy arms rotating outward with floating nebular core.
- `half_flash`: Asymmetric hemisphere burst flashing brightly on one side.
- `split_flash`: Dual-hemisphere split burst flashing contrasting colors.
- `sphere_erratic_dart`: Spherical burst where stars suddenly deflect at sharp erratic angles.
- `multi_nested`: Multi-stage nested aerial shell triggering sequenced secondary explosions.

---

## 2. Supported Burst Shapes (`AVAILABLE_SHAPES`)

Determines star geometry at explosion moment ($t = 0$):

| Shape Key | Description |
|---|---|
| `sphere` | Standard uniform spherical star shell. |
| `sphere_uniform` | Mathematical Fibonacci uniform sphere distribution. |
| `ring` | Circular planar ring contour. |
| `heart` | Upright planar heart geometry facing the viewer. |
| `star` | Five-pointed planar star geometry. |
| `fish` | Aerodynamic fish profile with tail fin. |
| `cat` | Cat silhouette with upright ears. |
| `flower` | Multi-petaled floral bloom geometry. |
| `smiley` | Smiling face contour with eyes and smile arc. |
| `galaxy` | Multi-arm logarithmic spiral disc. |
| `oval` | Flattened elliptical disc geometry. |
| `half-flash` | Upper or lower hemisphere single flash shield. |
| `split-flash` | Bi-sected opposing hemisphere flash. |
| `double-helix` | Twin intertwined helical ribbons. |
| `sparkling-branches`| Radial tree-branching star vectors. |
| `sphere_rings` | Central spherical star core enclosed in equatorial rings. |
| `egg` | Vertically stretched oval egg contour. |
| `horsetail` | Compact upward apex bunch drooping into long vertical streams. |
| `text_word` | Planar typographic alphabet letters and word contours. |
| `upward-spray` | 180-degree upper hemisphere fountain spray. |

---

## 3. Supported Particle Dynamics (`AVAILABLE_DYNAMICS`)

Determines particle drag, gravity, drooping, and lifetime kinematics ($t > 0$):

| Dynamics Key | Pyrotechnic Behavior |
|---|---|
| `standard` | Standard balanced air drag and gentle gravity drop. |
| `willow` | Ultra-low air drag on lingering charcoal/gold embers with deep droop. |
| `falling-leaves` | Chaotic fluttering drift with aerodynamic turbulence. |
| `falling-comets` | Burning comets that streak downward under acceleration. |
| `falling-comets-glitter` | Falling comets emitting glittering micro-spark wakes. |
| `snow` | Low terminal drift velocity gently floating like snowflakes. |
| `wave` | Sinusoidal undulating trajectory motion. |
| `flow` | Swimming organic wandering particle trajectories. |
| `galaxy-spin` | Angular momentum rotation around center of explosion. |
| `crossette` | Mid-flight sharp 90-degree 4-way sub-munition fracture. |
| `horsetail` | High upward launch braking at apex into vertical gravity plunge. |
| `ghost-kamuro` | Long hang-time kamuro with mid-trajectory optical disappearance. |
| `crysanthemum-trail` | Dense trailing embers marking the flight path of stars. |
| `crysanthemum-smoke` | Heavy condensation smoke trailing behind each star. |
| `crysanthemum-spiral` | Radial centrifugal spiral outward flight. |
| `sparking` | Fast metallic sparks that burn out briskly. |
| `swimming-star` | Darting erratic swimming trajectories simulating pyrotechnic fish. |

---

## 4. Stackable Active Effects & Modifiers

Combine within the `effects: [...]` array:

### Timed Active Effects
- `strobe`: Strobe flash oscillation on stars.
- `white-strobe`: Intense bright white optical strobe.
- `glitter-strobe`: Golden glitter scintillation.
- `crackle`: Micro-explosions producing audio crackle and visual flash.
- `ghost`: Stars fade to dark and reignite near burnout.
- `ghost-flare`: Dim stars suddenly flare up with bright core illumination.
- `crossette`: Star fracture into 4 perpendicular secondary rays.
- `sparkle-apex`: Sudden sparkle flash at trajectory apex.
- `tadpole-flurry`: Star heads sprout oriented arrow sparks simulating tadpoles.
- `erratic-dart`: Sudden sharp acceleration and 45-degree angle deflection.
- `breathing-pulse`: Smooth rhythmic expansion and contraction of luminance.
- `diamond-scintillation`: Sharp crystalline starlight twinkle.
- `no-trail`: Suppresses smoke and spark trails for crystal-sharp star points.

### Structural Toggle Modifiers
- `pistil` (boolean): Secondary inner core explosion of a different color.
- `instantBurst` (boolean): Instantaneous blast without hang-time delay.
- `burst-smoke` (boolean): Dense colored smoke cloud puff at burst center.
- `apex-hang` (boolean): Star stays suspended at apex before dropping.
- `long-burn` (boolean): Extended chemical burn duration multiplier.
- `slow-burst` (boolean): Gentle soft blooming expansion velocity.

---

## 5. Comet Ascent Trails (`cometTrail`)

Controls the ascending tail visual style from barge launch to apex burst:
- `"normal"`: Standard golden spark tail.
- `"thick"`: Heavy luminous trail with dense spark wake.
- `"thin"`: Sleek elegant needle-thin trail beam.
- `"detached"`: Segmented broken trail segments with dark intervals.
- `"smoke"`: Thick smoke wake plume without bright emissive sparks.
- `"none"`: Completely dark stealth ascent; stars appear suddenly at burst.
- `"ascent-bursts"`: Emits mini sub-burst poppers along the ascending path.

---

## 6. Choreography Firing Patterns (`pattern`)

Determines launch sequence timing and spatial geometry:

| Pattern Key | Spatial Trajectory & Launch Timing |
|---|---|
| `sweep` | Continuous linear sweep across the barge. |
| `sweep-left` | Right-to-left linear directional sweep. |
| `sweep-right` | Left-to-right linear directional sweep. |
| `sweep-wave` | Sweeps horizontally while height oscillates along a sine wave. |
| `sweep-arc` | Broad arching sweep rising to center and dipping at edges. |
| `sweep-arc-out` | Arching sweep launching outward from center toward edges. |
| `sweep-random-tilt` | Sweeps across barge while launch angle jitters randomly. |
| `fan` | Simultaneous or fast-staggered arching fan covering the sky. |
| `v-shape` | Shells angled outward forming a giant V silhouette. |
| `crossfire` | Alternating cross-angled shots intersecting at center. |
| `crossfire-burst` | Cross-angled shells firing simultaneously and bursting together. |
| `converge` | Shells launch from left and right edges moving inward to center. |
| `diverge` | Shells launch from center moving outward to left and right edges. |
| `ripple` | Stepped undulating wave of shells bubbling across the horizon. |
| `zigzag` | Trajectory zigs and zags back and forth horizontally and in depth. |
| `spiral-helix` | 3D helical spiral ascension path. |
| `intertwined-helix` | Dual intertwined counter-rotating DNA helix shells. |
| `vortex-tunnel` | Tunnel-like circular vortex pattern. |
| `cascade-slope` | Stepped sloping barrage rising from low to high. |
| `stepping-stones` | Distinct rhythmic staggered spatial hops across the barge. |
| `random` | Natural scattered spatial distribution across the sector. |
| `continuous` | Evenly spaced continuous streaming cannon fire. |

---

## 7. Professional Pyrotechnic Color Palettes

Emissive firework colors can be specified as Hex strings (`"#ffd700"`) or integer literals (`0xffd700`).

### Canonical Engine Colors
- **Gold (Vàng hoàng gia)**: `"#ffd700"` (`0xffd700`) - Rich pyrotechnic titanium gold.
- **Orange Red (Cam đỏ)**: `"#ff4500"` (`0xff4500`) - Energetic strontium orange-red.
- **Sky Blue (Xanh da trời)**: `"#00bfff"` (`0x00bfff`) - Luminous copper blue.
- **Hot Pink (Hồng neon)**: `"#ff69b4"` (`0xff69b4`) - Vibrant magnesium pink.
- **Aquamarine (Xanh ngọc)**: `"#7fffd4"` (`0x7fffd4`) - Electric barium green-blue.
- **Purple (Tím thạch anh)**: `"#8a2be2"` (`0x8a2be2`) - Royal potassium purple.
- **Pure White (Trắng bạc)**: `"#ffffff"` (`0xffffff`) - Blinding white magnesium star.
- **Deep Red (Đỏ cờ)**: `"#ff0033"` (`0xff0033`) - Saturated ruby strontium red.
- **Emerald Green (Xanh lục bảo)**: `"#00ff66"` (`0x00ff66`) - Crisp barium green.
- **Lemon Yellow (Vàng chanh)**: `"#fde047"` (`0xfde047`) - Crisp sodium yellow.

### Harmonic Curated Palettes for Shows
- **Royal Kamuro Luxury**: Gold (`"#ffd700"`), Pure White (`"#ffffff"`), Deep Amber (`"#ffaa00"`).
- **Cyberpunk Neon**: Hot Pink (`"#ff69b4"`), Sky Blue (`"#00bfff"`), Aquamarine (`"#7fffd4"`).
- **Sunset Symphony**: Deep Red (`"#ff0033"`), Orange Red (`"#ff4500"`), Lemon Yellow (`"#fde047"`).
- **Ocean Twilight**: Sky Blue (`"#00bfff"`), Royal Purple (`"#8a2be2"`), Aquamarine (`"#7fffd4"`).
- **Sakura Blossom**: Soft Pink (`"#ff99bb"`), Pure White (`"#ffffff"`), Gold Embers (`"#ffd700"`).

