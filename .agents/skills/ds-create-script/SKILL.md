---
name: ds-create-script
description: Automatically generates valid, music-synchronized pyrotechnic choreography JSON show scripts for TimelineEditor based on music analysis, beats, and user themes. Provides full JSON schema documentation, pattern dictionaries, effect catalogs, and 5-phase choreography rules.
---

# Pyrotechnic Choreography & Show Script Generator (`ds-create-script`)

Use this skill whenever you or an AI agent (such as ChatGPT, Claude, or local agents) needs to:
1. Create a complete, high-quality, musically synchronized firework choreography JSON show script from scratch.
2. Translate music analysis (BPM, song duration, downbeats, verse/chorus/drop timestamps, audio energy curves) into timeline firework events.
3. Understand the exact data contract and JSON schema required by `TimelineEditor.importBtn` in Studio.
4. Validate, sanitize, and format existing show scripts to guarantee zero runtime crashes and strict backward compatibility.

---

## 1. Quick Reference Documentation

Always consult the dedicated reference manuals located in `references/`:
- **JSON Schema Specification**: See [schema-specification.md](./references/schema-specification.md) for full field contracts, types, bounds, and required attributes.
- **Composition Catalog**: See [composition-catalog.md](./references/composition-catalog.md) for the complete list of 71 canonical presets, 24 shapes, 27 dynamics, 19 active effects, 7 comet trails, 24 patterns, and curated color palettes.
- **Musical Choreography Guide**: See [choreography-guide.md](./references/choreography-guide.md) for 5-phase energy structuring (Intro -> Build-up -> Drop/Climax -> Breakdown -> Grand Finale), 3-tier vertical layering, and sector staging.
- **Reference Script Example**: See [sample-show.json](./examples/sample-show.json) for a fully validated 60-second show script.

---

## 2. Core Principles & Critical Invariants

1. **Top-Level Structure**: A show script is always a JSON array of event objects: `[ { "type": "audio", ... }, { "type": "sequence", ... } ]`.
2. **Audio Track First**: If an audio file is present, place the `type: "audio"` event at index 0 starting at `time: 0.0`.
3. **No Transient Variables (Anti-Leak Rule)**: NEVER output keys starting with an underscore (`_`). Strip `_waveformPeaks`, `_waveformPromise`, `_blobUrl`, `_trackRow`, `_deleted`, `_cachedTextWord`, `_glyphCacheKey`, and dynamic runtime arrays like `textPoints`.
4. **Normalized Spatial Bounds**:
   - Horizontal boundaries `x1`, `x2`, `ratioX` must be within `[0.0, 1.0]`.
   - Vertical altitude `ratioY` must be within `[0.2, 1.2]` (nominal default is `0.8`).
   - Launch sectors `sectorId` must be `"left"`, `"center"`, `"right"`, or `"all"`.
5. **Timeline UI Duration**:
   Always compute `uiDuration = Math.max(duration, 0.4)` to ensure timeline block handles remain clickable and properly spaced in the editor.
6. **No Parentheses in Names**: Do NOT use parentheses `(...)` in titles or preset display names. Keep names clean and concise.
7. **Strictly Text-Only**: Do NOT use any icons or emojis in output, script metadata, or commentary.

---

## 3. Step-by-Step Show Generation Procedure

Follow this 4-step workflow when generating a choreography script:

### Step 1: Musical Analysis & Time Grid Discovery
Extract or request the music metadata:
- **Total Duration** (seconds): e.g. `60.0`, `180.0`.
- **Tempo (BPM)**: e.g. `128 BPM`. Calculate the beat interval: `beatInterval = 60 / BPM` (e.g. at 120 BPM, 1 beat = 0.5s).
- **Key Musical Sections**: Identify timestamps for:
  - Intro (0% to ~15%)
  - Verse / Build-up (~15% to ~40%)
  - Chorus / Main Climax Drop (~40% to ~65%)
  - Bridge / Acoustic Breakdown (~65% to ~80%)
  - Final Chorus / Grand Finale (~80% to 100%)

### Step 2: Establish Phase & Energy Arc
Divide the timeline duration into the 5 pyrotechnic phases:
1. **Intro**: Sparse firing, low altitude (`ratioY: 0.4` to `0.5`), gentle comets (`comet_single`, `falling_comets`), monochromatic palette, mostly `sectorId: "center"`.
2. **Build-Up**: Panning movements (`sweep-left`, `sweep-right`, `fan`), rising height (`ratioY: 0.6` to `0.75`), accelerating fire rates on half-beats, strobes (`strobe`, `white_strobe`).
3. **Main Climax / Drop**: Maximum sky saturation across all three sectors (`left`, `center`, `right`). Heavy multi-stage shells (`multi_nested`, `crysanthemum_nested`), sweeping waves (`crossfire`, `v-shape`, `sweep-wave`), full color contrast.
4. **Breakdown / Bridge**: Sudden drop in density, floating long-burn embers (`weeping_willow_comets_v3`, `ghost_kamuro`, `strobe_dying_embers`) drifting down from high altitude (`ratioY: 0.9` to `1.1`).
5. **Grand Finale**: Thunderous rapid barrages (`cascade-slope`, `fan`, `intertwined-helix`), maximum shell counts, concluding with an all-sectors simultaneous salvo burst at the final musical hit.

### Step 3: Assemble Pyrotechnic Sequences
For each musical hit or phrase, create a `sequence` object:
- Set `time` snapped to the beat grid: `snappedTime = Math.round(time / beatInterval) * beatInterval`.
- Pick a canonical preset from [composition-catalog.md](./references/composition-catalog.md) (e.g. `crysanthemum_v2`, `strobe`, `weeping_willow_comets`, `ring_v2`, `text_word`).
- Choose a firing `pattern` (e.g. `sweep`, `fan`, `crossfire`, `v-shape`, `ripple`, `random`).
- Allocate physical `sectorId` (`"left"`, `"center"`, `"right"`, or `"all"`).
- Set `count` (1 to 25 depending on intensity) and `duration` (0.5s to 3.5s).
- Apply thematic color override via `color` (e.g. `"#ffd700"`, `"#00bfff"`, `"#ff4500"`).
- Add active effects if desired via `effects: ["strobe", "crackle"]`.
- When using `text_word`, specify `textWord: "WORD"`, `textScale: 0.38`, and `tiltAngle: 18`.

### Step 4: JSON Compilation, Sanitization & Verification
1. Merge the audio block and all sequence blocks into a single top-level array.
2. Sort all events chronologically in ascending order: `events.sort((a, b) => a.time - b.time)`.
3. Filter out any transient keys starting with `_`.
4. Validate that all numbers are non-negative and all required fields are present.
5. Save the output as a valid `.json` file inside `docs/script/` or present as an importable JSON code block.

---

## 4. Verification & Testing

To test a generated show script in Studio:
1. Open Studio (`npm run electron:dev`).
2. Open the Timeline Editor panel.
3. Click the **Import** button (`btn-import`) in the timeline toolbar.
4. Select the generated `.json` file.
5. Confirm that all sequences populate correctly across timeline rows without overlapping visual errors, and press Spacebar to audition the choreography in 3D.

