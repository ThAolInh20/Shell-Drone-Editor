import { Clock } from '../core/Clock.js';
import { CameraManager } from '../core/CameraManager.js';
import { SceneManager } from '../core/SceneManager.js';
import { Renderer } from '../core/Renderer.js';
import { FormationDirector } from './FormationDirector.js';
import '../style.css';
import { setLanguage } from '../lang/i18n.js';


// Initialize Core ECS Boilerplate
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();

const formationDirector = new FormationDirector(sceneManager, cameraManager, renderer);

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  
  // Update Director
  formationDirector.update(clock.deltaTime);

  // Render loop
  renderer.render(sceneManager.instance, cameraManager.instance);
}

// Start simulation
animate();

if (window.electronAPI && window.electronAPI.onChangeLanguage) {
  window.electronAPI.onChangeLanguage((lang) => {
    setLanguage(lang);
    window.location.reload();
  });
}

