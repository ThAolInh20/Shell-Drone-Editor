import * as THREE from 'three';

const MAX_SMOKE_PUFFS = 420;

export class SmokeSystem {
  constructor(sceneManager) {
    this.scene = sceneManager.instance;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.smokeTexture = this.createSmokeTexture();
    this.puffs = [];

    window.addEventListener('firework:launch', (event) => this.onLaunch(event.detail));
    window.addEventListener('firework:burst', (event) => this.onBurst(event.detail));
    window.addEventListener('firework:clear', () => this.clear());
  }

  createSmokeTexture() {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.1, size * 0.5, size * 0.5, size * 0.5);
    gradient.addColorStop(0, 'rgba(185, 194, 210, 0.92)');
    gradient.addColorStop(0.38, 'rgba(126, 136, 154, 0.62)');
    gradient.addColorStop(1, 'rgba(70, 78, 96, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  spawnPuff(origin, velocity, options = {}) {
    if (this.puffs.length >= MAX_SMOKE_PUFFS) {
      const removed = this.puffs.shift();
      this.group.remove(removed.sprite);
      removed.sprite.material.dispose();
    }

    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.smokeTexture,
      transparent: true,

      opacity: options.opacity ?? 0.24,
      color: options.color ?? new THREE.Color(0x8892a3),
      depthWrite: false,
      depthTest: false,

      blending: THREE.NormalBlending
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const baseScale = options.scale ?? 8;
    sprite.scale.set(baseScale, baseScale, 1);
    sprite.position.copy(origin);
    this.group.add(sprite);

    this.puffs.push({
      sprite,
      velocity: velocity.clone(),
      age: 0,
      life: options.life ?? 2.2,
      growth: options.growth ?? 4.4,

      baseScale,
      baseOpacity: options.opacity ?? 0.24

    });
  }

  onLaunch(detail = {}) {
    const launchPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      (detail.position?.y ?? -50) + 2,
      detail.position?.z ?? 0
    );

    const count = 8;

    for (let i = 0; i < count; i++) {
      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        1.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.4
      );
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 2
      );
      this.spawnPuff(launchPos.clone().add(offset), drift, {
        life: 1.1 + Math.random() * 0.85,

        scale: 7.2 + Math.random() * 3.4,
        growth: 5.1,
        opacity: 0.24 + Math.random() * 0.12,

        color: new THREE.Color(0x666f7f)
      });
    }
  }

  onBurst(detail = {}) {
    const burstPos = new THREE.Vector3(
      detail.position?.x ?? 0,
      detail.position?.y ?? 160,
      detail.position?.z ?? 0
    );

    const burstColor = new THREE.Color(detail.colorHex ?? 0xffffff);
    const smokeColor = new THREE.Color(0x646d7d).lerp(burstColor, 0.1);
    const intensity = THREE.MathUtils.clamp(detail.intensity ?? 0.45, 0.1, 1);
    const count = Math.round(22 + intensity * 30);


    for (let i = 0; i < count; i++) {
      const azimuth = Math.random() * Math.PI * 2;
      const radius = 1.8 + Math.random() * 7;
      const offset = new THREE.Vector3(
        Math.cos(azimuth) * radius,
        (Math.random() - 0.3) * 2.4,
        Math.sin(azimuth) * radius
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2.1,
        1.1 + Math.random() * 2.2,
        (Math.random() - 0.5) * 2.1
      );

      this.spawnPuff(burstPos.clone().add(offset), velocity, {

        life: 3 + Math.random() * 3.2,
        scale: 9 + Math.random() * 7.2,
        growth: 5.4 + Math.random() * 3.8,
        opacity: 0.28 + Math.random() * 0.2,

        color: smokeColor
      });
    }
  }

  update(deltaTime) {
    const elapsed = performance.now() / 1000;
    
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i];
      puff.age += deltaTime;
      
      if (puff.age >= puff.life) {
        this.group.remove(puff.sprite);
        if (puff.sprite.material) puff.sprite.material.dispose();
        this.puffs.splice(i, 1);
        continue;
      }
      
      const t = puff.age / puff.life;
      const easeOut = 1 - Math.pow(1 - t, 3);
      
      // Khói bị thổi bay bởi gió (wind) thay vì chỉ trôi bồng bềnh tại chỗ
      if (!this.wind) {
        // Gió thổi ngang sang phải (X) và hơi đẩy về sau (Z)
        this.wind = new THREE.Vector3(5.5, 0.8, 2.5); 
      }
      
      // Hạt khói dần dần hòa vào tốc độ của gió (lerp) để tạo cảm giác bị cuốn đi
      puff.velocity.lerp(this.wind, deltaTime * 1.2);
      
      // Khói vẫn giữ một chút lực nổi tự nhiên (bốc lên trên)
      puff.velocity.y += 0.4 * deltaTime;
      puff.sprite.position.addScaledVector(puff.velocity, deltaTime);

      const growthScale = 1 + puff.growth * t;
      puff.sprite.scale.setScalar(puff.baseScale * growthScale);

      const fade = 1 - t;
      puff.sprite.material.opacity = fade * fade * puff.baseOpacity;

      const rotSpeed = puff.rotSpeed * (1 - t * 0.5);
      puff.sprite.material.rotation += rotSpeed * deltaTime;
    }
  }

  clear() {
    for (const puff of this.puffs) {
      if (puff && puff.sprite) {
        this.group.remove(puff.sprite);
        if (puff.sprite.material) {
          puff.sprite.material.dispose();
        }
      }
    }
    this.puffs = [];
  }
}
