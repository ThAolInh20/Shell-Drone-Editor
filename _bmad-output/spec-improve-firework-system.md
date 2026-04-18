---
title: 'Improve Firework System with Trail Particles, Shapes, and Auto Processes'
type: 'feature'
created: '2026-04-18'
status: 'in-review'
baseline_commit: 'feat/add-flash-for-shell'
context: ['src/systems/FireworkSystem.js', 'src/core/SceneManager.js', 'src/systems/InputSystem.js']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Current fireworks implementation is too generic, consisting of a single dot that explodes into other dots, lacking realistic particle effects from launch to burst.

**Approach:** Enhance FireworkSystem to include trail particles with gravity during launch phase, support multiple burst shapes beyond spheres, and add automatic launch sequences for better viewer experience.

## Boundaries & Constraints

**Always:** Maintain ECS architecture, use Three.js BufferGeometry for performance, ensure physics simulation with gravity (-30 units/s²) and drag, keep code modular for future extensions.

**Ask First:** If introducing new Three.js features or dependencies beyond current setup.

**Never:** Break existing Phase 1 features (scene, movement, floor, pointer lock), change core camera or renderer setup.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy Path Launch | User clicks on launch pad | Shell launches with trail particles falling under gravity, bursts into sphere shape | N/A |
| Burst Shape Variation | Config specifies 'star' shape | Burst particles form star pattern instead of sphere | Fallback to sphere if shape invalid |
| Auto Launch | Auto system enabled, time-based | Launches fireworks automatically in sequence | Skip if manual launch active |
| Performance Edge | High particle count (>1000) | Maintains 60 FPS, uses object pooling | Reduce particles if FPS drops below 30 |

</frozen-after-approval>

## Code Map

- `src/systems/FireworkSystem.js` -- Core firework logic, launch, burst, and particle management
- `src/core/SceneManager.js` -- Scene setup, launch pad integration
- `src/systems/InputSystem.js` -- Click event handling for manual launch
- `src/main.js` -- System initialization and update loop

## Tasks & Acceptance

**Execution:**
- [x] `src/systems/FireworkSystem.js` -- Add trail particle spawning and physics during launch -- Implemented trail particles with gravity in launch phase
- [x] `src/systems/FireworkSystem.js` -- Extend burst to support multiple shapes (sphere, star) -- Added shape parameter and star burst logic
- [x] `src/systems/FireworkSystem.js` -- Add auto-launch system with sequences -- Implemented auto-launch timer with random shapes
- [x] `src/core/SceneManager.js` -- Ensure launch pad visibility and positioning -- Already implemented
- [x] `src/systems/InputSystem.js` -- Update instructions for new features -- Added space key for auto mode

**Acceptance Criteria:**
- Given user clicks launch pad, when shell launches, then trail particles spawn and fall with gravity
- Given config sets burst shape to 'star', when burst occurs, then particles form star pattern
- Given auto mode enabled, when time passes, then fireworks launch automatically in sequence
- Given high load, when particles exceed limit, then FPS remains above 30

## Spec Change Log

## Design Notes

Trail particles: Spawn 5-10 per frame during launch, each with random velocity offset, gravity applied immediately. Use Points geometry for rendering.

Burst shapes: Define shape functions (e.g., createSphereBurst, createStarBurst) that generate particle positions based on shape.

Auto system: New AutoLaunchSystem class with timer and sequence arrays, integrated into main update loop.

## Verification

**Commands:**
- `npm run build` -- expected: No errors, bundle size reasonable
- `npm run dev` -- expected: App runs, click launches with trail, auto mode works

**Manual checks (if no CLI):**
- Inspect particle rendering in browser, verify gravity effect on trail</content>
<parameter name="filePath">e:\shell-drone-animation\_bmad-output\spec-improve-firework-system.md