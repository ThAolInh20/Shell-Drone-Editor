# Phase 1 Epics: Scene + Movement Foundation
**Project**: shell-drone-animation  
**Phase**: 1 - Foundation (Scene + Camera + Navigation)  
**Duration**: 1 sprint (~5 days)  
**Goal**: Validate Three.js rendering + FPS camera + scene navigation  

---

## Epic 1: Renderer Setup & Three.js Foundation

### Description
Initialize Three.js renderer, establish rendering pipeline, and validate performance baseline.

### User Stories

#### Story 1.1: Initialize Three.js Renderer
**As a** developer  
**I want to** set up Three.js rendering context  
**So that** the application can display 3D content to the screen

**Acceptance Criteria**:
- [ ] Three.js WebGLRenderer initialized
- [ ] Fullscreen canvas (1920x1080 min, responsive on resize)
- [ ] Black background (night sky preparation)
- [ ] 60fps target (frame limiter)
- [ ] No console errors on startup

**Technical Notes**:
- Use existing `Renderer.js` in `src/core/`
- Anti-aliasing enabled
- Pixel ratio = window.devicePixelRatio

---

#### Story 1.2: Scene & Lighting Setup
**As a** developer  
**I want to** create a Three.js scene with lighting  
**So that** objects render with proper illumination

**Acceptance Criteria**:
- [ ] Three.js Scene created
- [ ] Ambient light added (scene glow, no harsh shadows)
- [ ] Scene background dark (RGB 0,0,10 or close)
- [ ] Lights positioned for night sky effect
- [ ] Performance: 0ms lighting overhead on empty scene

**Technical Notes**:
- Ambient light intensity ~0.3 (subtle)
- No point lights yet (reserve for later effects)
- Use existing `SceneManager.js`

---

#### Story 1.3: Performance Monitoring & Baseline
**As a** developer  
**I want to** measure frame time, GPU load, memory  
**So that** I can detect regressions and optimize

**Acceptance Criteria**:
- [ ] FPS counter on screen (top-right)
- [ ] Frame time logged to console
- [ ] Memory usage tracked (GC count)
- [ ] 60fps sustained over 1 minute (empty scene)
- [ ] No memory leaks detected

**Technical Notes**:
- Use three.js stats API or custom timer
- Profile with Chrome DevTools every sprint
- Establish baseline (must maintain this)

---

#### Story 1.3.1: PerformanceMonitor Utility
**As a** developer  
**I want to** create a reusable performance monitoring module  
**So that** all systems can collect FPS, frame time and memory data consistently

**Acceptance Criteria**:
- [ ] `PerformanceMonitor.js` module created
- [ ] Exposes FPS, frame time, and memory metrics
- [ ] Used by renderer and any future performance tests
- [ ] Easy to extend for Phase 2/Phase 3 profiling

**Technical Notes**:
- Keep it framework-agnostic
- Export `getFPS()`, `getFrameTime()`, `getMemoryUsage()`
- Use it in both UI overlay and console logging

---

#### Story 1.4: Application Entry Point
**As a** developer  
**I want to** define the main application entry point  
**So that** initialization order and animation loop are clear

**Acceptance Criteria**:
- [ ] `src/main.js` initializes Renderer, Scene, Camera, Clock, Input
- [ ] `animate()` loop starts cleanly
- [ ] Window resize handling updates renderer and camera
- [ ] No startup race conditions

**Technical Notes**:
- Use `requestAnimationFrame` from `main.js`
- Ensure systems initialize before first frame
- Document order clearly

---

### Deliverables
- ✅ Blank night sky renders at 60fps
- ✅ No rendering errors
- ✅ Performance baseline established

---

## Epic 2: Camera Manager (FPS Camera)

### Description
Implement first-person camera with smooth movement and perspective control.

### User Stories

#### Story 2.1: FPS Camera Position & Orientation
**As a** user  
**I want to** have a free-moving camera in 3D space  
**So that** I can explore the night sky

