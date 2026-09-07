import { Clock } from './core/Clock.js';
import { CameraManager } from './core/CameraManager.js';
import { SceneManager } from './core/SceneManager.js';
import { Renderer } from './core/Renderer.js';
import { PostProcessingPipeline } from './core/PostProcessingPipeline.js';
import { InputSystem } from './systems/InputSystem.js';
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
import { setLanguage } from './config/lang/i18n.js';
import { HotkeyManager } from './core/HotkeyManager.js';
import { fileStorage } from './core/FileStorageAdapter.js';
import { globalEventBus } from './core/EventBus.js';
import { loadAndApplySettings } from './config/settings.js';

// Initialize Core ECS Boilerplate
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();
const performanceMonitor = new PerformanceMonitor();
const trailSystem = new TrailSystem(sceneManager.instance);
const smokeSystem = new SmokeSystem(sceneManager);
const fireworkSystem = new FireworkSystem(sceneManager.instance, trailSystem, smokeSystem);
const skyLightReactionSystem = new SkyLightReactionSystem(sceneManager);
const cometSystem = new CometSystem(sceneManager.instance, trailSystem, smokeSystem);
const audioSystem = new AudioSystem(cameraManager);
audioSystem.preload();
const postProcessing = renderingConfig.post.enabled
  ? new PostProcessingPipeline(renderer.instance, sceneManager.instance, cameraManager.instance, renderingConfig)
  : null;

renderer.addResizeListener((width, height, pixelRatio) => {
  sceneManager.onResize(width, height);
  if (postProcessing) {
    postProcessing.setSize(width, height, pixelRatio);
  }
});

if (postProcessing) {
  const initialQuality = localStorage.getItem('graphics_quality') || 'medium';
  postProcessing.setGraphicsQuality(initialQuality);
}

globalEventBus.on('graphics:quality', (quality) => {
  if (postProcessing) {
    postProcessing.setGraphicsQuality(quality);
  }
});

// Apply saved settings
loadAndApplySettings({
  renderer,
  postProcessing,
  audioSystem,
  smokeSystem
});

// Initialize Systems
const inputSystem = new InputSystem(
  cameraManager.instance,
  renderer.instance.domElement,
  fireworkSystem,
  renderer,
  postProcessing,
  audioSystem
);
const movementSystem = new MovementSystem(inputSystem, cameraManager.instance);

const droneSystem = new DroneSystem(sceneManager);
const droneSequencer = new DroneShowSequencer(droneSystem);
// Note: We no longer auto-play demo sequence because ShowDirector manages it


const fireworkSequencer = new FireworkSequencer(fireworkSystem, cometSystem);
const showDirector = new ShowDirector(fireworkSequencer, fireworkSystem);
showDirector.droneSequencer = droneSequencer;
const hotkeyManager = new HotkeyManager();
const timelineEditor = new TimelineEditor(showDirector, hotkeyManager);

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

hotkeyManager.register('global', 'shift+y', () => {
  if (performanceMonitor.overlay) {
    performanceMonitor.overlay.style.display = performanceMonitor.overlay.style.display === 'none' ? '' : 'none';
  }
  if (inputSystem.statusOverlay) {
    inputSystem.statusOverlay.style.display = inputSystem.statusOverlay.style.display === 'none' ? '' : 'none';
  }
});

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  performanceMonitor.update(clock.deltaTime);
  sceneManager.update(clock.deltaTime);
  
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

  // Reflection render pass
  sceneManager.renderReflection(renderer.instance, cameraManager.instance);

  // Render loop
  if (postProcessing) {
    postProcessing.render();
  } else {
    renderer.render(sceneManager.instance, cameraManager.instance);
  }
}

// Start simulation
animate();

// Bind Native IPC Language Selector Event
fileStorage.onChangeLanguage((lang) => {
  setLanguage(lang);
  window.location.reload();
});
