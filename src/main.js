import { Clock } from './core/Clock.js';
import { CameraManager } from './core/CameraManager.js';
import { SceneManager } from './core/SceneManager.js';
import { Renderer } from './core/Renderer.js';
import { PostProcessingPipeline } from './core/PostProcessingPipeline.js';
import { InputSystem } from './controllers/InputSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { FireworkSystem } from './systems/FireworkSystem.js';
import { TrailSystem } from './systems/TrailSystem.js';
import { CometSystem } from './systems/CometSystem.js';
import { SkyLightReactionSystem } from './systems/SkyLightReactionSystem.js';
import { SmokeSystem } from './systems/SmokeSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { FireworkSequencer } from './directors/FireworkSequencer.js';
import { ShowDirector } from './directors/ShowDirector.js';
import { DroneSystem } from './systems/DroneSystem.js';
import { DroneShowSequencer } from './directors/DroneShowSequencer.js';
import { TimelineEditor } from './ui/TimelineEditor.js';
import droneDemoData from '../config/sequences/droneDemo.json';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { renderingConfig } from './config/rendering.js';
import './style.css';

// Initialize Core ECS Boilerplate
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();
const performanceMonitor = new PerformanceMonitor();
const trailSystem = new TrailSystem(sceneManager.instance);
const fireworkSystem = new FireworkSystem(sceneManager.instance, trailSystem);
const smokeSystem = new SmokeSystem(sceneManager);
const skyLightReactionSystem = new SkyLightReactionSystem(sceneManager);
const cometSystem = new CometSystem(sceneManager.instance, trailSystem, smokeSystem);
const audioSystem = new AudioSystem(cameraManager);
audioSystem.preload();
const postProcessing = renderingConfig.post.enabled
  ? new PostProcessingPipeline(renderer.instance, sceneManager.instance, cameraManager.instance, renderingConfig)
  : null;

if (postProcessing) {
  renderer.addResizeListener((width, height, pixelRatio) => {
    postProcessing.setSize(width, height, pixelRatio);
  });
}


// Initialize Systems
const inputSystem = new InputSystem(cameraManager.instance, renderer.instance.domElement, fireworkSystem);
const movementSystem = new MovementSystem(inputSystem, cameraManager.instance);

const droneSystem = new DroneSystem(sceneManager);
const droneSequencer = new DroneShowSequencer(droneSystem);
// Note: We no longer auto-play demo sequence because ShowDirector manages it


const fireworkSequencer = new FireworkSequencer(fireworkSystem, cometSystem);
const showDirector = new ShowDirector(fireworkSequencer, fireworkSystem);
showDirector.droneSequencer = droneSequencer;
const timelineEditor = new TimelineEditor(showDirector);

// The show script loading is now handled in InputSystem

// Expose to input system or global for triggering
inputSystem.showDirector = showDirector;
inputSystem.timelineEditor = timelineEditor;

renderer.instance.domElement.addEventListener('click', () => {
  audioSystem.resume();
  if (inputSystem.controls.isLocked && !inputSystem.isPaused()) {
    const preset = inputSystem.getSelectedPreset();
    if (preset && preset.type === 'comet_cluster') {
      cometSystem.launchRandom(preset, { effectOverrides: { instantBurst: false } });
    } else {
      fireworkSystem.launchRandom(preset, { effectOverrides: { instantBurst: false } });
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyY' && e.shiftKey) {
    if (performanceMonitor.overlay) {
      performanceMonitor.overlay.style.display = performanceMonitor.overlay.style.display === 'none' ? '' : 'none';
    }
    if (inputSystem.statusOverlay) {
      inputSystem.statusOverlay.style.display = inputSystem.statusOverlay.style.display === 'none' ? '' : 'none';
    }
  }
});

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  performanceMonitor.update(clock.deltaTime);
  
  // Systems update
  if (!inputSystem.isPaused()) {
    movementSystem.update(clock.deltaTime);
    showDirector.update(clock.deltaTime);
    fireworkSequencer.update(clock.deltaTime);
    droneSequencer.update(clock.deltaTime);
    droneSystem.update(clock.deltaTime);
    fireworkSystem.update(clock.deltaTime);
    cometSystem.update(clock.deltaTime);
    trailSystem.update(clock.deltaTime);
    skyLightReactionSystem.update(clock.deltaTime);
    smokeSystem.update(clock.deltaTime);
  } else {
    droneSequencer.update(clock.deltaTime);
    droneSystem.update(clock.deltaTime);
    skyLightReactionSystem.update(clock.deltaTime);
    smokeSystem.update(clock.deltaTime);
  }

  // Render loop
  if (postProcessing) {
    postProcessing.render();
  } else {
    renderer.render(sceneManager.instance, cameraManager.instance);
  }
}

// Start simulation
animate();