**Acceptance Criteria**:
- [ ] Camera starts at center (0, 0, 0)
- [ ] Camera height = 1.7 units (eye level)
- [ ] Looking direction = forward (0, 0, -1) at start
- [ ] No camera jitter or stuttering
- [ ] Field of view = 75 degrees (reasonable wide)

**Technical Notes**:
- Use Three.js PerspectiveCamera
- Start position: (0, 1.7, 0)
- Clipping planes: near=0.1, far=5000

---

#### Story 2.2: Mouse Look-Around
**As a** user  
**I want to** rotate camera with mouse movement  
**So that** I can look in any direction

**Acceptance Criteria**:
- [ ] Mouse move updates camera rotate.x (pitch -π/2 to π/2)
- [ ] Mouse move updates camera rotate.z (yaw 0 to 2π)
- [ ] Mouse sensitivity = 0.002 rad/pixel (default, tunable)
- [ ] Smooth interpolation (no jank)
- [ ] Invert Y-axis option in code (default: false)
- [ ] Gimbal lock prevention implemented

**Technical Notes**:
- Use Euler angles or Quaternion for rotation
- Clamp pitch to prevent flip
- Use existing `InputSystem.js` for mouse events
- Store mouse delta from last frame

---

#### Story 2.2.1: Mouse Sensitivity Configuration
**As a** user  
**I want to** adjust mouse sensitivity  
**So that** camera control feels natural for my setup

**Acceptance Criteria**:
- [ ] Sensitivity adjustable in code or config
- [ ] Default value set to 0.002 rad/pixel
- [ ] Value persisted across sessions if config available
- [ ] Changes affect current pointer lock session immediately

**Technical Notes**:
- Store default in a settings object
- Optionally persist via localStorage
- Keep UI minimal for Phase 1

---

#### Story 2.3: Camera Velocity & Smooth Movement
**As a** developer  
**I want to** apply velocity-based camera motion  
**So that** movement feels smooth and responsive

**Acceptance Criteria**:
- [ ] Camera has velocity vector (vx, vy, vz)
- [ ] Velocity updated each frame from input
- [ ] Position += velocity * deltaTime
- [ ] Acceleration/deceleration (not instant stops)
- [ ] Movement feels natural (no teleporting)

**Technical Notes**:
- Acceleration: 0.1 units/s²
- Max velocity: 15 units/s
- Friction: 0.85 (velocity *= 0.85 per frame)

---

### Deliverables
- ✅ Camera responds to mouse (smooth look)
- ✅ Camera responds to WASD (smooth walk)
- ✅ No clipping, gimbal lock, or jank

---

## Epic 3: Input System (WASD + Mouse)

### Description
Capture keyboard and mouse input, translate to camera commands.

### User Stories

#### Story 3.1: WASD Movement Input
**As a** user  
**I want to** press WASD to move forward/left/back/right  
**So that** I can navigate the scene

**Acceptance Criteria**:
- [ ] W = move forward along camera direction
- [ ] A = move left (perpendicular to camera)
- [ ] S = move backward
- [ ] D = move right
- [ ] Multiple keys pressed simultaneously work
- [ ] Input lag < 50ms

**Technical Notes**:
- Track key state (pressed/released)
- Use keyboard events (keydown, keyup)
- Integrate with CameraManager velocity
- Use existing `InputSystem.js`

---

#### Story 3.2: Mouse Control Lock
**As a** user  
**I want to** lock mouse to window when focused  
**So that** camera doesn't spin when I move mouse outside

**Acceptance Criteria**:
- [ ] On click, request pointer lock
- [ ] Mouse moves update camera rotation (not cursor position)
- [ ] ESC releases lock
- [ ] Fallback to normal mouse if lock unavailable

**Technical Notes**:
- Use Pointer Lock API (element.requestPointerLock())
- Handle permission denied gracefully
- Test on different browsers (FF, Chrome, Safari)

