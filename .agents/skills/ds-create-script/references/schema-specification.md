# Firework Timeline Show Script JSON Schema Specification

This document provides the canonical schema contract and field definitions for firework show scripts loaded by `TimelineEditor` and executed by `ShowDirector`, `ShowEventDispatcher`, and `FireworkSequencer`.

---

## 1. Top-Level Data Contract

A firework show script is serialized as a JSON Array containing an ordered sequence of event objects:

```json
[
  { "type": "audio", ... },
  { "type": "sequence", ... },
  { "type": "sequence", ... }
]
```

### Event Types
The `type` field determines the execution handler:
- `audio`: Background audio soundtrack with musical duration, volume, and optional beat timestamps.
- `sequence`: Pyrotechnic shell sequence executed across time and spatial patterns.
- `cometsequence`: High-frequency comet stream or sweeping comet bursts.
- `group`: Nested composite group containing child sequence objects (`children: [...]`).
- `single`: Discrete instantaneous single shell firing or pinpoint coordinate burst.

---

## 2. Event Field Specifications

### 2.1. Audio Event Object (`type: "audio"`)

Placed at index 0 or starting at `time: 0.0`:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | Yes | `"audio"` | Must be `"audio"`. |
| `time` | number | Yes | `0.0` | Start time in seconds. Usually `0.0`. |
| `name` | string | No | `"Soundtrack"` | Display name of the song / track. |
| `url` | string | Yes | `""` | Filename or relative path to the audio file (e.g. `soundtrack.mp3`). |
| `duration` | number | Yes | - | Total duration of the audio in seconds. |
| `uiDuration` | number | No | `duration` | Width of the track representation in timeline. |
| `volume` | number | No | `1.0` | Playback volume multiplier (range `0.0` to `1.0`). |
| `beats` | number[] | No | `[]` | Array of float timestamps in seconds marking musical downbeats or transients. |

---

### 2.2. Sequence Event Object (`type: "sequence"`)

Represents a choreography sequence block on the timeline:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | Yes | `"sequence"` | Must be `"sequence"`. |
| `time` | number | Yes | - | Launch start timestamp in seconds (`time >= 0`). |
| `duration` | number | Yes | `1.0` | Sweep / launch execution window in seconds. |
| `uiDuration` | number | No | `Math.max(duration, 0.4)` | Visual display width on the timeline track editor. |
| `pattern` | string | Yes | `"random"` | Spatial firing trajectory and timing algorithm (see pattern catalog). |
| `count` | number | Yes | `1` | Total number of shells launched within this sequence block (`count >= 1`). |
| `preset` | string | Yes | `"crysanthemum"` | Canonical shell preset key in `snake_case` (see preset catalog). |
| `sectorId` | string | No | `"center"` | Ground launch sector: `"left"`, `"center"`, `"right"`, or `"all"`. |
| `ratioY` | number | No | `0.8` | Normalized burst altitude ratio (range `0.2` to `1.2`). |
| `ratioX` | number | No | `0.5` | Normalized burst center on the horizontal X axis (range `0.0` to `1.0`). |
| `ratioZ` | number | No | `0.5` | Normalized burst center on the depth Z axis (range `0.0` to `1.0`). |
| `x1` | number | No | `0.0` | Start horizontal boundary for sweep patterns (range `0.0` to `1.0`). |
| `x2` | number | No | `1.0` | End horizontal boundary for sweep patterns (range `0.0` to `1.0`). |
| `y1` | number | No | `0.4` | Start height boundary for vertical sweeps / cascades. |
| `y2` | number | No | `0.8` | End height boundary for vertical sweeps / cascades. |
| `useAngle` | boolean | No | `false` | When `true`, overrides automatic tilt with custom `angle`. |
| `angle` | number | No | `0` | Physical launch angle in degrees (range `-45` to `+45`). |
| `color` | string \| number | No | `null` | Color override (hex string `"#ffd700"` or number `0xffd700`). |
| `shellSize` | number | No | `1.0` | Shell size scalar multiplier (range `0.5` to `4.0`). |
| `instantBurst` | boolean | No | `false` | When `true`, particles burst immediately at apex with zero hang time. |
| `shapeType` | string | No | preset shape | Shape override at t = 0 (e.g. `ring`, `heart`, `star`, `text_word`). |
| `dynamicsType` | string | No | preset dynamics | Particle dynamics at t > 0 (e.g. `willow`, `falling-comets`). |
| `effects` | string[] | No | `[]` | Stackable active visual effects tags (e.g. `['strobe', 'crackle']`). |
| `pistil` | boolean | No | `false` | Structural modifier: inner core burst star cluster. |
| `secondBurst` | object | No | `null` | Multi-stage secondary sub-burst configuration. |
| `cometTrail` | string | No | `"normal"` | Ascent trail styling: `"normal"`, `"thin"`, `"thick"`, `"detached"`, `"smoke"`, `"none"`, `"ascent-bursts"`. |
| `textWord` | string | No | `"HELLO"` | Text string to render in the sky when `shapeType` is `"text_word"`. |
| `textScale` | number | No | `0.38` | Scalar size multiplier for font glyphs in `"text_word"` fireworks. |
| `letterSpacing` | number | No | `1.5` | Letter spacing interval between characters in `"text_word"`. |
| `tiltAngle` | number | No | `18` | Tilt inclination angle (degrees) towards viewer for planar shapes. |

