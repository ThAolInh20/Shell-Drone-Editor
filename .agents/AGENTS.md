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