---

#### Story 3.3: Keyboard Shortcuts Framework
**As a** developer  
**I want to** have a registry for keyboard shortcuts  
**So that** future features can bind keys easily

**Acceptance Criteria**:
- [ ] Shortcut system initialized
- [ ] ESC = release pointer lock or exit to menu placeholder
- [ ] No conflicts with WASD/mouse
- [ ] Framework easy to extend

**Technical Notes**:
- Create `ShortcutManager.js` or extend `InputSystem.js`
- Map key codes to handlers
- Priority system (game > menu)

---

#### Story 3.4: First Launch Onboarding
**As a** user  
**I want to** see a simple controls guide on first launch  
**So that** I know how to move and look around

**Acceptance Criteria**:
- [ ] Overlay appears on first launch
- [ ] Shows: WASD to move, mouse to look, ESC to release lock
- [ ] User can dismiss overlay
- [ ] Overlay is minimal and non-intrusive

**Technical Notes**:
- Use HTML/CSS overlay or canvas text
- Keep design lightweight
- Reuse overlay code for future tutorial prompts

---

### Deliverables
- ✅ WASD moves camera smoothly
- ✅ Mouse look works without jank
- ✅ Input responds to all devices (keyboard, mouse)

---

## Epic 4: Scene Content (Stars + Moon)

### Description
Populate night sky with celestial objects (stars and moon).

### User Stories

#### Story 4.1: Starfield Geometry
**As a** developer  
**I want to** create a starfield background  
**So that** users see stars in the night sky

**Acceptance Criteria**:
- [ ] 1000+ stars rendered
- [ ] Stars positioned in sphere around scene (radius 1000)
- [ ] Star brightness varies (magnitude 1-6)
- [ ] Star colors vary slightly (white, blue, yellow)
- [ ] Performance: < 2ms render time
- [ ] No flickering or popping (stars always visible)

**Technical Notes**:
- Use Three.js PointsGeometry or SpriteGeometry
- Stars use 2D circles (billboards)
- Positions: random on sphere (use spherical coordinates)
- Create `CelestialSystem.js` for this

**Implementation approach**:
```javascript
// Pseudo-code
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  addStar(x, y, z, brightness, color);
}
```

---

#### Story 4.2: Moon Visualization
**As a** developer  
**I want to** add a moon to the scene  
**So that** it serves as a visual reference point

**Acceptance Criteria**:
- [ ] Moon rendered as large glowing sphere
- [ ] Position: fixed or parametric (e.g., 45° elevation)
- [ ] Size: visually dominant but not overwhelming
- [ ] Glow effect (bloom or halo)
- [ ] Performance: < 1ms render time

**Technical Notes**:
- Moon position: (Math.sin(angle) * 500, Math.cos(angle) * 500, -500)
- Size: radius 20-30 units
- Material: MeshBasicMaterial with emissive light
- Use post-processing or shader for glow

---

### Deliverables
- ✅ Night sky filled with visible stars
- ✅ Moon visible as reference point
- ✅ User can orient themselves by celestial objects

---

## Epic 5: Clock & Frame Timing

### Description
Establish game loop timing, deltaTime, and frame coordination.

### User Stories

#### Story 5.1: Game Loop & Delta Time
**As a** developer  
**I want to** govern frame timing and deltaTime calculation  
**So that** all systems update consistently

**Acceptance Criteria**:
- [ ] requestAnimationFrame loop established
- [ ] deltaTime calculated per frame
- [ ] deltaTime clamped (max 16.67ms at 60fps, max 33ms for <30fps)
- [ ] Consistent across systems (Camera, Scene, Physics)
- [ ] No frame drops below 50fps on target hardware

**Technical Notes**:
- Use existing `Clock.js` in `src/core/`
- deltaTime in seconds for all systems
- Call all update(deltaTime) in correct order

---

