---
name: merge-dev-to-tool-edit
description: Mini rule to safely port firework physics and effect changes from the dev branch to the tool-edit branch without breaking the Timeline UI.
---

<objective>
Safely migrate "Core Engine Sandbox" changes (firework physics, shapes, effects) from the `dev` branch to the "UI & Tooling" `tool-edit` branch.
</objective>

<rules>
1. **FOCUS ON SIMULATION SYSTEMS ONLY**: Only port changes related to the firework engine. This typically includes files in:
   - `src/systems/FireworkSystem.js`
   - `src/systems/TrailSystem.js`
   - `src/factories/BurstShapeGenerator.js`
   - `src/factories/BurstEffectProcessor.js`
   - `src/factories/ShellPresetFactory.js`
   - `src/entities/ShellEntity.js`
   
2. **DO NOT TOUCH ORCHESTRATORS**: DO NOT overwrite `src/directors/ShowDirector.js`, `src/directors/FireworkSequencer.js`, or `src/controllers/InputSystem.js` using raw branch merging. The `tool-edit` branch has heavily modified these files to support Timeline Audio Sync, sequence parsing, and Editor DOM events. Overwriting them with `dev` branch logic will break the Timeline UI.

3. **PRESERVE CLEARING PROTOCOLS**: If the `dev` branch adds new visual systems (like a new particle emitter), ensure that when porting to `tool-edit`, you hook it into the `firework:clear` global event so the Timeline Editor can scrub/pause properly without leaving ghost particles.

4. **API COMPATIBILITY**: Ensure that any changes to `launchRandom` or `launch` payload generation do not change the method signature expected by `FireworkSequencer.js` or `ShowDirector.js`.
</rules>

<process>
1. Check out the `tool-edit` branch.
2. Review the diffs made on the `dev` branch for the firework engine.
3. For pure simulation files that haven't been modified by the UI tooling (e.g., `BurstShapeGenerator.js`), you can safely copy them over.
4. For mixed files (where `tool-edit` has custom code, e.g., `FireworkSystem.js` with its `burstAll()` method), **manually patch** the new `dev` logic into the `tool-edit` file without deleting the `tool-edit` specific methods.
5. Run the app, drop a sequence into the Timeline Editor, scrub, play, and pause to ensure the new physics don't break the editor's time control.
</process>
