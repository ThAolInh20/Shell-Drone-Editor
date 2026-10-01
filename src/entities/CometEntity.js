import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

const COMET_CORE_SIZE = 1.2;

const _tempMoveDir = new THREE.Vector3();
const _tempVelocityDir = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _vUp = new THREE.Vector3(0, 1, 0);

export class CometEntity {
  static STATE = {
    INIT: 'init',
    LAUNCHING: 'launching',
    DECAYING: 'decaying',
    DEAD: 'dead'
  };

  constructor({
    position,
    velocity,
    color,
    preset = null,
    spiral = null
  }) {
    this.type = 'comet';
    this.velocity = velocity;
    this.color = color;
    this.preset = preset;
    this.spiral = spiral || preset?.spiral || null;
    this.age = 0;
    this.decayTime = 0;
    this.ballisticPosition = position.clone();
    this.prevPosition = position.clone();
    this.lastTrailSpawnPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    const baseDecay = preset?.maxDecayTime ?? 0.8;
    this.maxDecayTime = baseDecay * (0.8 + Math.random() * 0.4); // Randomize decay time (+/- 20%)
    this.state = CometEntity.STATE.INIT;
    this.mesh = new THREE.Group();
    this.coreColor = color.clone();
    this.initialVy = velocity.y;
    this.launchY = position.y;
    this.timeToApex = this.initialVy / 30;
    const fadeStartRatio = 0.65 + Math.random() * 0.3;
    this.fadeStartTime = this.timeToApex * fadeStartRatio;
    this.isFading = false;

    // Stochastic Strobe / Glitter State Machine
    const flashRate = 4.5 + Math.random() * 3.0; // 4.5 - 7.5 Hz
    this.strobe = {
      state: 'smolder', // 'smolder', 'flash', 'recovery'
      stateTime: 0,
      nextFlashInterval: -Math.log(1 - Math.random() * 0.99) / flashRate,
      flashDuration: 0.045 + Math.random() * 0.025,
      recoveryDuration: 0.03 + Math.random() * 0.02,
      flashRate,
      activationThreshold: 0.50 + Math.random() * 0.18, // 50% - 68%
      energy: 0,
      intensity: 0,
      peakScaleBoost: 2.0 + Math.random() * 0.8,
      peakEmission: 2.5 + Math.random() * 1.5,
      attackRate: 150.0,
      decayRate: 40.0,
      doubleFlashChance: 0.15,
      isDoubleFlash: false,
      flashColor: new THREE.Color(0xffffff),
      tempColor: new THREE.Color()
    };

    // Chỉ một tỷ lệ nhỏ hạt lấp lánh (khoảng 25% - 35%), các hạt khác sẽ mờ dần khi lên cao
    this.isStrobeStar = preset?.isStrobeStar !== undefined
      ? preset.isStrobeStar
      : (Math.random() < (preset?.strobeRatio ?? 0.30));
    this.dimStartTime = this.timeToApex * (0.45 + Math.random() * 0.15);

    if (this.preset?.shellType === 'comet_cluster_cc' && this.preset?.secondColor) {
      this.color1 = color.clone();
      this.color2 = new THREE.Color(this.preset.secondColor);
      this.color2.offsetHSL(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      );
    }

    if (this.preset?.shellType === 'comet_cluster_notrail') {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array([color.r, color.g, color.b]), 3));