#### Story 5.2: Frame Update Order
**As a** developer  
**I want to** define the frame update sequence  
**So that** systems update in correct dependency order

**Acceptance Criteria**:
- [ ] Update order: Input → Camera → Scene → Renderer
- [ ] No circular dependencies
- [ ] Clear, documented order in main loop

**Technical Notes**:
```javascript
// Main loop (pseudo-code)
function animate() {
  const deltaTime = clock.getDelta();
  inputSystem.update(deltaTime);
  cameraManager.update(deltaTime);
  sceneManager.update(deltaTime);  // planets/stars if animated
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

---

## Phase 1 Integration Test

### Story: End-to-End Navigation Test
**As a** tester  
**I want to** walk around the night sky and verify all systems work together  
**So that** Phase 1 is ready for Phase 2

**Acceptance Criteria**:
- [ ] Launch app → black sky visible
- [ ] Move mouse → camera rotates smoothly
- [ ] Press W → walk forward
- [ ] Press A/S/D → strafe/backward/right
- [ ] Stars remain visible from any position
- [ ] Moon visible as reference
- [ ] 60fps maintained throughout
- [ ] ESC closes pointer lock
- [ ] No console errors

**Test duration**: 5 minutes continuous navigation

---

## Acceptance Criteria - Phase 1 Complete

**MUST HAVE**:
- ✅ Renderer: 60fps empty night sky
- ✅ Camera: Smooth FPS-style movement (WASD + mouse)
- ✅ Scene: 1000+ stars + moon visible
- ✅ Input: WASD + mouse fully responsive
- ✅ Performance: 60fps sustained, no memory leaks
- ✅ No crashes or console errors
- ✅ Clear code quality: documented initialization, no console warnings

**NICE TO HAVE** (can defer to Phase 2):
- ⚫ Settings UI (mouse sensitivity, graphics quality)
- ⚫ Screenshot capability

---

## Phase 1 Sign-Off Process

- Amelia completes all Phase 1 stories and passes integration tests
- John reviews demo and metrics
- John approves: "Phase 1 ✅ Complete"
- Phase 2 development begins only after sign-off

---

## Development Timeline

| Day | Task | Owner |
|-----|------|-------|
| Day 1 | Epic 1 (Renderer) + Epic 5 (Clock) | Amelia |
| Day 2 | Epic 2 (Camera) + Epic 3 (Input) | Amelia |
| Day 3 | Epic 4 (Stars + Moon) | Amelia |
| Day 4 | Integration + Performance Testing | Amelia |
| Day 5 | Polish + Bug Fixes + Documentation | Amelia |

---

## Success Metrics

- ✅ **Performance**: 60fps on 1080p, RTX 3060+ GPU
- ✅ **Responsiveness**: Input lag < 50ms
- ✅ **Stability**: 5-minute play session, zero crashes
- ✅ **Visual**: Stars visible, moon prominent, night sky immersive
- ✅ **Memory**: No leaks over 10-minute runtime

---

## Notes for Amelia

**Implementation Priority**:
1. Get SOMETHING rendering (Epic 1, day 1)
2. Get user input working (Epic 2 + 3, day 2)
3. Add celestial objects (Epic 4, day 3)
4. Test & optimize (day 4-5)

**Tools**:
- Three.js r128+ (latest stable)
- Use existing `src/core` modules (Renderer, Clock, SceneManager, InputSystem, CameraManager)
- Check `package.json` for dependencies

**Questions for Winston if stuck**:
- Celestial sphere radius vs camera far clipping plane trade-off?
- Star brightness algorithm (logarithmic vs linear)?
- Moon glow: post-processing vs material emissive?

---

## Next Phase (Phase 2) - Blocked Until Phase 1 Complete
- Shell System (launch2)
- Star Particles (pool management)
- Physics (gravity, drag, air resistance)
- Effects (floral, crackle)

**Do NOT start Phase 2 until Phase 1 PASSES all acceptance criteria.**

