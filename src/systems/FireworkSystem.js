import * as THREE from 'three';

const GRAVITY = -30;
const BURST_PARTICLES = 80;
const BURST_SPEED = 50;
const BURST_LIFE = 1.6;

const FIREWORK_COLORS = [
  0xffd700, // vàng (gold)
  0xff4500, // cam đỏ (orange red)
  0x00bfff, // xanh da trời (deep sky blue)
  0xff69b4, // hồng (hot pink)
  0x7fffd4, // xanh ngọc (aquamarine)
  0x8a2be2  // tím (blue violet)
];

const SHELL_CORE_SIZE = 0.6;
const SHELL_HALO_COUNT = 10;
const SHELL_HALO_RADIUS = 3.8;
const SHELL_HALO_SIZE = 0.95;

const BURST_FADE_EXPONENT = 2.5;

const DEFAULT_TRAIL_COLOR = new THREE.Color( 0xffd700);

export class FireworkSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeFireworks = [];
    this.trailParticles = [];
    this.launchPosition = new THREE.Vector3(0, -50, 0);
    this.autoLaunchEnabled = false;
    this.autoLaunchTimer = 0;
    this.autoLaunchInterval = 3; // seconds between auto launches

    // Trail particles geometry
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.PointsMaterial({
      size: 2,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailPoints);
  }

  launchRandom(shape = null) {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetZ = (Math.random() - 0.5) * 40;
    const position = this.launchPosition.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
    const targetHeight = 180 + Math.random() * 100;
    const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, 90 + Math.random() * 30, (Math.random() - 0.5) * 10);
    const color = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const shell = this.createShell(position, velocity, targetHeight, color, shape);
    this.scene.add(shell.mesh);
    this.activeFireworks.push(shell);
  }

  pickFireworkShape() {
    const roll = Math.random();

    if (roll < 0.7) return 'sphere';
    if (roll < 0.92) return 'willow';
    if (roll < 0.98) return 'star';
    return 'lightning';
  }

  createShell(position, velocity, burstHeight, color, shape = null) {
    const shellShape = shape ?? this.pickFireworkShape();
    const mesh = new THREE.Group();

    const coreGeometry = new THREE.SphereGeometry(SHELL_CORE_SIZE, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    mesh.add(coreMesh);

    const haloPositions = new Float32Array(SHELL_HALO_COUNT * 3);
    const haloColors = new Float32Array(SHELL_HALO_COUNT * 3);

    for (let i = 0; i < SHELL_HALO_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const radius = SHELL_HALO_RADIUS * (0.35 + Math.random() * 0.65);
      const offset = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.75,
        Math.sin(angle) * Math.cos(elevation) * radius
      );

      haloPositions[i * 3] = offset.x;
      haloPositions[i * 3 + 1] = offset.y;
      haloPositions[i * 3 + 2] = offset.z;

      const haloColor = color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.14
      );

      haloColors[i * 3] = haloColor.r;
      haloColors[i * 3 + 1] = haloColor.g;
      haloColors[i * 3 + 2] = haloColor.b;
    }

    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));

    const haloMaterial = new THREE.PointsMaterial({
      size: SHELL_HALO_SIZE,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const haloPoints = new THREE.Points(haloGeometry, haloMaterial);
    mesh.add(haloPoints);

    mesh.position.copy(position);
    return {
      type: 'shell',
      mesh,
      velocity,
      burstHeight,
      color,
      shape: shellShape,
      age: 0
    };
  }

  spawnTrailParticle(position, color) {
    const useFireworkColor = Math.random() < 0.75;
    const trailColor = useFireworkColor
      ? color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.12
      )
      : DEFAULT_TRAIL_COLOR.clone();

    const particle = {
      position: position.clone(),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
      color: trailColor,
      life: 2 + Math.random() * 3,
      age: 0
    };
    this.trailParticles.push(particle);
  }

  createBurst(position, color, shape = 'sphere') {
    const positions = new Float32Array(BURST_PARTICLES * 3);
    const colors = new Float32Array(BURST_PARTICLES * 3);
    const velocities = [];
    const life = new Float32Array(BURST_PARTICLES);

    for (let i = 0; i < BURST_PARTICLES; i++) {
      let direction;
      const angle = (i / BURST_PARTICLES) * Math.PI * 2;

      if (shape === 'star') {
        const radius = Math.sin(angle * 5) * 0.45 + 0.75;
        direction = new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          Math.random() * 0.45 - 0.225
        ).normalize();
      } else if (shape === 'willow') {
        direction = new THREE.Vector3(
          (Math.random() - 0.5) * 0.85,
          0.25 + Math.random() * 0.55,
          (Math.random() - 0.5) * 0.85
        ).normalize();
      } else if (shape === 'lightning') {
        const fork = Math.sin(angle * 6) * 0.55;
        direction = new THREE.Vector3(
          fork + (Math.random() - 0.5) * 0.25,
          0.55 + Math.random() * 0.45,
          (Math.random() - 0.5) * 0.3
        ).normalize();
      } else {
        direction = new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize();
      }
      const speed = BURST_SPEED * (0.5 + Math.random() * 0.8);
      velocities.push(direction.multiplyScalar(speed));

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      life[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    points.userData = { velocities, life };

    return {
      type: 'burst',
      points,
      age: 0,
      maxLife: BURST_LIFE
    };
  }

  update(deltaTime) {
    // Auto launch
    if (this.autoLaunchEnabled) {
      this.autoLaunchTimer += deltaTime;
      if (this.autoLaunchTimer >= this.autoLaunchInterval) {
        this.launchRandom();
        this.autoLaunchTimer = 0;
      }
    }

    const finished = [];

    for (const item of this.activeFireworks) {
      if (item.type === 'shell') {
        item.velocity.y += GRAVITY * deltaTime;
        item.mesh.position.addScaledVector(item.velocity, deltaTime);
        item.age += deltaTime;
        item.mesh.scale.setScalar(1 + Math.sin(item.age * 12) * 0.05);

        if (item.mesh.children[0] && item.mesh.children[0].material) {
          item.mesh.children[0].material.opacity = 0.9 + Math.sin(item.age * 18) * 0.08;
        }

        if (item.mesh.children[1] && item.mesh.children[1].material) {
          item.mesh.children[1].material.opacity = 0.55 + Math.sin(item.age * 9) * 0.12;
        }

        // Spawn trail particles
        if (Math.random() < 0.4) { // slight chance per frame
          this.spawnTrailParticle(item.mesh.position.clone(), item.color);
        }

        if (item.mesh.position.y >= item.burstHeight || item.velocity.y <= 0) {
          const burst = this.createBurst(item.mesh.position.clone(), item.color, item.shape);
          this.scene.add(burst.points);
          this.scene.remove(item.mesh);
          finished.push(item);
          this.activeFireworks.push(burst);
        }
      } else if (item.type === 'burst') {
        item.age += deltaTime;
        const positions = item.points.geometry.attributes.position.array;
        const lifeArray = item.points.userData.life;
        item.points.material.opacity = Math.pow(Math.max(1 - item.age / item.maxLife, 0), BURST_FADE_EXPONENT);

        for (let i = 0; i < BURST_PARTICLES; i++) {
          const velocity = item.points.userData.velocities[i];
          positions[i * 3] += velocity.x * deltaTime;
          positions[i * 3 + 1] += velocity.y * deltaTime;
          positions[i * 3 + 2] += velocity.z * deltaTime;

          velocity.y += GRAVITY * deltaTime * 0.3;
          lifeArray[i] += deltaTime;
        }

        item.points.geometry.attributes.position.needsUpdate = true;

        if (item.age >= item.maxLife) {
          this.scene.remove(item.points);
          finished.push(item);
        }
      }
    }

    this.activeFireworks = this.activeFireworks.filter(item => !finished.includes(item));

    // Update trail particles
    this.updateTrailParticles(deltaTime);
  }

  updateTrailParticles(deltaTime) {
    const finishedTrails = [];
    const positions = [];
    const colors = [];

    for (const particle of this.trailParticles) {
      particle.velocity.y += GRAVITY * deltaTime * 0.5; // Slower gravity for trails
      particle.position.addScaledVector(particle.velocity, deltaTime);
      particle.age += deltaTime;

      if (particle.age >= particle.life) {
        finishedTrails.push(particle);
      } else {
        positions.push(particle.position.x, particle.position.y, particle.position.z);
        colors.push(particle.color.r, particle.color.g, particle.color.b);
      }
    }
    this.trailParticles = this.trailParticles.filter(p => !finishedTrails.includes(p));

    // Update geometry
    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }
}
