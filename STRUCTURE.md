# STRUCTURE.md

## 1. Logical Modules

### App Entry & Orchestration
- **`src/main.js`**: Application entry point that wires core components, initializes systems, and orchestrates the render loop.

### Core Architecture
- **`src/core/SceneManager.js`**: Manages the THREE.js scene, base lighting, and fog configuration.
- **`src/core/CameraManager.js`**: Wraps the THREE.js PerspectiveCamera and handles aspect ratio resizing.
- **`src/core/Renderer.js`**: Wraps WebGLRenderer, handles canvas setup, pixel ratio, and window resizing.
- **`src/core/Clock.js`**: Tracks delta time and elapsed time for the simulation loop.
- **`src/core/PerformanceMonitor.js`**: Tracks FPS, memory usage, and simulation diagnostics.
- **`src/core/PostProcessingPipeline.js`**: Applies post-processing effects like bloom and antialiasing.
- **`src/config/rendering.js`**: Contains static configuration for renderer and post-processing.

### Entity Models & Generators
- **`src/entities/ShellEntity.js`**: Represents an active firework shell climbing into the sky.
  - `update(deltaTime)`: Applies gravity and age to the shell, returning true if it should burst.
  - `canBurst()`: Evaluates if apex height or negative velocity is reached.
  - `markBursted()`: Transitions shell state to bursted.
- **`src/entities/BurstShapeGenerator.js`**: Pure mathematical generator for particle spatial distribution in 3D.
  - `resolveShape(shellType)`: Normalizes requested shapes into valid internal shapes.
  - `direction(shape, angle, index, count, preset)`: Calculates a normalized direction vector for a given particle based on the shape.
- **`src/entities/BurstEffectProcessor.js`**: Pure mathematical processor for particle physics and material behavior.
  - `createHeightProfile(height, config)`: Scales particle size and brightness based on burst altitude.
  - `updateVelocity(...)`: Mutates particle velocity according to wind/gravity/effect patterns over time.
  - `materialOpacity(...)`: Calculates particle opacity based on age and blink/strobe effects.
- **`src/entities/ShellPresetFactory.js`**: Manages the library of predefined firework configurations.
  - `validatePreset(preset)`: Normalizes and defaults missing values in a preset.
  - `randomPreset()`: Returns a random valid shell configuration.

### Simulation Systems
- **`src/systems/FireworkSystem.js`**: Manages the lifecycle of firework shells, bursts, and particle trails.
  - `launchRandom(preset)`: Instantiates a new ShellEntity and emits the `firework:launch` event.
  - `update(deltaTime)`: Ticks all active shells/bursts and handles destruction.
  - `createBurst(...)`: Converts a bursted shell into a particle explosion.
- **`src/systems/SkyLightReactionSystem.js`**: Alters scene environment lighting and background color dynamically when fireworks burst.
  - `onBurst(detail)`: Enqueues a light flash reaction based on burst intensity and color.
  - `update(deltaTime)`: Blends ambient/hemisphere lighting and background color toward active reactions.
- **`src/systems/SmokeSystem.js`**: Generates and animates persistent smoke puffs from launches and bursts.
  - `onLaunch(detail)`: Spawns dense smoke near the launch zone.
  - `onBurst(detail)`: Spawns expanding smoke clusters at the burst altitude.
  - `update(deltaTime)`: Drifts and fades smoke particles.
- **`src/systems/MovementSystem.js`**: Updates camera position based on player input.
  - `update(deltaTime)`: Applies velocity to the camera based on active keys.
- **`src/systems/InputSystem.js`**: Captures keyboard/mouse events and manages pointer lock state.
  - `isPaused()`: Returns whether simulation is paused.
  - `getSelectedPreset()`: Returns the currently selected firework preset from UI.

## 2. Entry Points
- **App Boot**: `src/main.js` initializes all classes and enters the `requestAnimationFrame` loop.
- **User Interaction**:
  - `InputSystem` hooks DOM events (clicks for launch, keys for movement, escape for pause).
  - Canvas click listener in `main.js` explicitly calls `FireworkSystem.launchRandom()`.

## 3. Relationship Graph
- `main.js` -> (Core Components, Systems Components)
- `FireworkSystem` -> `ShellEntity`, `BurstShapeGenerator`, `BurstEffectProcessor`, `ShellPresetFactory`
- `MovementSystem` -> `InputSystem` (direct reference via constructor)
- `SkyLightReactionSystem` -> Listens to `firework:burst`
- `SmokeSystem` -> Listens to `firework:launch`, `firework:burst`
- `Renderer` -> `config/rendering.js`

## 4. Execution Flows
- **Simulation Loop**: `main.js animate()` -> `MovementSystem.update()` -> `FireworkSystem.update()` -> `SkyLightReactionSystem.update()` -> `SmokeSystem.update()` -> `Renderer/PostProcessing.render()`.
- **Firework Lifecycle**: 
  1. User Click / Auto-launch timer triggers `FireworkSystem.launchRandom()`.
  2. `FireworkSystem` creates `ShellEntity` and fires `firework:launch`.
  3. `SmokeSystem` catches `firework:launch` and spawns ground smoke.
  4. `FireworkSystem.update()` ticks `ShellEntity.update()`.
  5. Shell reaches apex -> `ShellEntity.update()` returns `true` -> `FireworkSystem` creates burst point cloud and fires `firework:burst`.
  6. `SkyLightReactionSystem` catches `firework:burst` and flashes sky.
  7. `SmokeSystem` catches `firework:burst` and spawns high-altitude smoke.
  8. `FireworkSystem.update()` continues ticking burst particles until their `maxLife` is reached.

## 5. Cross-Module Dependencies
- **Global Event Bus**: The system relies on `window.dispatchEvent(new CustomEvent(...))` to communicate between loosely coupled modules (`FireworkSystem` -> `SmokeSystem`, `SkyLightReactionSystem`).
- **THREE.js Scene Graph**: `SceneManager` instance is passed down so systems can directly add/remove meshes from the global scene.

## 6. Problems & Anti-patterns
- **God Class**: `FireworkSystem.js` is overly massive (600+ lines), handling auto-launching logic, diagnostics, shell ticking, burst math orchestration, trail particles, and rendering creation. It violates SRP.
- **Implicit Coupling via Global Events**: `SkyLightReactionSystem` and `SmokeSystem` rely on magic string events (`firework:burst`, `firework:launch`) dispatched to the global `window` object, making the data flow opaque and hard to debug.
- **Mixed Responsibility in `main.js`**: `main.js` mixes orchestration, simulation loop, and DOM event bindings (canvas click logic).
- **Dead Code**: `src/systems/PhysicSystem.js` exists as an empty file, and `src/counter.js` exists but is entirely unused.
