import { Clock } from './core/Clock.js';
import { CameraManager } from './core/CameraManager.js';
import { SceneManager } from './core/SceneManager.js';
import { Renderer } from './core/Renderer.js';
import { InputSystem } from './systems/InputSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { FireworkSystem } from './systems/FireworkSystem.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import './style.css';

// Initialize Core ECS Boilerplate
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();
const performanceMonitor = new PerformanceMonitor();
const fireworkSystem = new FireworkSystem(sceneManager.instance);

// Initialize Systems
const inputSystem = new InputSystem(cameraManager.instance, renderer.instance.domElement);
const movementSystem = new MovementSystem(inputSystem, cameraManager.instance);

renderer.instance.domElement.addEventListener('click', () => {
  if (inputSystem.controls.isLocked) {
    fireworkSystem.launchRandom();
  }
});

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  performanceMonitor.update(clock.deltaTime);
  
  // Systems update
  movementSystem.update(clock.deltaTime);
  fireworkSystem.update(clock.deltaTime);

  // Render loop
  renderer.render(sceneManager.instance, cameraManager.instance);
}

// Start simulation
animate();