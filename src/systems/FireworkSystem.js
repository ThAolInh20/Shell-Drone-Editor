import * as THREE from 'three';

const GRAVITY = -30;
const BURST_PARTICLES = 80;
const BURST_SPEED = 50;
const BURST_LIFE = 1.6;

const FIREWORK_COLORS = [
  0xffd700,
  0xff4500,
  0x00bfff,
  0xff69b4,
  0x7fffd4,
  0x8a2be2
];

export class FireworkSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeFireworks = [];
    this.launchPosition = new THREE.Vector3(0, -50, 0);
  }

  launchRandom() {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetZ = (Math.random() - 0.5) * 40;
    const position = this.launchPosition.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
    const targetHeight = 180 + Math.random() * 100;
    const velocity = new THREE.Vector3((Math.random() - 0.5) * 10, 90 + Math.random() * 30, (Math.random() - 0.5) * 10);
    const color = new THREE.Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    const shell = this.createShell(position, velocity, targetHeight, color);
    this.scene.add(shell.mesh);
    this.activeFireworks.push(shell);
  }

  createShell(position, velocity, burstHeight, color) {
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
      age: 0
    };
  }

  createBurst(position, color) {
    const positions = new Float32Array(BURST_PARTICLES * 3);
    const colors = new Float32Array(BURST_PARTICLES * 3);
    const velocities = [];
    const life = new Float32Array(BURST_PARTICLES);

    for (let i = 0; i < BURST_PARTICLES; i++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
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
    const finished = [];

    for (const item of this.activeFireworks) {
      if (item.type === 'shell') {
        item.velocity.y += GRAVITY * deltaTime;
        item.mesh.position.addScaledVector(item.velocity, deltaTime);
        item.age += deltaTime;

        if (item.mesh.position.y >= item.burstHeight || item.velocity.y <= 0) {
          const burst = this.createBurst(item.mesh.position.clone(), item.color);
          this.scene.add(burst.points);
          this.scene.remove(item.mesh);
          finished.push(item);
          this.activeFireworks.push(burst);
        }
      } else if (item.type === 'burst') {
        item.age += deltaTime;
        const positions = item.points.geometry.attributes.position.array;
        const lifeArray = item.points.userData.life;
        let alpha = 1 - item.age / item.maxLife;
        alpha = Math.max(alpha, 0);
        item.points.material.opacity = alpha;

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
  }
}
