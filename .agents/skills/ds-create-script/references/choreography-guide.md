# Musical Pyrotechnic Choreography Guide

This guide establishes the artistic and technical principles for synchronizing pyrotechnic shows to music, mapping musical structure to spatial fireworks, and balancing sky density.

---

## 1. Musical Structure & Pyrotechnic Mapping

Professional fireworks shows follow the emotional and dynamic arc of music. Every show should be architected into 5 distinct phases:

```text
Intensity
  100% |                                      [GRAND FINALE]
       |                                      /==============\
   75% |               [MAIN CLIMAX]         /                \
       |              /=============\       /                  \
   50% |   [BUILD-UP]/               \     /                    \
       |  /==========                 \   /[BREAKDOWN]           \
   25% | /                             \=/                        \
    0% |/[INTRO]                                                   \[FADEOUT]
       +--------------------------------------------------------------------> Time
         0%        15%              40%   65%       80%           100%
```

---

### Phase 1: Intro (0% – 15% of show duration)
- **Musical Character**: Quiet ambiance, solo instruments, slow intro beat, mood setting.
- **Pyrotechnic Staging**:
  - Focus primarily on `sectorId: "center"`.
  - Use delicate, low-density single comets (`comet_single`, `falling_comets`) or soft single peony shells.
  - Altitude: Low to mid (`ratioY: 0.4` to `0.6`).
  - Palette: Monochromatic or dual calm tones (e.g. Pure White and Sky Blue).
  - Pacing: Sparse (1 shot every 2 to 4 bars). Leave wide negative space for the music to establish.

---

### Phase 2: Build-Up (15% – 40% of show duration)
- **Musical Character**: Rising tempo, drum groove enters, ascending arpeggios, building anticipation.
- **Pyrotechnic Staging**:
  - Expand space from center outwards to `sectorId: "left"` and `"right"`.
  - Introduce directional movement patterns: `sweep-left`, `sweep-right`, `ripple`, `fan`.
  - Fire rate accelerates to every 1/2 beat or 1 beat.
  - Altitude climbs: `ratioY: 0.6` to `0.8`.
  - Shell types: Strobe shells (`strobe`, `white_strobe`), crackles (`crackle`), and dual-layer chrysanthemums (`crysanthemum_v2`).
  - Palette: Introduce warm energetic colors (e.g. Gold and Orange Red).

---

### Phase 3: Main Climax / Drop (40% – 65% of show duration)
- **Musical Character**: Heavy bass drop, full orchestral peak, maximum audio energy and volume.
- **Pyrotechnic Staging**:
  - Simultaneous multi-sector activation (`left`, `center`, and `right` firing in unison or counterpoint).
  - Powerful sweeping patterns: `crossfire`, `v-shape`, `crossfire-burst`, `sweep-wave`.
  - Heavy shells: `multi_nested`, `crysanthemum_nested`, `crossette`, `bouquet_v2_multicolor`.
  - Multi-tier vertical saturation:
    - Low tier (`ratioY: 0.35`): Ground mines (`bouquet`).
    - Mid tier (`ratioY: 0.70`): Fast peonies and strobes.
    - High tier (`ratioY: 1.05`): Giant willow brocade canopy hanging overhead.
  - Palette: Full saturated contrast (e.g. Cyberpunk Hot Pink + Sky Blue, or Royal Gold + Red).

---

### Phase 4: Breakdown & Bridge (65% – 80% of show duration)
- **Musical Character**: Sudden drop in drums, vocal bridge, quiet acoustic interlude, tension release.
- **Pyrotechnic Staging**:
  - Immediate density drop. Avoid abrupt silence by transitioning into lingering hanging embers.
  - Ideal presets: `weeping_willow_comets_v3`, `ghost_kamuro`, `strobe_dying_embers`, `falling_leaves`.
  - Floating stars drift gently downwards across the full height span without fresh ground detonations.
  - Altitude: High apex release (`ratioY: 0.9` to `1.1`) allowing particles to drift down over 3 to 4 seconds.
  - Palette: Soft golden embers, dimming ghost stars, gentle moonlight white.

---

### Phase 5: Grand Finale (80% – 100% of show duration)
- **Musical Character**: Fast crescendo, final chorus, thunderous outro, final chord crash.
- **Pyrotechnic Staging**:
  - Maximum saturation and overwhelming sky coverage.
  - Fast continuous sweeping barrages: `cascade-slope`, `fan`, `intertwined-helix`, `sweep-arc`.
  - Shell count per second multiplies 3x to 5x.
  - Climax salvo: All sectors fire simultaneously at the final downbeat (`sectorId: "all"`, `count: 15-30`).
  - Conclude with a 2-3 second dark sky fadeout as final titanium gold willow sparks reach the water level.

---

## 2. Spatial Staging & Horizon Management

The display area is modeled as a 3-sector firing zone on a body of water with three launch barges:

```text
    [LEFT SECTOR]             [CENTER SECTOR]            [RIGHT SECTOR]
  X: 0.00 --- 0.35           X: 0.35 --- 0.65           X: 0.65 --- 1.00
       [BARGE 1]                 [BARGE 2]                 [BARGE 3]
================================ WATER LEVEL ================================
```

### Sector Choreography Rules:
1. **Dialogue / Call & Response**:
   - Fire a sequence on `sectorId: "left"` at beat 1.
   - Answer with a sequence on `sectorId: "right"` at beat 2.
   - Resolve with a massive center burst on `sectorId: "center"` at beat 3.
2. **Pinch & Spread**:
   - `converge`: Launches from left and right outer boundaries sweeping into the center.
   - `diverge`: Launches from center splitting outward to left and right edges.
3. **Crossfire**:
   - Left barge fires angled right (`angle: +25`).
   - Right barge fires angled left (`angle: -25`).
   - The shells cross paths at the center line at high altitude.

---

## 3. Vertical Tier Layering (`ratioY`)

To achieve depth and prevent sky congestion, stack fireworks into 3 altitude layers:

| Layer Tier | Altitude Ratio (`ratioY`) | Shell Types | Visual Function |
|---|---|---|---|
| **Low Tier (Ground / Water)** | `0.30` - `0.50` | `bouquet`, `bouquet_v2`, `horsetail` | Fills the bottom frame, creates river reflection glare. |
| **Mid Tier (Main Stage)** | `0.60` - `0.80` | `crysanthemum`, `strobe`, `ring`, `heart`, `text_word` | Carries the primary shapes and readable symbols. |
| **High Tier (Sky Canopy)** | `0.90` - `1.20` | `weeping_willow_comets`, `ghost_kamuro`, `multi_nested` | Expands the vertical scale, crowns the climax with lingering golden rain. |

---

## 4. Visual Pacing & Negative Space

- **Avoid Monotonous Wall of Noise**: A constant barrage of identical fireworks for 60 seconds causes visual fatigue. The viewer's eye needs rhythm and contrast.
- **Contrast Speed**: Pair fast high-frequency strobes (`white_strobe`) with slow graceful falling willows (`weeping_willow_comets`).
- **Contrast Geometry**: Alternate between organic chaotic bursts (`crysanthemum`, `crackle`) and crisp geometric lines (`ring`, `heart`, `text_word`).
- **Negative Space**: Leave 0.5s to 1.5s pauses between major musical phrases so the smoke clears and the next impact delivers maximum contrast.

