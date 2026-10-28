# Project-Scoped Rules and Coding Conventions

## Code Formatting and Readability
- **Limit Horizontal Line Length**: Avoid long horizontal lines of code. If a function call, constructor, array, or object has multiple arguments or properties, break them onto separate lines.
- **Single Property Per Line**: For multiline function calls, array declarations, or object literals, place each argument/property on its own line for maximum readability and clean git diffs.
  - *Example*:
    ```javascript
    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.1,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    ```

## General Communication & Output Rules
- **No Icons or Emojis**: Do NOT use any icons or emojis in any generated content, documentation, release notes, commit messages, or general communication. Keep everything strictly professional and text-only.

## Terminology & Glossary
- **Terminology Reference**: Always refer to [GLOSSARY.md](../GLOSSARY.md) for naming conventions and definitions of timeline/editor components (such as Playhead, Anchor Head, Beat, Snap-to-beat). Do not invent new terms or mix names (e.g. do not call Anchor Head "playhead cursor" or "timeline pointer").

## Documentation & Markdown Rules
- **Relative Markdown Links**: Always prioritize using relative links (for example, `./src/main.js`) instead of absolute file paths (such as `file:///...`) when writing links inside workspace documentation and files (such as `STRUCTURE.md`).

## Firework & Shell Configurations
- **Read Centralized Configurations**: Whenever a user request relates to configuring firework parameters, particle counts, gravity, multipliers, or special shell presets (such as bouquet or comet settings), you MUST first read and refer to the centralized configuration file at `./src/config/fireworks.js` to ensure configurations remain unified and follow the established parameter schemas.

## Firework Composition Architecture Conventions
- **Composition over Presets**: Fireworks must strictly adhere to the Component-based Composition model:
  - **Shape** (spatial geometry at t = 0): Handled by `BurstShapeGenerator.js`. Must NOT contain particle physics or dynamics logic.
  - **Dynamics** (particle kinematics, drift, drag, drooping at t > 0): Handled by `BurstEffectProcessor.js`. Must NOT hard-code shapes. Note: `willow` is a Dynamics behavior, not a Shape.
  - **Modifiers** (structural modifiers): E.g. `pistil` (inner core burst), `instantBurst` (immediate velocity burst).
  - **Visual Effects** (stackable optical modifiers): E.g. `strobe`, `white-strobe`, `glitter-strobe`, `crackle`, `ghost`.
  - **Presets as Templates**: New presets must be registered as Composition Templates in `FireworkCompositionHelper.js` and `ShellPresetFactory.js`.
- **Centralized Taxonomy**: Whenever adding a new Shape, Dynamics, Modifier, or Visual Effect tag, you MUST register it in `./src/factories/FireworkCompositionHelper.js` and provide translations in all language files (`./src/config/lang/{en,vi,zh,ja}.js`).
- **Active Effects Universality**: Any effect tag classified under "Active Effects" (e.g. `strobe`, `crackle`, `ghost`, `crossette`, `tadpole-flurry`, `burst-smoke`) MUST be implemented as a universal modifier capable of running on ANY firework shell type, shape, or particle stream. It must not be tightly coupled or restricted to a single preset, and must seamlessly compose with other active effects (inheriting dynamic colors, fade lifecycle, physics, and companion modifiers).

## Preset & Shell Naming Conventions
- **Lowercase snake_case Format**: All preset keys, shell types, and composition identifiers MUST be written in lowercase `snake_case`.
- **Primary Effect / Category Prefix**: The identifier MUST always start with the primary effect or base category, followed by variants and modifiers:
  `{primary_category}_{variant}_{modifier}`
  - *Examples*:
    - `strobe_dying_embers`, `strobe_white`, `strobe_glitter`
    - `crysanthemum_spiral_v2`, `crysanthemum_smoke`, `crysanthemum_nested`
    - `comet_cluster_detached`, `comet_single_beam`, `comet_cluster_cc`
    - `willow_falling_comets`, `willow_arch`
    - `crossette_ring`, `crossette_matrix`
- **Aliases for Backward Compatibility**: If camelCase or legacy keys exist in codebase, map them as secondary aliases only, with the primary canonical key adhering to the structured `snake_case` prefix rule.

