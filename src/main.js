import { Clock } from './core/Clock.js';
import { CameraManager } from './core/CameraManager.js';
import { SceneManager } from './core/SceneManager.js';
import { Renderer } from './core/Renderer.js';
import { PostProcessingPipeline } from './core/PostProcessingPipeline.js';
import { InputSystem } from './systems/InputSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { FireworkSystem } from './systems/FireworkSystem.js';
import { SkyLightReactionSystem } from './systems/SkyLightReactionSystem.js';
import { SmokeSystem } from './systems/SmokeSystem.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { renderingConfig } from './config/rendering.js';
import './style.css';

// Initialize Core ECS Boilerplate
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();
const performanceMonitor = new PerformanceMonitor();
const fireworkSystem = new FireworkSystem(sceneManager.instance);
const skyLightReactionSystem = new SkyLightReactionSystem(sceneManager);
const smokeSystem = new SmokeSystem(sceneManager);
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

renderer.instance.domElement.addEventListener('click', () => {
  if (inputSystem.controls.isLocked && !inputSystem.isPaused()) {
    fireworkSystem.launchRandom(inputSystem.getSelectedPreset());
  }
});

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  performanceMonitor.update(clock.deltaTime);
  
  // Systems update
  if (!inputSystem.isPaused()) {
    movementSystem.update(clock.deltaTime);
    fireworkSystem.update(clock.deltaTime);
    skyLightReactionSystem.update(clock.deltaTime);
    smokeSystem.update(clock.deltaTime);
  } else {
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