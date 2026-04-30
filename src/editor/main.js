import { Clock } from '../core/Clock.js';
import { CameraManager } from '../core/CameraManager.js';
import { SceneManager } from '../core/SceneManager.js';
import { Renderer } from '../core/Renderer.js';
import { EditorDirector } from './EditorDirector.js';
import { PerformanceMonitor } from '../core/PerformanceMonitor.js';

// Khởi tạo các Core ECS tương tự main.js nhưng không load ShowSequencer
const clock = new Clock();
const renderer = new Renderer();
const cameraManager = new CameraManager();
const sceneManager = new SceneManager();
const performanceMonitor = new PerformanceMonitor();

// Di chuyển camera về gần tâm điểm để tiện nhìn khối
cameraManager.instance.position.set(0, 50, 150);

const editorDirector = new EditorDirector(sceneManager, cameraManager, renderer);

function animate() {
  requestAnimationFrame(animate);

  clock.update();
  performanceMonitor.update(clock.deltaTime);
  
  editorDirector.update(clock.deltaTime);

  // Render loop
  renderer.render(sceneManager.instance, cameraManager.instance);
}

// Start simulation
animate();
