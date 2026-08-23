import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';
import { FIREWORK_CONFIG } from '../config/fireworks.js';

const GRAVITY = FIREWORK_CONFIG.GRAVITY;
const DEFAULT_TRAIL_COLOR = new THREE.Color(0xffd700);
const CRACKLE_SPARK_COLOR = new THREE.Color(0xffd77a);

const MAX_PARTICLES = FIREWORK_CONFIG.SYSTEM.maxTrailParticles;

export class TrailSystem {
  constructor(scene) {
    this.scene = scene;
    this.trailParticles = [];
    this.eventSubscriptions = [];

    const baseMax = FIREWORK_CONFIG.SYSTEM.maxTrailParticles;
    this.allocatedMaxTrailParticles = Math.max(100000, Math.round(baseMax * 2.0)); // Pre-allocate with safety margin
    this.maxTrailParticles = baseMax;

    // Trail particles geometry
    this.trailGeometry = new THREE.BufferGeometry();

    // Pre-allocate buffers for GPU upload
    this.positionsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 3
    );
    this.colorsArray = new Float32Array(
      this.allocatedMaxTrailParticles * 4
    );

    this.positionsAttr = new THREE.BufferAttribute(
      this.positionsArray,
      3
    );
    this.positionsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'position',
      this.positionsAttr
    );

    this.colorsAttr = new THREE.BufferAttribute(
      this.colorsArray,
      4
    );
    this.colorsAttr.setUsage(
      THREE.DynamicDrawUsage
    );
    this.trailGeometry.setAttribute(
      'color',
      this.colorsAttr
    );

    this.trailMaterial = new THREE.PointsMaterial({
      size: 8,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord) * 2.0;
        if (dist > 1.0) discard;
        
        vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 stop1 = vec4(diffuseColor.rgb, 0.3);
        vec4 stop2 = vec4(diffuseColor.rgb, 0.13);
        vec4 stop3 = vec4(diffuseColor.rgb, 0.0);
        
        vec4 gradientColor;
        if (dist < 0.024) {
            gradientColor = stop0;
        } else if (dist < 0.125) {
            float t = (dist - 0.024) / (0.125 - 0.024);
            gradientColor = mix(stop0, stop1, t);
        } else if (dist < 0.32) {
            float t = (dist - 0.125) / (0.32 - 0.125);
            gradientColor = mix(stop1, stop2, t);
        } else {
            float t = (dist - 0.32) / (1.0 - 0.32);
            gradientColor = mix(stop2, stop3, t);
        }
        
        diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a);
        `
      );
    };
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trailPoints.frustumCulled = false;
    this.scene.add(this.trailPoints);

    this.eventSubscriptions.push(
      globalEventBus.on('firework:clear', () => this.clear())
    );

    this.setGraphicsQuality(localStorage.getItem('graphics_quality') || 'medium');
    this.eventSubscriptions.push(
      globalEventBus.on('graphics:quality', (quality) => this.setGraphicsQuality(quality))
    );
  }

  setGraphicsQuality(quality) {
    const baseMax = FIREWORK_CONFIG.SYSTEM.maxTrailParticles;
    if (quality === 'low') {
      this.maxTrailParticles = Math.round(baseMax * 0.4);
    } else if (quality === 'medium') {
      this.maxTrailParticles = baseMax;
    } else if (quality === 'high') {
      this.maxTrailParticles = Math.round(baseMax * 1.6);
    }
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }

  spawnTrailParticle(
    position,
    color,
    lifeMultiplier = 1.0,
    zeroVelocity = false,
    customLife = null,
    opacityMultiplier = 1.0,
    strobe = false,
    customVelocity = null,
    gravityScale = 1.0,
    dragScale = 1.0,
    shimmer = false
  ) {
    const useFireworkColor = Math.random() < 0.75;
    const trailColor = useFireworkColor
      ? color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.12
      )
      : DEFAULT_TRAIL_COLOR.clone();

    let velocity;
    if (customVelocity) {
      velocity = customVelocity.clone();
    } else {
      velocity = zeroVelocity
        ? new THREE.Vector3(0, 0, 0)
        : new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    }

    const particle = {
      position: position.clone(),
      velocity: velocity,
      color: trailColor,
      life: customLife !== null ? customLife : (2 + Math.random() * 3) * lifeMultiplier,
      age: 0,
      opacity: opacityMultiplier,
      strobe: strobe,
      shimmer: shimmer,
      gravityScale: gravityScale,
      dragScale: dragScale
    };
    this.trailParticles.push(particle);
  }

  spawnEffectSpark(
    position,
    color,
    strobe = false,
    customVelocity = null,
    phase = 0,
    customLife = null,
    shimmer = false
  ) {
    const spark = {
      position: position.clone(),
      // Vận tốc ngẫu nhiên để các hạt tỏa ra xung quanh tạo thành hình nón (mở dần) hoặc dùng vận tốc tùy biến
      velocity: customVelocity
        ? customVelocity.clone()
        : new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            Math.random() * 5,
            (Math.random() - 0.5) * 6
          ),
      color: color.clone(),
      // Tăng mạnh thời gian sống để hạt kịp tỏa rộng ra trước khi mờ hẳn (hoặc dùng customLife ngắn hơn)
      life: customLife !== null ? customLife : 1.5 + Math.random() * 1.2,
      age: 0,
      strobe: strobe,
      shimmer: shimmer,
      phase: phase
    };
    this.trailParticles.push(spark);
  }

  spawnMicroCrackle(position, baseColor) {
    const crackleCount = 15 + Math.floor(Math.random() * 6); // Tăng lên 10-15 hạt để tạo khối cầu sphere rõ nét hơn

    for (let i = 0; i < crackleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );

      // Tốc độ bung vừa phải để giữ cấu trúc sphere mini đẹp mắt
      const speed = (0.5 + Math.random() * 0.5) * 14;

      // Sử dụng màu sắc gốc của hạt pháo chính thay vì màu vàng mặc định
      const sparkColor = baseColor ? baseColor.clone() : CRACKLE_SPARK_COLOR.clone();

      this.trailParticles.push({
        position: position.clone(),
        velocity: direction.multiplyScalar(speed),
        color: sparkColor,
        life: 0.8 + Math.random() * 0.4, // Giảm thời gian sống (0.6s - 1.0s) giúp vụ nổ mini tan nhanh chớp nhoáng
        age: 0
      });
    }
  }

  update(deltaTime) {
    let activeCount = 0;

    for (let i = 0; i < this.trailParticles.length; i++) {
      const particle = this.trailParticles[i];

      // Thêm lực cản không khí để hạt hãm phanh lại, nhân thêm dragScale riêng biệt
      const drag =
        1.0 -
        4.0 *
          deltaTime *
          (particle.dragScale ?? 1.0);
      particle.velocity.x *= drag;
      particle.velocity.y *= drag;
      particle.velocity.z *= drag;
      // Rơi xuống từ từ (nhân thêm gravityScale riêng biệt của hạt)
      particle.velocity.y +=
        GRAVITY *
        deltaTime *
        0.5 *
        (particle.gravityScale ?? 1.0);
      particle.position.addScaledVector(
        particle.velocity,
        deltaTime
      );
      particle.age += deltaTime;

      if (particle.age < particle.life) {
        if (activeCount < this.maxTrailParticles) {
          // Áp dụng hàm mũ để hạt biến mất nhanh và sắc nét hơn ở cuối vòng đời của chính nó
          const lifeRatio = particle.age / particle.life;
          let alpha =
            Math.max(
              0,
              Math.pow(1.0 - lifeRatio, 2.5)
            ) * (particle.opacity ?? 1.0);
          let r = particle.color.r;
          let g = particle.color.g;
          let b = particle.color.b;

          // Hiệu ứng strobe lấp lánh bằng ánh sáng trắng cho hạt con
          if (particle.strobe) {
            // Sử dụng thời gian thực tế toàn cục kết hợp lệch pha để đồng bộ hóa chớp nháy theo nhóm
            const timeMs =
              particle.phase !== undefined
                ? performance.now() + particle.phase
                : particle.age * 1000;
            const strobeFreq = 120; // Tần số lấp lánh (ms)
            const isBlinking =
              Math.floor(timeMs / strobeFreq) %
                2 ===
              0;
            if (!isBlinking) {
              alpha = 0.0;
            } else {
              // Khi sáng lên thì lấp lánh bằng ánh sáng trắng
              r = 1.0;
              g = 1.0;
              b = 1.0;
            }
          } else if (particle.shimmer) {
            // Hiệu ứng lung linh dao động mượt mà bằng sóng hình sin
            const timeMs =
              particle.phase !== undefined
                ? performance.now() + particle.phase
                : particle.age * 1000;
            
            const shimmerVal =
              0.3 +
              0.7 *
                Math.abs(
                  Math.sin(timeMs * 0.05)
                );
            alpha *= shimmerVal;
            
            // Trộn thêm ánh sáng trắng lung linh
            const blendFactor =
              0.5 + 0.5 * Math.sin(timeMs * 0.05);
            r += (1.0 - r) * blendFactor;
            g += (1.0 - g) * blendFactor;
            b += (1.0 - b) * blendFactor;
          }

          // Ghi trực tiếp dữ liệu vào mảng Float32Array tĩnh
          const posIdx = activeCount * 3;
          this.positionsArray[posIdx] =
            particle.position.x;
          this.positionsArray[posIdx + 1] =
            particle.position.y;
          this.positionsArray[posIdx + 2] =
            particle.position.z;

          const colIdx = activeCount * 4;
          this.colorsArray[colIdx] = r;
          this.colorsArray[colIdx + 1] = g;
          this.colorsArray[colIdx + 2] = b;
          this.colorsArray[colIdx + 3] = alpha;

          // Thực hiện dồn hạt tại chỗ (in-place) để tránh phân bổ lại mảng
          if (i !== activeCount) {
            this.trailParticles[activeCount] = particle;
          }
          activeCount++;
        }
      }
    }

    // Cắt bớt phần mảng thừa trực tiếp (in-place)
    this.trailParticles.length = activeCount;

    if (activeCount > 0) {
      this.positionsAttr.needsUpdate = true;
      this.colorsAttr.needsUpdate = true;
      
      if (this.positionsAttr.updateRange) {
        this.positionsAttr.updateRange.offset = 0;
        this.positionsAttr.updateRange.count =
          activeCount * 3;
      }
      
      if (this.colorsAttr.updateRange) {
        this.colorsAttr.updateRange.offset = 0;
        this.colorsAttr.updateRange.count =
          activeCount * 4;
      }

      this.trailGeometry.setDrawRange(
        0,
        activeCount
      );
    } else {
      this.trailGeometry.setDrawRange(
        0,
        0
      );
    }
  }

  clear() {
    this.trailParticles = [];
    if (this.trailGeometry) {
      this.trailGeometry.setDrawRange(0, 0);
      const positionAttribute = this.trailGeometry.getAttribute('position');
      if (positionAttribute) positionAttribute.needsUpdate = true;
    }
  }
}
