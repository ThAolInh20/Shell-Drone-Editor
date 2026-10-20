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
    spiral = null,
    lifetime = null
  }) {
    this.type = 'comet';
    this.velocity = velocity;
    this.color = color;
    this.preset = preset;
    this.gravityScale = preset?.gravityScale !== undefined ? preset.gravityScale : 1.0;
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
    this.synchronizedLifetime = Number.isFinite(lifetime) && lifetime > 0 ? lifetime : null;
    if (this.synchronizedLifetime !== null) {
      this.maxDecayTime = Math.min(1.1, this.synchronizedLifetime * 0.6);
      this.fadeStartTime = this.synchronizedLifetime - this.maxDecayTime;
    }
    this.totalLifetime = this.synchronizedLifetime ?? (this.timeToApex + this.maxDecayTime);
    this.isFading = false;

    // Visual Effect Tags normalization
    const effects = Array.isArray(preset?.effects) ? preset.effects : [];
    const effectType = preset?.effectType || '';

    this.hasLongBurn = Boolean(
      preset?.longBurn ||
      effects.includes('long-burn') ||
      effectType === 'long-burn'
    );
    if (this.hasLongBurn) {
      this.maxDecayTime *= 2.0;
      this.totalLifetime = this.synchronizedLifetime ?? (this.timeToApex + this.maxDecayTime);
      this.fadeStartTime = Math.max(this.fadeStartTime, this.totalLifetime - this.maxDecayTime);
    }

    this.hasCrackle = Boolean(preset?.crackle || effects.includes('crackle') || effectType === 'crackle');
    this.hasCrossette = Boolean(preset?.crossette || effects.includes('crossette') || effectType === 'crossette');
    this.hasFlow = Boolean(preset?.flow || effects.includes('flow') || effectType === 'flow');
    this.hasGhost = Boolean(preset?.ghost || effects.includes('ghost') || effectType === 'ghost');
    this.hasGhostFlare = Boolean(
      preset?.ghostFlare ||
      preset?.['ghost-flare'] ||
      effects.includes('ghost-flare') ||
      effectType === 'ghost-kamuro'
    );
    this.isGhostFlare = this.hasGhostFlare;
    this.hasNoTrail = Boolean(
      preset?.noTrail ||
      effects.includes('no-trail') ||
      effectType === 'no-trail' ||
      preset?.shellType === 'comet_cluster_notrail'
    );
    this.hasNoBurst = Boolean(preset?.noBurst || effects.includes('no-burst') || effectType === 'no-burst');

    this.isTadpole = Boolean(
      preset?.isTadpole ||
      preset?.shellType === 'comet_tadpole_burst' ||
      preset?.dynamicsType === 'tadpole-spiral' ||
      preset?.dynamics === 'tadpole-spiral' ||
      effects.includes('tadpole-flurry') ||
      effects.includes('tadpole_flurry') ||
      effectType === 'tadpole-flurry' ||
      effectType === 'tadpole_flurry'
    );

    this.isWhiteStrobe = effects.includes('white-strobe') || effectType === 'white-strobe';
    this.isGlitterStrobe = effects.includes('glitter-strobe') || effectType === 'glitter-strobe';
    this.hasStrobe = Boolean(
      preset?.strobe ||
      effects.includes('strobe') ||
      this.isWhiteStrobe ||
      this.isGlitterStrobe
    );

    if (this.hasFlow) {
      this.flowPhase = Math.random() * Math.PI * 2;
      this.flowSpeed = 4.5 + Math.random() * 2.0;
      this.flowAmp = 3.5 + Math.random() * 2.0;
    }

    if (this.hasGhost) {
      this.ghostIgniteTime = this.timeToApex * (0.42 + Math.random() * 0.12);
    }

    // Stochastic Strobe / Glitter State Machine
    const flashRate = this.isGlitterStrobe
      ? (6.5 + Math.random() * 2.5)
      : (4.5 + Math.random() * 3.0);
    const flashColor = this.isWhiteStrobe
      ? new THREE.Color(0xffffff)
      : (this.isGlitterStrobe ? new THREE.Color(0xffe599) : new THREE.Color(0xffffff));

    this.strobe = {
      state: 'smolder', // 'smolder', 'flash', 'recovery'
      stateTime: 0,
      nextFlashInterval: -Math.log(1 - Math.random() * 0.99) / flashRate,
      flashDuration: this.isGlitterStrobe ? (0.035 + Math.random() * 0.02) : (0.045 + Math.random() * 0.025),
      recoveryDuration: 0.03 + Math.random() * 0.02,
      flashRate,
      activationThreshold: 0.50 + Math.random() * 0.18, // 50% - 68%
      energy: 0,
      intensity: 0,
      peakScaleBoost: this.isGlitterStrobe ? 2.6 : (2.0 + Math.random() * 0.8),
      peakEmission: this.isWhiteStrobe ? 4.2 : (this.isGlitterStrobe ? 3.6 : (2.5 + Math.random() * 1.5)),
      attackRate: 150.0,
      decayRate: 40.0,
      doubleFlashChance: this.isGlitterStrobe ? 0.35 : 0.15,
      isDoubleFlash: false,
      flashColor,
      tempColor: new THREE.Color()
    };

    if (this.isGhostFlare) {
      this.ghostFlare = {
        stage: 'ascent', // 'ascent' -> 'dark' -> 'flare' -> 'decayed'
        flarePeakScale: 0.78, // Sáng lại nhưng kích thước nhỏ hơn ban đầu (78%)
        flareMaxOpacity: 0.65, // Đỉnh sáng lại yếu hơn ban đầu (65% so với 100% ban đầu)
        tempColor: new THREE.Color()
      };
    }

    // Tỷ lệ hạt lấp lánh
    this.isStrobeStar = preset?.isStrobeStar !== undefined
      ? preset.isStrobeStar
      : (this.hasStrobe && (this.isGlitterStrobe || Math.random() < (preset?.strobeRatio ?? 0.30)));
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

    const isDetached = Boolean(this.preset?.detachedTrail)
      || this.preset?.cometTrail === 'detached'
      || this.preset?.cometTrail === 'detached-trail'
      || this.preset?.shellType === 'comet_cluster_detached';
    const detachedHeadScale = isDetached
      ? (Number.isFinite(preset?.detachedHeadScale) && preset.detachedHeadScale > 0
        ? preset.detachedHeadScale : 0.42)
      : 1;
    if (this.preset?.shellType === 'comet_cluster_notrail' || this.hasNoTrail) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)
      );
      geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(
          new Float32Array([
            color.r * 4.0,
            color.g * 4.0,
            color.b * 4.0
          ]),
          3
        )
      );

      const material = new THREE.PointsMaterial({
        size: 34 * detachedHeadScale,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });

      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          
          vec2 p = gl_PointCoord - vec2(0.5, 0.38);
          float aspect = 1.85;
          float px = p.x * aspect;
          float py = p.y;
          float taper = py > 0.0 ? (1.0 + py * 1.5) : 1.0;
          float dist = length(vec2(px * taper, py * 1.25)) * 2.0;
          if (dist > 1.0) discard;
          
          vec2 coreP = gl_PointCoord - vec2(0.5, 0.34);
          float coreDist = length(vec2(coreP.x * 2.2, coreP.y * 1.8)) * 2.0;
          
          vec4 stop0 = vec4(4.0, 4.0, 4.0, 1.0);
          vec4 stop1 = vec4(diffuseColor.rgb * 2.0 + vec3(0.4), 0.90);
          vec4 stop2 = vec4(diffuseColor.rgb * 1.2, 0.45);
          vec4 stop3 = vec4(diffuseColor.rgb * 0.4, 0.12);
          vec4 stop4 = vec4(0.0, 0.0, 0.0, 0.0);
          
          vec4 gradientColor;
          if (coreDist < 0.08) {
              float ct = coreDist / 0.08;
              gradientColor = mix(stop0, stop1, ct);
          } else if (dist < 0.28) {
              float t = (dist - 0.08) / (0.28 - 0.08);
              gradientColor = mix(stop1, stop2, clamp(t, 0.0, 1.0));
          } else if (dist < 0.65) {
              float t = (dist - 0.28) / (0.65 - 0.28);
              gradientColor = mix(stop2, stop3, t);
          } else {
              float t = (dist - 0.65) / (1.0 - 0.65);
              gradientColor = mix(stop3, stop4, t);
          }
          
          diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a);
          `
        );
      };

      this.coreMesh = new THREE.Points(geometry, material);
      this.mesh.add(this.coreMesh);
    } else {
      // Use a slightly vertically elongated core for motion blur feel
      const isTadpole = Boolean(this.isTadpole);
      const isSuperBright = isDetached
        || Boolean(this.preset?.isSingleComet)
        || Boolean(this.preset?.superBrightHead)
        || isTadpole
        || this.preset?.shellType === 'comet_single';
      const isSparkly = Boolean(this.isStrobeStar);

      if (isSuperBright) {
        this.coreColor = color.clone().offsetHSL(0, 0.05, 0.30).multiplyScalar(9.0);
      } else if (isSparkly) {
        this.coreColor.multiplyScalar(0.4);
      } else {
        // All cluster and standard comet stars now have firework star radiance (bloom + color luminance)
        this.coreColor = color.clone().offsetHSL(0, 0.04, 0.15).multiplyScalar(4.5);
      }

      const coreSize = (isTadpole
        ? COMET_CORE_SIZE * 1.6
        : (isSuperBright ? COMET_CORE_SIZE * 1.6 : COMET_CORE_SIZE)) * detachedHeadScale;
      const coreGeometry = new THREE.SphereGeometry(coreSize, 8, 8);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: this.coreColor,
        transparent: true,
        opacity: isSparkly ? 0.85 : 1.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
      if (isSparkly) {
        this.coreMesh.scale.set(0.4, 1.2, 0.4);
      } else if (isTadpole) {
        this.coreMesh.scale.set(0.9, 1.6, 0.9);
      } else if (isSuperBright) {
        this.coreMesh.scale.set(0.85, 1.7, 0.85);
      } else {
        this.coreMesh.scale.set(0.65, 1.65, 0.65);
      }
      this.mesh.add(this.coreMesh);

      // Hot white burning core for all firework star heads
      const innerSizeRatio = isTadpole ? 0.68 : (isSuperBright ? 0.70 : 0.60);
      const innerBrightness = isTadpole ? 11.0 : (isSuperBright ? 12.0 : 8.0);
      const innerGeometry = new THREE.SphereGeometry(coreSize * innerSizeRatio, 8, 8);
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffffff).multiplyScalar(innerBrightness),
        transparent: true,
        opacity: isSparkly ? 0.85 : 1.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      this.innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
      const innerScaleX = isSparkly ? 0.4 : (isTadpole ? 0.85 : (isSuperBright ? 0.85 : 0.65));
      const innerScaleY = isSparkly ? 1.2 : (isTadpole ? 1.55 : (isSuperBright ? 1.7 : 1.65));
      this.innerMesh.scale.set(innerScaleX, innerScaleY, innerScaleX);
      this.mesh.add(this.innerMesh);
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
    this.initialCoreOpacity = this.coreMesh.material.opacity;
    this.initialPointSize = this.coreMesh.isPoints ? this.coreMesh.material.size : null;
  }

  get isGhostDarkPhase() {
    return Boolean(this.isGhostFlare && this.ghostFlare?.stage === 'dark');
  }

  get isGhostFlaring() {
    return Boolean(this.isGhostFlare && this.ghostFlare?.stage === 'flare');
  }

  get isGhostInvisible() {
    return Boolean(this.hasGhost && this.age < this.ghostIgniteTime);
  }

  shouldSpawnTrail(minDistanceSq = 0.64) {
    if (this.hasNoTrail || this.isGhostDarkPhase || this.isGhostInvisible) {
      return false;
    }
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
      this.velocity.y += -30 * this.gravityScale * deltaTime; // Gravity
      this.ballisticPosition.addScaledVector(this.velocity, deltaTime);
      this.age += deltaTime;

      if (this.isGhostFlare) {
        if (this.ghostFlare.stage === 'ascent' && this.age >= this.ghostFlare.darkStartTime) {
          this.ghostFlare.stage = 'dark';
        }
      }

      if (this.isTadpole) {
        const totalDuration = this.preset?.maxDecayTime ?? (this.initialVy > 0 ? Math.max(0.1, this.initialVy / 30) : 1.8);
        const progress = Math.min(1.0, this.age / totalDuration);
        this.tadpoleProgress = progress;

        // Lắc nhẹ nhàng tự nhiên (gentle sway) theo mặt phẳng trực giao với hướng bay
        const swayAmp = 0.30 + 0.40 * Math.sin(progress * Math.PI * 0.95);
        const swayFreq = 1.85 * Math.PI * 2;
        this.tadpolePhase = (this.tadpolePhase || 0) + swayFreq * deltaTime;

        // Góc lắc cố định tự nhiên cho mỗi quả
        if (this.tadpoleSwayAngle === undefined) {
          this.tadpoleSwayAngle = Math.random() * Math.PI * 2;
        }

        const lateralOffset = Math.sin(this.tadpolePhase) * swayAmp;
        const depthOffset = Math.sin(this.tadpolePhase * 0.6) * (swayAmp * 0.25);

        const velLenSq = this.velocity.lengthSq();
        if (velLenSq > 0.04) {
          const vDir = this.velocity.clone().normalize();
          const refUp = Math.abs(vDir.y) > 0.88 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
          const vRight = new THREE.Vector3().crossVectors(vDir, refUp).normalize();
          const vUp = new THREE.Vector3().crossVectors(vRight, vDir).normalize();

          const offsetVec = new THREE.Vector3()
            .addScaledVector(
              vRight,
              lateralOffset * Math.cos(this.tadpoleSwayAngle) - depthOffset * Math.sin(this.tadpoleSwayAngle)
            )
            .addScaledVector(
              vUp,
              lateralOffset * Math.sin(this.tadpoleSwayAngle) + depthOffset * Math.cos(this.tadpoleSwayAngle)
            );

          this.mesh.position.copy(this.ballisticPosition).add(offsetVec);
        } else {
          this.mesh.position.copy(this.ballisticPosition);
        }
      } else if (this.spiral) {
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
      } else if (this.hasFlow) {
        const flowT = this.age * this.flowSpeed + this.flowPhase;
        const flowOffsetX = Math.sin(flowT) * this.flowAmp;
        const flowOffsetZ = Math.cos(flowT * 1.3) * (this.flowAmp * 0.8);
        this.mesh.position.set(
          this.ballisticPosition.x + flowOffsetX,
          this.ballisticPosition.y,
          this.ballisticPosition.z + flowOffsetZ
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
        this.coreColor.copy(this.color).multiplyScalar(4.5);
        if (this.coreMesh && this.coreMesh.material) {
          this.coreMesh.material.color.copy(this.coreColor);
        }
      }

      // Check if it reached the apex (velocity.y <= 0)
      if (this.velocity.y <= 0) {
        this.state = CometEntity.STATE.DECAYING;
        if (this.isGhostFlare && this.synchronizedLifetime === null && (this.ghostFlare.stage === 'dark' || this.ghostFlare.stage === 'ascent')) {
          this.ghostFlare.stage = 'flare';
          this.ghostFlare.flareTimer = 0;
        }
      }
    } else if (this.state === CometEntity.STATE.DECAYING) {
      if (this.synchronizedLifetime !== null || this.isGhostFlare) this.age += deltaTime;
      this.prevPosition.copy(this.mesh.position);
      // Triệt tiêu dần vận tốc để comet đứng im tại điểm cao nhất (apex), không bị rơi xuống do trọng lực
      this.velocity.multiplyScalar(Math.max(0, 1.0 - 8.0 * deltaTime));
      this.ballisticPosition.addScaledVector(this.velocity, deltaTime);
      this.mesh.position.copy(this.ballisticPosition);
      if (this.velocity.lengthSq() > 0.01) {
        this.updateRotation();
      }
      if (this.isGhostFlare && this.synchronizedLifetime === null && (this.ghostFlare.stage === 'dark' || this.ghostFlare.stage === 'ascent')) {
        this.ghostFlare.stage = 'flare';
        this.ghostFlare.flareTimer = 0;
      }
    }

    // Fading logic for standard comets (when not ghost flare)
    if (!this.isGhostFlare) {
      if (
        !this.isFading &&
        (this.age >= this.fadeStartTime ||
          (this.synchronizedLifetime === null && this.state === CometEntity.STATE.DECAYING))
      ) {
        this.isFading = true;
      }

      if (this.isFading) {
        this.decayTime = this.synchronizedLifetime !== null
          ? Math.max(0, this.age - this.fadeStartTime)
          : this.decayTime + deltaTime;
        const decayRatio = Math.min(1.0, this.decayTime / this.maxDecayTime);

        if (decayRatio >= 1.0) {
          if (this.synchronizedLifetime !== null) {
            this.coreMesh.material.opacity = 0;
            if (this.innerMesh) this.innerMesh.material.opacity = 0;
          }
          this.state = CometEntity.STATE.DEAD;
        } else {
          const synchronized = this.synchronizedLifetime !== null;
          const fadeRatio = synchronized
            ? decayRatio * decayRatio * (3 - 2 * decayRatio)
            : Math.pow(decayRatio, 2.2);
          const opacity = synchronized
            ? this.initialCoreOpacity * Math.pow(1 - fadeRatio, 2)
            : 1.0 - fadeRatio;
          // Fade out opacity
          this.coreMesh.material.opacity = opacity;
          if (this.innerMesh && this.innerMesh.material) {
            this.innerMesh.material.opacity = opacity;
          }
          // Points sprites ignore object scale when calculating pixel size.
          if (synchronized && this.initialPointSize !== null) {
            this.coreMesh.material.size = this.initialPointSize * (0.3 + 0.7 * (1 - fadeRatio));
          }
          // Shrink core
          const scale = 1.0 - fadeRatio * 0.8;
          if (this.preset?.shellType !== 'comet_cluster_notrail') {
            const isSuperBright = Boolean(this.preset?.detachedTrail)
              || this.preset?.cometTrail === 'detached'
              || this.preset?.cometTrail === 'detached-trail'
              || this.preset?.shellType === 'comet_cluster_detached'
              || Boolean(this.preset?.isSingleComet)
              || Boolean(this.preset?.superBrightHead)
              || this.preset?.shellType === 'comet_single';
            const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : (isSuperBright ? 0.85 : 0.65);
            const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : (isSuperBright ? 1.7 : 1.65);
            this.coreMesh.scale.set(
              baseScaleX * scale,
              baseScaleY * scale,
              baseScaleX * scale
            );
            if (this.innerMesh) {
              this.innerMesh.scale.set(
                baseScaleX * scale,
                baseScaleY * scale,
                baseScaleX * scale
              );
            }
          }
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
      !this.isFading &&
      !this.isGhostFlare;

    const isDimmingNonStrobe = hasStrobeTag &&
      this.synchronizedLifetime === null &&
      !this.isStrobeStar &&
      this.state === CometEntity.STATE.LAUNCHING &&
      this.age >= this.dimStartTime &&
      !this.isGhostFlare;

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
      if (this.innerMesh) {
        this.innerMesh.visible = true;
      }
      const energy = this.strobe.energy;

      // 1. Opacity: 0.18 tối âm ỉ -> 1.0 chớp sáng
      this.coreMesh.material.opacity = 0.18 + energy * 0.82;
      if (this.innerMesh && this.innerMesh.material) {
        this.innerMesh.material.opacity = 0.18 + energy * 0.82;
      }

      // 2. Scale: Phình to tức thì ngay tại thời điểm lóe xung nhọn
      const scaleMultiplier = 1.0 + energy * (this.strobe.peakScaleBoost - 1.0);
      const isSuperBright = Boolean(this.preset?.detachedTrail)
        || this.preset?.cometTrail === 'detached'
        || this.preset?.cometTrail === 'detached-trail'
        || this.preset?.shellType === 'comet_cluster_detached'
        || Boolean(this.preset?.isSingleComet)
        || Boolean(this.preset?.superBrightHead)
        || this.preset?.shellType === 'comet_single';
      const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : (isSuperBright ? 0.85 : 0.65);
      const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : (isSuperBright ? 1.7 : 1.65);
      this.coreMesh.scale.set(
        baseScaleX * scaleMultiplier,
        baseScaleY * scaleMultiplier,
        baseScaleX * scaleMultiplier
      );
      if (this.innerMesh) {
        this.innerMesh.scale.set(
          baseScaleX * scaleMultiplier,
          baseScaleY * scaleMultiplier,
          baseScaleX * scaleMultiplier
        );
      }

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
      if (this.innerMesh) {
        this.innerMesh.visible = this.coreMesh.visible;
      }
      if (this.coreMesh.material) {
        this.coreMesh.material.opacity = fadeFactor;
        if (this.innerMesh && this.innerMesh.material) {
          this.innerMesh.material.opacity = fadeFactor;
        }
        if (this.coreMesh.material.color) {
          this.coreMesh.material.color.copy(this.coreColor);
        }
      }
      const scaleFactor = Math.max(0.1, 1.0 - dimProgress * 0.75);
      const isSuperBright = Boolean(this.preset?.detachedTrail)
        || this.preset?.cometTrail === 'detached'
        || this.preset?.cometTrail === 'detached-trail'
        || this.preset?.shellType === 'comet_cluster_detached'
        || Boolean(this.preset?.isSingleComet)
        || Boolean(this.preset?.superBrightHead)
        || this.preset?.shellType === 'comet_single';
      const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : (isSuperBright ? 0.85 : 0.65);
      const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : (isSuperBright ? 1.7 : 1.65);
      this.coreMesh.scale.set(
        baseScaleX * scaleFactor,
        baseScaleY * scaleFactor,
        baseScaleX * scaleFactor
      );
      if (this.innerMesh) {
        this.innerMesh.scale.set(
          baseScaleX * scaleFactor,
          baseScaleY * scaleFactor,
          baseScaleX * scaleFactor
        );
      }
    } else if (this.isGhostFlare) {
      // 4-Phase Ghost Flare Lifecycle (synchronized to lifeRatio, matching firework optics)
      const totalLifetime = this.totalLifetime || this.synchronizedLifetime || (this.timeToApex + this.maxDecayTime);
      const lifeRatio = totalLifetime > 0 ? Math.min(1.0, this.age / totalLifetime) : 1.0;

      if (lifeRatio >= 1.0) {
        this.ghostFlare.stage = 'decayed';
        this.coreMesh.material.opacity = 0;
        if (this.innerMesh && this.innerMesh.material) this.innerMesh.material.opacity = 0;
        this.state = CometEntity.STATE.DEAD;
        return true;
      }

      let currentOpacity = 0.0;
      let currentScale = 1.0;
      let currentBrightness = 1.0;

      if (lifeRatio < 0.35) {
        // Pha 1: Sáng ban đầu (Ascent phase)
        this.ghostFlare.stage = 'ascent';
        currentOpacity = this.initialCoreOpacity;
        currentScale = 1.0;
        currentBrightness = 1.0;
      } else if (lifeRatio < 0.60) {
        // Pha 2: Tối đi (Dark smolder phase)
        this.ghostFlare.stage = 'dark';
        const darkTransition = Math.min(1.0, (lifeRatio - 0.35) / 0.15);
        const smoothDark = darkTransition * darkTransition * (3 - 2 * darkTransition);
        currentOpacity = THREE.MathUtils.lerp(this.initialCoreOpacity, 0.06, smoothDark);
        currentScale = THREE.MathUtils.lerp(1.0, 0.35, smoothDark);
        currentBrightness = Math.max(0.15, 1.0 - smoothDark * 0.75);
      } else if (lifeRatio < 0.76) {
        // Pha 3: Sáng lại - nhưng yếu hơn ban đầu (Re-ignition phase)
        this.ghostFlare.stage = 'flare';
        const t = (lifeRatio - 0.60) / 0.16;
        const smoothReignite = t * t * (3 - 2 * t);
        const maxOpacity = this.ghostFlare.flareMaxOpacity ?? 0.65;
        const peakScale = this.ghostFlare.flarePeakScale ?? 0.78;
        currentOpacity = THREE.MathUtils.lerp(0.06, maxOpacity, smoothReignite);
        currentScale = THREE.MathUtils.lerp(0.35, peakScale, smoothReignite);
        currentBrightness = 0.25 + 0.45 * smoothReignite;
      } else {
        // Pha 4: Tối dần (Fade-out phase)
        this.ghostFlare.stage = 'flare';
        const t = Math.min(1.0, Math.max(0.0, (lifeRatio - 0.76) / 0.24));
        const decayFactor = Math.pow(1.0 - t, 3.5);
        const maxOpacity = this.ghostFlare.flareMaxOpacity ?? 0.65;
        const peakScale = this.ghostFlare.flarePeakScale ?? 0.78;
        currentOpacity = maxOpacity * decayFactor;
        currentScale = peakScale * decayFactor;
        currentBrightness = 0.70 * decayFactor;
      }

      this.coreMesh.visible = currentOpacity > 0.005;
      if (this.coreMesh.material) {
        this.coreMesh.material.opacity = currentOpacity;
        if (this.initialPointSize !== null) {
          this.coreMesh.material.size = this.initialPointSize * currentScale;
        }
        if (this.coreMesh.material.color) {
          this.ghostFlare.tempColor.copy(this.coreColor).multiplyScalar(currentBrightness);
          this.coreMesh.material.color.copy(this.ghostFlare.tempColor);
        }
      }

      if (this.preset?.shellType !== 'comet_cluster_notrail') {
        const isSuperBright = Boolean(this.preset?.detachedTrail)
          || this.preset?.cometTrail === 'detached'
          || this.preset?.cometTrail === 'detached-trail'
          || this.preset?.shellType === 'comet_cluster_detached'
          || Boolean(this.preset?.isSingleComet)
          || Boolean(this.preset?.superBrightHead)
          || this.preset?.shellType === 'comet_single';
        const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : (isSuperBright ? 0.85 : 0.65);
        const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : (isSuperBright ? 1.7 : 1.65);
        this.coreMesh.scale.set(
          baseScaleX * currentScale,
          baseScaleY * currentScale,
          baseScaleX * currentScale
        );
      }

      if (this.innerMesh) {
        this.innerMesh.visible = this.coreMesh.visible;
        if (this.innerMesh.material) {
          this.innerMesh.material.opacity = this.coreMesh.material.opacity;
        }
        this.innerMesh.scale.copy(this.coreMesh.scale);
      }
    } else {
      if (this.isGhostInvisible) {
        this.coreMesh.visible = false;
        if (this.innerMesh) {
          this.innerMesh.visible = false;
        }
      } else {
        let ghostOpacity = 1.0;
        if (this.hasGhost) {
          const igniteElapsed = this.age - this.ghostIgniteTime;
          ghostOpacity = Math.min(1.0, Math.max(0.0, igniteElapsed / 0.12));
        }

        const isVisible = this.preset?.sparkleAtEnd
          ? (this.state === CometEntity.STATE.DECAYING || this.isFading)
          : true;
        this.coreMesh.visible = isVisible;
        if (this.innerMesh) {
          this.innerMesh.visible = isVisible;
        }

        if (this.coreMesh.material && this.coreMesh.material.color) {
          this.coreMesh.material.color.copy(this.coreColor);
          if (this.hasGhost) {
            this.coreMesh.material.opacity = ghostOpacity;
            if (this.innerMesh && this.innerMesh.material) {
              this.innerMesh.material.opacity = ghostOpacity;
            }
          }
        }
        // Khôi phục scale gốc
        if (
          !this.isFading &&
          this.preset?.shellType !== 'comet_cluster_notrail'
        ) {
          const isTadpole = Boolean(this.isTadpole);
          const isSuperBright = Boolean(this.preset?.detachedTrail)
            || this.preset?.cometTrail === 'detached'
            || this.preset?.cometTrail === 'detached-trail'
            || this.preset?.shellType === 'comet_cluster_detached'
            || Boolean(this.preset?.isSingleComet)
            || Boolean(this.preset?.superBrightHead)
            || isTadpole
            || this.preset?.shellType === 'comet_single';
          const baseScaleX = this.preset?.sparkleAtEnd
            ? 0.4
            : (isTadpole ? 0.9 : (isSuperBright ? 0.85 : 0.65));
          const baseScaleY = this.preset?.sparkleAtEnd
            ? 1.2
            : (isTadpole ? 1.6 : (isSuperBright ? 1.7 : 1.65));
          const scaleMod = this.hasGhost ? (0.3 + 0.7 * ghostOpacity) : 1.0;
          this.coreMesh.scale.set(
            baseScaleX * scaleMod,
            baseScaleY * scaleMod,
            baseScaleX * scaleMod
          );
          if (this.innerMesh) {
            this.innerMesh.scale.set(
              baseScaleX * scaleMod,
              baseScaleY * scaleMod,
              baseScaleX * scaleMod
            );
          }
        }
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