      const material = new THREE.PointsMaterial({
        size: 32, // BASE_BURST_POINT_SIZE is 26, slightly larger for standalone comet visibility
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord) * 2.0;
          if (dist > 1.0) discard;
          
          vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
          vec4 stop1 = vec4(diffuseColor.rgb, 0.34);
          vec4 stop2 = vec4(diffuseColor.rgb, 0.16);
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

      this.coreMesh = new THREE.Points(geometry, material);
      this.mesh.add(this.coreMesh);
    } else {
      // Use a slightly vertically elongated core for motion blur feel
      const coreGeometry = new THREE.SphereGeometry(COMET_CORE_SIZE, 8, 8);
      const isSparkly = Boolean(this.preset?.sparkleAtEnd);
      if (isSparkly) {
        this.coreColor.multiplyScalar(0.3);
      }
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: this.coreColor,
        transparent: true,
        opacity: isSparkly ? 0.85 : 1.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: !isSparkly
      });
      this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
      if (isSparkly) {
        this.coreMesh.scale.set(0.4, 1.2, 0.4);
      } else {
        this.coreMesh.scale.set(0.6, 1.8, 0.6); // Elongated in Y
      }
      this.mesh.add(this.coreMesh);
    }

    this.mesh.traverse((child) => {
      child.layers.enable(LAYER_REFLECTION);
    });

    this.mesh.position.copy(position);
    // Orient the comet towards velocity if needed, but since it falls down, 
    // basic spherical with scale might need to look at velocity.
    // For simplicity, just let it be stretched in local Y and we can rotate it to velocity direction.
    this.updateRotation();

    this.state = CometEntity.STATE.LAUNCHING;
  }

  shouldSpawnTrail(minDistanceSq = 0.64) {
    if (this.lastTrailSpawnPos.distanceToSquared(this.mesh.position) >= minDistanceSq) {
      this.lastTrailSpawnPos.copy(this.mesh.position);
      return true;
    }
    return false;
  }

  updateRotation() {
    _tempMoveDir.subVectors(
      this.mesh.position,
      this.prevPosition
    );
    if (_tempMoveDir.lengthSq() > 0.0001) {
      _tempMoveDir.normalize();
      _tempQuaternion.setFromUnitVectors(_vUp, _tempMoveDir);
      this.mesh.setRotationFromQuaternion(_tempQuaternion);
    } else if (this.velocity.lengthSq() > 0) {
      _tempVelocityDir.copy(this.velocity).normalize();
      _tempQuaternion.setFromUnitVectors(_vUp, _tempVelocityDir);
      this.mesh.setRotationFromQuaternion(_tempQuaternion);
    }
  }

  calculateFlashEnvelope(t, attackRate, decayRate) {
    if (t <= 0) return 0.0;
    const raw = (1.0 - Math.exp(-attackRate * t)) * Math.exp(-decayRate * t);
    const tPeak = Math.log(1.0 + attackRate / decayRate) / attackRate;
    const maxRaw = (1.0 - Math.exp(-attackRate * tPeak)) * Math.exp(-decayRate * tPeak);
    return Math.min(1.0, raw / (maxRaw || 1.0));
  }

  update(deltaTime) {
    if (this.state === CometEntity.STATE.DEAD) {
      return true;
    }

    if (this.state === CometEntity.STATE.LAUNCHING) {
      this.prevPosition.copy(this.mesh.position);
      this.velocity.y += -30 * deltaTime; // Gravity
      this.ballisticPosition.addScaledVector(this.velocity, deltaTime);
      this.age += deltaTime;

      if (this.spiral) {
        const timeToApex = Math.max(0.1, this.initialVy / 30);
        const flightRatio = Math.min(1.0, this.age / timeToApex);

        const envelope = Math.sin(flightRatio * Math.PI * 0.95);
        const curRadius = (this.spiral.radius ?? 11.5) * (0.25 + 0.75 * envelope);
        const spinSpeed = (this.spiral.frequency ?? 4.6) * Math.PI * 2;
        const currentAngle = (this.spiral.phase ?? 0) +
          (this.spiral.direction ?? 1) * spinSpeed * (this.age / timeToApex);

        const offsetX = curRadius * Math.cos(currentAngle);
        const offsetZ = curRadius * Math.sin(currentAngle);

        this.mesh.position.set(
          this.ballisticPosition.x + offsetX,
          this.ballisticPosition.y,
          this.ballisticPosition.z + offsetZ
        );
      } else {
        this.mesh.position.copy(this.ballisticPosition);
      }

      this.updateRotation();

      if (this.preset?.shellType === 'comet_cluster_cc' && this.color2) {
        const timeToApex = this.initialVy / 30;
        const lifeRatio = Math.min(1.0, this.age / timeToApex);

        let fade = 1.0;
        let activeColor = this.color1;

        if (lifeRatio < 0.4) {
          activeColor = this.color1;
          fade = 1.0;
        } else if (lifeRatio < 0.5) {
          activeColor = this.color1;
          fade = (0.5 - lifeRatio) / 0.1;
        } else if (lifeRatio < 0.6) {
          activeColor = this.color2;
          fade = (lifeRatio - 0.5) / 0.1;
        } else {
          activeColor = this.color2;
          fade = 1.0;
        }

        this.color.setRGB(activeColor.r * fade, activeColor.g * fade, activeColor.b * fade);
        if (this.coreMesh) {
          this.coreMesh.material.color.copy(this.color);
        }
      }

      // Check if it reached the apex (velocity.y <= 0)
      if (this.velocity.y <= 0) {
        this.state = CometEntity.STATE.DECAYING;
      }
    } else if (this.state === CometEntity.STATE.DECAYING) {
      this.prevPosition.copy(this.mesh.position);
      // Triệt tiêu dần vận tốc để comet đứng im tại điểm cao nhất (apex), không bị rơi xuống do trọng lực
      this.velocity.multiplyScalar(Math.max(0, 1.0 - 8.0 * deltaTime));
      this.ballisticPosition.addScaledVector(this.velocity, deltaTime);
      this.mesh.position.copy(this.ballisticPosition);
      if (this.velocity.lengthSq() > 0.01) {
        this.updateRotation();
      }
    }

    // Fading logic
    if (
      !this.isFading &&
      (this.age >= this.fadeStartTime || this.state === CometEntity.STATE.DECAYING)
    ) {
      this.isFading = true;
    }

    if (this.isFading) {
      this.decayTime += deltaTime;
      const decayRatio = Math.min(1.0, this.decayTime / this.maxDecayTime);

      if (decayRatio >= 1.0) {
        this.state = CometEntity.STATE.DEAD;
      } else {
        const fadeRatio = Math.pow(decayRatio, 2.2);
        // Fade out opacity
        this.coreMesh.material.opacity = 1.0 - fadeRatio;
        // Shrink core
        const scale = 1.0 - fadeRatio * 0.8;
        if (this.preset?.shellType !== 'comet_cluster_notrail') {
          const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : 0.6;
          const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : 1.8;
          this.coreMesh.scale.set(
            baseScaleX * scale,
            baseScaleY * scale,
            baseScaleX * scale
          );
        }
      }
    }

    const H_max = this.initialVy ? (this.initialVy * this.initialVy) / 60 : 0;
    const currentHeight = this.mesh.position.y - (this.launchY ?? 0);
    const heightRatio = H_max > 0 ? (currentHeight / H_max) : 0;

    const hasStrobeTag = Boolean(
      this.preset?.strobe ||
      (Array.isArray(this.preset?.effects) && (
        this.preset.effects.includes('strobe') ||
        this.preset.effects.includes('white-strobe') ||
        this.preset.effects.includes('glitter-strobe')
      ))
    );

    const isStrobeActive = hasStrobeTag &&
      this.isStrobeStar &&
      this.state === CometEntity.STATE.LAUNCHING &&
      heightRatio >= (this.strobe?.activationThreshold ?? 0.5) &&
      !this.isFading;

    const isDimmingNonStrobe = hasStrobeTag &&
      !this.isStrobeStar &&
      this.state === CometEntity.STATE.LAUNCHING &&
      this.age >= this.dimStartTime;

    // Stochastic Strobe / Glitter State Machine
    if (isStrobeActive) {
      this.strobe.stateTime += deltaTime;

      switch (this.strobe.state) {
        case 'smolder': {
          this.strobe.energy = 0.0;
          this.strobe.intensity = 0.0;
          if (this.strobe.stateTime >= this.strobe.nextFlashInterval) {
            this.strobe.state = 'flash';
            this.strobe.stateTime = 0.0;
            this.strobe.flashDuration = 0.045 + Math.random() * 0.025;
          }
          break;
        }

        case 'flash': {
          const env = this.calculateFlashEnvelope(
            this.strobe.stateTime,
            this.strobe.attackRate,
            this.strobe.decayRate
          );
          this.strobe.intensity = env;
          this.strobe.energy = Math.pow(env, 0.55);

          if (this.strobe.stateTime >= this.strobe.flashDuration) {
            if (!this.strobe.isDoubleFlash && Math.random() < this.strobe.doubleFlashChance) {
              this.strobe.isDoubleFlash = true;
              this.strobe.state = 'smolder';
              this.strobe.stateTime = 0.0;
              this.strobe.nextFlashInterval = 0.02 + Math.random() * 0.03;
            } else {
              this.strobe.isDoubleFlash = false;
              this.strobe.state = 'recovery';
              this.strobe.stateTime = 0.0;
            }
          }
          break;
        }

        case 'recovery': {
          const progress = Math.min(1.0, this.strobe.stateTime / this.strobe.recoveryDuration);
          this.strobe.energy = (1.0 - progress) * 0.08;
          this.strobe.intensity = this.strobe.energy;

          if (progress >= 1.0) {
            this.strobe.state = 'smolder';
            this.strobe.stateTime = 0.0;
            this.strobe.nextFlashInterval = -Math.log(1 - Math.random() * 0.99) / this.strobe.flashRate;
          }
          break;
        }
      }

      this.coreMesh.visible = true;
      const energy = this.strobe.energy;

      // 1. Opacity: 0.18 tối âm ỉ -> 1.0 chớp sáng
      this.coreMesh.material.opacity = 0.18 + energy * 0.82;

      // 2. Scale: Phình to tức thì ngay tại thời điểm lóe xung nhọn
      const scaleMultiplier = 1.0 + energy * (this.strobe.peakScaleBoost - 1.0);
      const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : 0.6;
      const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : 1.8;
      this.coreMesh.scale.set(
        baseScaleX * scaleMultiplier,
        baseScaleY * scaleMultiplier,
        baseScaleX * scaleMultiplier
      );

      // 3. Color Temperature & Emission
      if (this.coreMesh.material && this.coreMesh.material.color) {
        const flashLerp = Math.pow(energy, 1.2);
        this.strobe.tempColor.copy(this.coreColor).lerp(this.strobe.flashColor, flashLerp);
        if (energy > 0.05) {
          this.strobe.tempColor.multiplyScalar(1.0 + energy * this.strobe.peakEmission);
        }
        this.coreMesh.material.color.copy(this.strobe.tempColor);
      }
    } else if (isDimmingNonStrobe) {
      // Các hạt không lấp lánh sẽ mờ dần và thu nhỏ êm dịu
      const dimDuration = Math.max(0.1, this.timeToApex - this.dimStartTime);
      const dimProgress = Math.min(1.0, (this.age - this.dimStartTime) / dimDuration);
      const fadeFactor = Math.max(0.0, 1.0 - Math.pow(dimProgress, 1.3));

      this.coreMesh.visible = fadeFactor > 0.02;
      if (this.coreMesh.material) {
        this.coreMesh.material.opacity = fadeFactor;
        if (this.coreMesh.material.color) {
          this.coreMesh.material.color.copy(this.color);
        }
      }
      const scaleFactor = Math.max(0.1, 1.0 - dimProgress * 0.75);
      const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : 0.6;
      const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : 1.8;
      this.coreMesh.scale.set(
        baseScaleX * scaleFactor,
        baseScaleY * scaleFactor,
        baseScaleX * scaleFactor
      );
    } else {
      this.coreMesh.visible = this.preset?.sparkleAtEnd ? (this.state === CometEntity.STATE.DECAYING || this.isFading) : true;
      if (this.coreMesh.material && this.coreMesh.material.color) {
        this.coreMesh.material.color.copy(this.color);
      }
      // Khôi phục scale gốc
      if (
        !this.isFading &&
        this.preset?.shellType !== 'comet_cluster_notrail'
      ) {
        const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : 0.6;
        const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : 1.8;
        this.coreMesh.scale.set(
          baseScaleX,
          baseScaleY,
          baseScaleX
        );
      }
    }

    // Return true if it is completely dead so the system can remove it
    return this.state === CometEntity.STATE.DEAD;
  }

  markDead() {
    this.state = CometEntity.STATE.DEAD;
  }

  dispose() {
    this.mesh.traverse((child) => {
      if (child.isMesh || child.isPoints) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
