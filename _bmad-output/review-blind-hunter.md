# Blind Hunter Review Prompt

Use the `bmad-review-adversarial-general` skill to review the following diff. You have NO access to the spec, context docs, or project files — only this diff.

Diff:
diff --git a/src/main.js b/src/main.js
index 6e03d60..139e392 100644
--- a/src/main.js
+++ b/src/main.js
@@ -17,7 +17,7 @@ const renderer = new Renderer();
 const cameraManager = new CameraManager();
 const sceneManager = new SceneManager();
 const performanceMonitor = new PerformanceMonitor();
 const fireworkSystem = new FireworkSystem(sceneManager.instance);
 
 // Initialize Systems
-const inputSystem = new InputSystem(cameraManager.instance, renderer.instance.domElement);
+const inputSystem = new InputSystem(cameraManager.instance, renderer.instance.domElement, fireworkSystem);
 const movementSystem = new MovementSystem(inputSystem, cameraManager.instance);
 
 renderer.instance.domElement.addEventListener('click', () => {
diff --git a/src/systems/FireworkSystem.js b/src/systems/FireworkSystem.js
index 4ac62a7..69027ce 100644
--- a/src/systems/FireworkSystem.js
+++ b/src/systems/FireworkSystem.js
@@ -18,22 +18,37 @@ export class FireworkSystem {
   constructor(scene) {
     this.scene = scene;
     this.activeFireworks = [];
+    this.trailParticles = [];
     this.launchPosition = new THREE.Vector3(0, -50, 0);
+    this.autoLaunchEnabled = false;
+    this.autoLaunchTimer = 0;
+    this.autoLaunchInterval = 3; // seconds between auto launches
+
+    // Trail particles geometry
+    this.trailGeometry = new THREE.BufferGeometry();
+    this.trailMaterial = new THREE.PointsMaterial({
+      size: 2,
+      transparent: true,
+      opacity: 0.8,
+      depthWrite: false
+    });
+    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
+    this.scene.add(this.trailPoints);
   }
 
-  launchRandom() {
+  launchRandom(shape = 'sphere') {
     const offsetX = (Math.random() - 0.5) * 40;
     const offsetZ = (Math.random() - 0.5) * 40;
     const position = this.launchPosition.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
     const targetHeight = 180 + Math.random() * 100;
     const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, 90 + Math.random() * 30, (Math.random() - 0.5) * 10);
     const color = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
-    const shell = this.createShell(position, velocity, targetHeight, color);
+    const shell = this.createShell(position, velocity, targetHeight, color, shape);
     this.scene.add(shell.mesh);
     this.scene.add(shell.mesh);
     this.activeFireworks.push(shell);
   }
 
-  createShell(position, velocity, burstHeight, color) {
+  createShell(position, velocity, burstHeight, color, shape = 'sphere') {
     const geometry = new THREE.SphereGeometry(2.5, 12, 12);
     const material = new THREE.MeshBasicMaterial({ color, emissive: color, emissiveIntensity: 0.7 });
     const mesh = new THREE.Mesh(geometry, material);
     mesh.position.copy(position);
     return {
       type: 'shell',
       mesh,
       velocity,
       burstHeight,
       color,
+      shape,
       age: 0
     };
   }
 
+  spawnTrailParticle(position, color) {
+    const particle = {
+      position: position.clone(),
+      velocity: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
+      color: color.clone(),
+      life: 2 + Math.random() * 3,
       age: 0
     };
+    this.trailParticles.push(particle);
   }
 
-  createBurst(position, color) {
+  createBurst(position, color, shape = 'sphere') {
     const positions = new Float32Array(BURST_PARTICLES * 3);
     const colors = new Float32Array(BURST_PARTICLES * 3);
     const velocities = [];
     const life = new Float32Array(BURST_PARTICLES);
 
     for (let i = 0; i < BURST_PARTICLES; i++) {
-      const direction = new THREE.Vector3(
-        Math.random() * 2 - 1,
-        Math.random() * 2 - 1,
-        Math.random() * 2 - 1
-      ).normalize();
+      let direction;
+      if (shape === 'star') {
+        // Star shape: points along star arms
+        const angle = (i / BURST_PARTICLES) * Math.PI * 2;
+        const radius = Math.sin(angle * 5) * 0.5 + 0.5; // Star pattern
+        direction = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.random() * 0.5 - 0.25).normalize();
+      } else {
+        // Sphere
+        direction = new THREE.Vector3(
+          Math.random() * 2 - 1,
-        Math.random() * 2 - 1,
-        Math.random() * 2 - 1
+        ).normalize();
+      }
       const speed = BURST_SPEED * (0.5 + Math.random() * 0.8);
       velocities.push(direction.multiplyScalar(speed));
 
@@ -95,6 +131,15 @@ export class FireworkSystem {
   }
 
   update(deltaTime) {
+    // Auto launch
+    if (this.autoLaunchEnabled) {
+      this.autoLaunchTimer += deltaTime;
+      if (this.autoLaunchTimer >= this.autoLaunchInterval) {
+        this.launchRandom(Math.random() > 0.5 ? 'sphere' : 'star');
+        this.autoLaunchTimer = 0;
+      }
+    }
+
     const finished = [];
 
     for (const item of this.activeFireworks) {
@@ -103,8 +148,13 @@ export class FireworkSystem.js
         item.mesh.position.addScaledVector(item.velocity, deltaTime);
         item.age += deltaTime;
 
+        // Spawn trail particles
+        if (Math.random() < 0.3) { // 30% chance per frame
+          this.spawnTrailParticle(item.mesh.position.clone(), item.color);
+        }
+
         if (item.mesh.position.y >= item.burstHeight || item.velocity.y <= 0) {
-          const burst = this.createBurst(item.mesh.position.clone(), item.color);
+          const burst = this.createBurst(item.mesh.position.clone(), item.color, item.shape);
           this.scene.add(burst.points);
           this.scene.remove(item.mesh);
           finished.push(item);
@@ -138,5 +188,34 @@ export class FireworkSystem.js
     }
 
     this.activeFireworks = this.activeFireworks.filter(item => !finished.includes(item));
+
+    // Update trail particles
+    this.updateTrailParticles(deltaTime);
+  }
+
+  updateTrailParticles(deltaTime) {
+    const finishedTrails = [];
+    const positions = [];
+    const colors = [];
+
+    for (const particle of this.trailParticles) {
+    for (const particle of this.trailParticles) {
+      particle.velocity.y += GRAVITY * deltaTime * 0.5; // Slower gravity for trails
+      particle.position.addScaledVector(particle.velocity, deltaTime);
+      particle.age += deltaTime;
+
+      if (particle.age >= particle.life) {
+        finishedTrails.push(particle);
+      } else {
+        positions.push(particle.position.x, particle.position.y, particle.position.z);
+        colors.push(particle.color.r, particle.color.g, particle.color.b);
+      }
+    }
+    this.trailParticles = this.trailParticles.filter(p => !finishedTrails.includes(p));
+
+    // Update geometry
+    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
+    this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
+    this.trailGeometry.attributes.position.needsUpdate = true;
+    this.trailGeometry.attributes.color.needsUpdate = true;
   }
 }
diff --git a/src/systems/InputSystem.js b/src/systems/InputSystem.js
index fcb0619..91293c2 100644
--- a/src/systems/InputSystem.js
+++ b/src/systems/InputSystem.js
@@ -1,8 +1,9 @@ import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
 
 export class InputSystem {
-  constructor(camera, domElement) {
+  constructor(camera, domElement, fireworkSystem = null) {
     this.controls = new PointerLockControls(camera, domElement);
+    this.fireworkSystem = fireworkSystem;
     
     // Movement state
     this.keys = {
@@ -66,7 +67,7 @@ export class InputSystem {
     this.instructions.style.fontFamily = 'monospace';
     this.instructions.style.fontSize = '18px';
     this.instructions.style.pointerEvents = 'none';
-    this.instructions.innerHTML = 'Click to Look Around<br/><br/>W A S D to Move<br/><br/>Click while locked to launch a firework';
+    this.instructions.innerHTML = 'Click to Look Around<br/><br/>W A S D to Move<br/><br/>Click while locked to launch a firework<br/><br/>Press SPACE for auto-launch mode';
     this.instructions.style.textShadow = '0px 0px 5px rgba(0,0,0,1)';
     document.body.appendChild(this.instructions);
 
@@ -136,6 +137,12 @@ export class InputSystem {
       case 'ArrowRight':
       case 'KeyD':
         this.keys.right = true;
         break;
+      case 'Space':
+        if (this.fireworkSystem) {
+          this.fireworkSystem.autoLaunchEnabled = !this.fireworkSystem.autoLaunchEnabled;
+          console.log('Auto launch:', this.fireworkSystem.autoLaunchEnabled ? 'ON' : 'OFF');
+        }
+        break;
     }
   }