## UI & Localization Text Conventions
- **English as Primary Canonical Language**: English is the official primary language of this application. All default text strings, UI labels, tooltips, alert messages, error notifications, confirmations, placeholders, and especially fallback/rollback values (e.g. `t('key') || 'English Default'`) MUST be written in English. Never hardcode Vietnamese, Japanese, Chinese, or other non-English text as fallback strings in source code. Localizations for other languages (vi, zh, ja) must reside in their dedicated language files (`src/config/lang/{vi,zh,ja}.js`).
- **No Parentheses in Text Strings**: Do NOT use parentheses `(...)` in UI labels, options, preset display names, or translation strings. Keep titles and labels clean, natural, and concise without parenthetical notes (e.g. use "Chrysanthemum Spiral V2" instead of "Chrysanthemum Spiral V2 (Spiral -> Sphere)", "Bouquet Cluster" instead of "Bouquet (Cluster)", "Direct Save" instead of "(Direct Save)").

## Code Integrity & Regression Prevention
- **Preserve Existing Features & Subsystems**: When modifying, optimizing, or refactoring code (such as adjusting particle effects, smoke dynamics, timeline controls, or audio triggers), NEVER arbitrarily delete, disable, or comment out existing capabilities, lifecycle events, or subsystem quotas (such as launch smoke, barge exhaust, independent quotas, or physics properties) unless the user explicitly commands their removal.
- **Surgical & Scoped Modifications**: Always isolate code edits strictly to the requested behavior. Avoid blanket overrides or broad-brush suppression that accidentally silences adjacent pipelines or shared subsystem mechanisms.
- **Diff Inspection Before Completion**: Always review modified files using git diff to confirm that no unrelated functions, event listeners, or established quotas were inadvertently omitted, commented out, or overwritten.
- **Regression Protection via Tests**: Maintain and run comprehensive test suites to ensure both newly added behavior and pre-existing subsystem capabilities continue to function as intended without silent regressions.

## JSON Schema & Backward Compatibility Rules
- **Immutable Core Schema & Backward Compatibility**: Exported JSON files (show scripts, timeline sequences, formations, drone steps, and shell presets) are canonical data assets. System upgrades and architecture changes must guarantee strict backward compatibility at all times:
  - **Graceful Fallbacks & Optional Additions**: Any new schema properties or parameters introduced in future updates MUST be optional and provide safe default values. Older JSON files generated by previous versions must load, parse, and execute cleanly without runtime crashes or requiring manual file migration.
  - **Sanitization & Clean Export**: When serializing JSON data (e.g. through `cleanSequence` or export adapters), never leak transient runtime variables, UI caches, Promises, or ephemeral memory objects (such as `_waveformPeaks`, `_waveformPromise`, `_blobUrl`, `_trackRow`, `_deleted`). Only standardized, persistent schema attributes should be saved.
  - **Non-Destructive Evolution**: Never arbitrarily rename, reformat, or delete existing schema fields that legacy shows depend on. If a property is upgraded or superseded, maintain legacy adapters and compatibility aliases on import.
  - **Structural Stability of Hierarchies**: Nested structures (such as group sequences with `children`, audio blocks with `beats`, drone animations with `steps`) must retain their contract guarantees so that playback directors, sequencers, and loaders reliably traverse them across all versions.

## Visual Effects & Particle Rendering Constraints
- **Preserve Additive Blending for Emissive Fireworks**: Firework particles represent emissive photons and burning pyrotechnic stars. NEVER switch firework burst or trail particles to `THREE.NormalBlending` or custom opaque blending modes. Opaque blending creates unnatural flat circular discs with dark borders and destroys the authentic firework aesthetic. Always keep `THREE.AdditiveBlending`.
- **Preserve Spatial Structures & Shape Generators**: Never modify particle coordinates, spatial distributions, or geometry algorithms in `src/factories/BurstShapeGenerator.js` when responding to requests regarding particle brightness, glare, or color. Shape structure, particle counts, and dynamics must remain untouched unless the user explicitly requests a geometry change.
- **Handling Overlap Glare & Light Blowout**: When addressing excessive brightness or blinding glare caused by overlapping particles:
  - Do NOT change materials or particle models.
  - Dampen shader fragment accumulation by softening gradient stops in `FireworkSystem.js` and `TrailSystem.js` (e.g. blend `hotCenter` with diffuse color, lower center alpha from 1.0 to ~0.70, and reduce intermediate stop alphas).
  - Tame extreme HDR brightness multipliers on star meshes (`coreColor` / `innerMultiplier` in `ShellEntity.js` and `CometEntity.js`) while maintaining unit test assertions.
  - Calibrate post-processing bloom thresholds and strength in `src/config/rendering.js` and `src/config/settings.js` (raise threshold to prevent medium-brightness clusters from triggering bloom blowout, reduce bloom strength and radius).
- **Adhere Strictly to Surgical Scoped Modifications**: Never rewrite an entire rendering pipeline, shader model, or factory when a request only targets visual balance. Adjust the minimum necessary scalar parameters or shader stops to solve the issue.



