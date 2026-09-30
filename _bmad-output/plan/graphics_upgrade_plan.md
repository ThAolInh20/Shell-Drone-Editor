# Graphics Upgrade Plan - Cinematic Pyrotechnic Visual Fidelity

## 1. Executive Summary & Objectives
This plan defines the architectural roadmap to elevate the visual fidelity of the 3D Pyrotechnic and Drone Show engine to Cinematic AAA standards while strictly maintaining rock-solid 60 FPS performance.

### Key Objectives
- Implement realistic High Dynamic Range (HDR) Thermal Core shaders for fireworks, comets, and trails.
- Introduce velocity-aligned motion streaks for high-speed burst particles.
- Enhance atmospheric illumination across volumetric smoke, water reflections, and background silhouettes.
- Add subtle acoustic camera impulses for large shell detonations.
- Maintain full scalability across Low, Medium, High, and Ultra graphics presets.

---

## 2. Technical Architecture & Pillars

### Pillar 1: HDR Thermal Core & Spectral Falloff Shaders
In real pyrotechnics, combustion temperatures exceed 2800 degrees Celsius, creating an over-exposed white thermal core that blends into saturated metal-salt colors.

#### Implementation Target
- Files:
  - `./src/systems/FireworkSystem.js`
  - `./src/entities/CometEntity.js`
  - `./src/systems/TrailSystem.js`
- Shader Mechanism:
  - Implement a 3-tier radial color ramp in GLSL fragment shaders:
    - Tier 1 (Center 0.0 to 0.22): Pure white thermal highlight (`vec3(1.0, 1.0, 1.0)`) with bloom threshold boost.
    - Tier 2 (0.22 to 0.70): Saturated core chemical color (Strontium Red, Barium Green, Sodium Gold, Copper Blue).
    - Tier 3 (0.70 to 1.0): Exponential alpha decay with chromatic glow tint.

---

### Pillar 2: Velocity Motion Streaks for High-Speed Particles
Burst particles flying at 40 to 60 m/s should appear stretched along their instantaneous velocity vector rather than as static circles.

#### Implementation Target
- Files:
  - `./src/systems/FireworkSystem.js`
  - `./src/shaders/BurstParticleShader.js`
- Shader / Geometry Mechanism:
  - Pass instantaneous velocity vector (`aVelocity`) as a vertex attribute to the burst geometry.
  - In vertex / geometry shader, scale point size along the projected motion axis or transform into dynamic instanced line quads with directional fade.

---

### Pillar 3: Dynamic Environmental & Volumetric Illumination
Large aerial bursts must cast dynamic light onto the surrounding environment to create realistic nocturnal atmosphere.

#### Implementation Target
- Files:
  - `./src/systems/SkyLightReactionSystem.js`
  - `./src/environment/WaterSurface.js`
  - `./src/environment/DistantMountains.js`
  - `./src/systems/SmokeSystem.js`
- Mechanisms:
  - **Smoke Color Bounce**: When a shell bursts, inject instantaneous point irradiance into `./src/systems/SmokeSystem.js` to tint nearby drifting smoke with the firework's primary hue.
  - **Anisotropic Water Specular**: Enhance `./src/environment/WaterSurface.js` fragment shader to render vertical specular streaks reflecting aerial flash bursts.
  - **Mountain Silhouette Rim Light**: Modulate ambient rim lighting on `./src/environment/DistantMountains.js` synchronously with burst flashes.

---

### Pillar 4: Acoustic Camera Impulse & Shockwave Dynamics
Massive 6-inch shell detonations and Finale barrages produce acoustic shockwaves that impart micro-impulses to the observer perspective.

#### Implementation Target
- Files:
  - `./src/core/CameraManager.js`
  - `./src/systems/FireworkSystem.js`
- Mechanism:
  - Dispatch a `camera:shake` event on heavy bursts with intensity scaled by `shellSize` and inversely proportional to camera distance.
  - Apply a damped harmonic oscillator impulse to camera position with rapid decay (0.15s to 0.35s).

---

## 3. Phased Implementation Roadmap

### Phase 1: HDR Thermal Core Shaders
1. Upgrade `./src/systems/FireworkSystem.js` global burst particle fragment shader.
2. Upgrade `./src/systems/TrailSystem.js` points material with multi-stop thermal core.
3. Update `./src/entities/CometEntity.js` core mesh material with HDR intensity emission.

### Phase 2: Velocity Motion Streaks
1. Add `aVelocity` buffer attribute to `FireworkSystem.globalBurstGeometry`.
2. Implement motion stretch vertex transformation.
3. Verify visual alignment with fast bursts and slow droop dynamics.

### Phase 3: Environmental Illumination & Smoke Tinting
1. Extend `SkyLightReactionSystem` to broadcast burst color and intensity.
2. Update `SmokeSystem` particle shaders to receive and blend flash light.
3. Upgrade `WaterSurface` shader with dynamic specular streak calculations.

### Phase 4: Acoustic Impulse & Performance Validation
1. Add damped micro-shake impulse generator in `CameraManager`.
2. Connect heavy shell burst events to camera impulse dispatcher.
3. Benchmark frame rates on heavy sequence barrages across all quality presets.

---

## 4. Quality Settings Matrix

| Feature | Low | Medium | High | Ultra |
|---|---|---|---|---|
| HDR Thermal Core | Standard | Active | Active | Active with Bloom Boost |
| Motion Streaks | Off | Off | Active | Active with Sub-stepping |
| Smoke Illumination | Off | Off | Direct Tint | Multi-point Volumetric |
| Water Specular Streaks | Planar Only | Planar Only | Dynamic Streaks | High Precision Anisotropic |
| Acoustic Camera Shake | Off | Active | Active | Active with Distance Delay |

---

## 5. Acceptance Criteria
- 60 FPS maintained during dense Finale sequences (50+ simultaneous shells).
- Zero JavaScript memory allocation in render/update loops.
- All shaders compile cleanly across WebGL2 / WebGPU pipelines.
- Unit tests pass with zero regressions in `./tests/`.