---

### 2.3. Comet Sequence Event Object (`type: "cometsequence"`)

Optimized for high-density comet sweeps, fans, and streaming runs:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | Yes | `"cometsequence"` | Must be `"cometsequence"`. |
| `time` | number | Yes | - | Start time in seconds. |
| `duration` | number | Yes | `2.0` | Duration of the comet run in seconds. |
| `count` | number | Yes | `10` | Total number of comets fired. |
| `preset` | string \| object | No | `"comet_single"` | Comet preset key or descriptor object. |
| `pattern` | string | Yes | `"sweep"` | Pattern algorithm (`"sweep"`, `"fan"`, `"crossfire"`, `"ripple"`). |
| `sectorId` | string | No | `"center"` | Target barge sector (`"left"`, `"center"`, `"right"`). |
| `cometTrail` | string | No | `"thick"` | Ascent trail: `"thick"`, `"thin"`, `"detached"`, `"none"`. |
| `color` | string \| number | No | `null` | Comet star emissive color override. |

---

## 3. Critical Anti-Leak & Sanitization Rules

Exported JSON show scripts are immutable persistent assets. System loaders fail or crash if transient runtime variables are serialized.

The AI generator and exporter must NEVER serialize properties starting with an underscore `_`:
- Do NOT output `_waveformPeaks`
- Do NOT output `_waveformPromise`
- Do NOT output `_waveformLoading`
- Do NOT output `_blobUrl`
- Do NOT output `_trackRow`
- Do NOT output `_deleted`
- Do NOT output `_cachedTextWord`
- Do NOT output `_glyphCacheKey`
- Do NOT output `textPoints` (must remain dynamically computed by atlas)

---

## 4. Mathematical Invariants & Safe Formulas

1. **Timeline UI Duration**:
   ```javascript
   uiDuration = Math.max(duration, 0.4);
   ```
2. **Beat Grid Alignment**:
   ```javascript
   beatInterval = 60 / BPM;
   snappedTime = Math.round(time / beatInterval) * beatInterval;
   ```
3. **Execution Window Validation**:
   ```javascript
   assert(time >= 0);
   assert(duration > 0);
   assert(count >= 1);
   assert(ratioY >= 0.1 && ratioY <= 1.5);
   ```
4. **Chronological Sorting**:
   The top-level array should be sorted in ascending order by `time`:
   ```javascript
   script.sort((a, b) => a.time - b.time);
   ```

