import { Clock } from '../core/Clock.js';
import { CameraManager } from '../core/CameraManager.js';
import { SceneManager } from '../core/SceneManager.js';
import { Renderer } from '../core/Renderer.js';
import { FormationDirector } from './FormationDirector.js';
import '../style.css';


// Initialize Core ECS Boilerplate
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();

renderer.addResizeListener((width, height) => {
  sceneManager.onResize(width, height);
});

const formationDirector = new FormationDirector(sceneManager, cameraManager, renderer);

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  sceneManager.update(clock.deltaTime);
  
  // Update Director
  formationDirector.update(clock.deltaTime);

  // Reflection render pass
  sceneManager.renderReflection(renderer.instance, cameraManager.instance);

  // Render loop
  renderer.render(sceneManager.instance, cameraManager.instance);
}

// Start simulation
animate();

