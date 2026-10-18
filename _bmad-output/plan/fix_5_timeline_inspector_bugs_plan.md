# Plan: Fix 5 Timeline & Property Inspector Bugs

## Overview
This document specifies the technical implementation plan to resolve 5 critical bugs identified in the Timeline Editor and Property Inspector:
1. Timeline view/scroll/playhead does not hold position when importing scripts.
2. Property Inspector input edits cause subsequent clicked blocks to jump on the timeline.
3. Switching presets does not reset/clear old composition effect tags and flags.
4. Audio waveform visual peaks disappear after pressing Ctrl+Z (Undo).
5. Pressing Ctrl+G (Group/Ungroup) causes timeline playhead and viewport to jump back to 0.

---

## 1. Technical Root Cause Analysis

### Bug 1: Timeline View / Viewport Does Not Hold Position on Import
- **Root Cause**: In [TimelineEditor.js](../../src/ui/TimelineEditor.js), methods `openNativeFile()` and `importSequence()` invoke `this.showDirector.loadScript(...)`. In [ShowDirector.js](../../src/directors/ShowDirector.js#L17), `loadScript()` unconditionally resets `this.elapsedTime = 0`. Neither `trackContainer.scrollLeft` nor `elapsedTime` is preserved, and no `seek()` is called. Furthermore, the `updatePlayhead()` animation loop detects `x = 0` and pulls `trackContainer.scrollLeft` all the way back to 0.
- **Fix**:
  - Before reloading script data, capture current `trackContainer.scrollLeft`, `anchorTime`, and `showDirector.elapsedTime`.
  - In `importSequence()` and `openNativeFile()`, if importing a show, maintain anchor or focus on the imported content range without jumping abruptly to 0. Seek `showDirector` to the intended time so `updatePlayhead()` does not pull the viewport to 0.

### Bug 2: Property Inspector Input Edit Causes Clicked Block to Jump
- **Root Cause**:
  - In [PropertyInspector.js](../../src/ui/PropertyInspector.js), input handlers write to `this.selectedEvent[field.name] = val` dynamically.
  - When the user types into an input for Block A and then clicks Block B on the timeline:
    1. `block.mousedown` on Block B fires first, calling `this.inspector.show(Block B)`.
    2. `show(Block B)` changes `this.selectedEvent = Block B` and calls `render()`, wiping `container.innerHTML`.
    3. The focused input for Block A is detached from the DOM, triggering `blur` (or pending `change` / debounce timeout).
    4. When that deferred handler executes, it writes Block A's typed value into `this.selectedEvent` (which is now Block B).
    5. Block B's `time` (or duration/volume) is overwritten with Block A's value, causing Block B to jump to that time on the timeline.
- **Fix**:
  - In `renderStandardInput()` and all other field renderers, bind the target event to a local variable (`const targetEvent = this.selectedEvent`) via closure so any asynchronous event handlers cannot mutate whatever happens to be the currently selected event later.
  - In `show(newEvent)`, flush and cancel any pending `debounceTimeout`, set `this.isEditing = false`, and blur the currently active element safely before changing `this.selectedEvent`.

### Bug 3: Old Composition Effects Not Reset on Preset Change
- **Root Cause**:
  - In [PropertyInspector.js](../../src/ui/PropertyInspector.js#L658-L680), changing `preset` only overwrote `this.selectedEvent.effects = [...template.effects]`.
  - Individual legacy/active effect properties stored as booleans directly on the event (`strobe`, `crackle`, `ghost`, `ghostFlare`, `flow`, `noTrail`, `noBurst`, `crossette`, `burst-smoke`, etc.) remained untouched.
  - In `renderEffectChips()`, the filter checked `!!this.selectedEvent[eff.key] || currentEffectsList.includes(eff.key)`, so old boolean keys remained permanently truthy.
  - When `val` lacked a template or was reset, `effects` was not cleared properly.
- **Fix**:
  - When changing `preset`, iterate through all `AVAILABLE_EFFECT_TAGS` and legacy optical keys (`strobe`, `crackle`, `ghost`, `ghostFlare`, `flow`, `noTrail`, `noBurst`, `crossette`) and delete them from `this.selectedEvent`.
  - Reinitialize `this.selectedEvent.effects` strictly based on `template ? [...template.effects] : []`.

### Bug 4: Audio Waveform Disappears on Ctrl+Z (Undo)
- **Root Cause**:
  - In [TimelineEditor.js](../../src/ui/TimelineEditor.js#L2121), `saveHistoryState()` serialized sequences using `JSON.parse(JSON.stringify(this.sequences))`.
  - Audio sequence waveform peaks are stored in `_waveformPeaks` as a `Float32Array`.
  - `JSON.stringify` converts a `Float32Array` into an ordinary object `{ "0": 0.1, "1": 0.2, ... }` without a `.length` property.
  - On `undo()`, `this.sequences = this.undoStack.pop()`. `seq._waveformPeaks` becomes this corrupted plain object.
  - In `renderTracks()`, `if (seq._waveformPeaks)` is truthy, so it invokes `renderWave(seq._waveformPeaks)`. In [WaveformGenerator.js](../../src/utils/WaveformGenerator.js#L111), `peaks.length` is `undefined`, causing loop calculations to yield `NaN` and draw nothing.
  - Because `_waveformPeaks` is truthy, the fallback branch that extracts peaks from `audioSrc` is never reached.
- **Fix**:
  - In `saveHistoryState()`, preserve typed arrays or transient objects (or cache waveform peaks by audio identifier/URL).
  - In [TimelineEditor.js](../../src/ui/TimelineEditor.js), sanitize or restore `_waveformPeaks` in `undo()` / `redo()` if it was serialized, converting plain `{ 0: ..., 1: ... }` back into a valid `Float32Array`, or verifying `peaks instanceof Float32Array || Array.isArray(peaks)`.
  - In [WaveformGenerator.js](../../src/utils/WaveformGenerator.js#L111), harden `renderWaveform()` to safely handle plain objects with numeric keys if ever encountered.

### Bug 5: Ctrl+G Jump to Timeline 0
- **Root Cause**:
  - In [TimelineEditor.js](../../src/ui/TimelineEditor.js#L760-L865), both `groupSelected()` and `ungroupSelected()` call `this.showDirector.loadScript(this.getFlattenedSequences())`.
  - `loadScript()` sets `this.elapsedTime = 0`.
  - Unlike other editing operations, neither `groupSelected()` nor `ungroupSelected()` captured `currentTime` and called `this.showDirector.seek(currentTime)`.
  - `updatePlayhead()` reads `elapsedTime = 0`, pulling the playhead and auto-scrolling viewport to 0.
- **Fix**:
  - In `groupSelected()`: capture `const currentTime = this.showDirector.elapsedTime;`, and after `loadScript()`, invoke `this.showDirector.seek(currentTime);`.
  - In `ungroupSelected()`: do the same: capture `currentTime` and restore via `seek(currentTime)`.
  - Ensure `this.playhead.style.left = (currentTime * this.pixelsPerSecond) + 'px';` is updated immediately.

---

## 2. Implementation Steps

1. **Step 1**: Fix Bug 5 (Ctrl+G playhead hold) & Bug 1 (Import viewport hold) in `src/ui/TimelineEditor.js`.
2. **Step 2**: Fix Bug 2 (Inspector focus race condition & block jump) in `src/ui/PropertyInspector.js`.
3. **Step 3**: Fix Bug 3 (Preset change effect reset) in `src/ui/PropertyInspector.js`.
4. **Step 4**: Fix Bug 4 (Waveform preservation across Undo/Redo) in `src/ui/TimelineEditor.js` and `src/utils/WaveformGenerator.js`.
5. **Step 5**: Run automated tests and perform verification.
