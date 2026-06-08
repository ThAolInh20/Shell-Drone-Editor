import * as THREE from 'three';

const COMET_CORE_SIZE = 1.2;

export class CometEntity {
  static STATE = {
    INIT: 'init',
    LAUNCHING: 'launching',
    DECAYING: 'decaying',
    DEAD: 'dead'
  };

  constructor({ position, velocity, color, preset = null }) {
    this.type = 'comet';
    this.velocity = velocity;
    this.color = color;
    this.preset = preset;
    this.age = 0;
    this.decayTime = 0;
    this.maxDecayTime = preset?.maxDecayTime ?? 1.4; // Time to fade out (increased from 0.45 to allow falling effect)
    this.state = CometEntity.STATE.INIT;
    this.mesh = new THREE.Group();

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
      const coreColor = color.clone();
      if (isSparkly) {
        coreColor.multiplyScalar(0.3);
      }
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: coreColor,
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

    this.mesh.position.copy(position);
    // Orient the comet towards velocity if needed, but since it falls down, 
    // basic spherical with scale might need to look at velocity.
    // For simplicity, just let it be stretched in local Y and we can rotate it to velocity direction.
    this.updateRotation();

    this.state = CometEntity.STATE.LAUNCHING;
  }

  updateRotation() {
    if (this.velocity.lengthSq() > 0) {
      // Create a quaternion that rotates Y up to the velocity direction
      const up = new THREE.Vector3(0, 1, 0);
      const dir = this.velocity.clone().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
      this.mesh.setRotationFromQuaternion(quaternion);
    }
  }

  update(deltaTime) {
    if (this.state === CometEntity.STATE.DEAD) {
      return true;
    }

    if (this.state === CometEntity.STATE.LAUNCHING) {
      this.velocity.y += -30 * deltaTime; // Gravity
      this.mesh.position.addScaledVector(this.velocity, deltaTime);
      this.age += deltaTime;
      
      this.updateRotation();

      // Check if it reached the apex (velocity.y <= 0)
      if (this.velocity.y <= 0) {
        this.state = CometEntity.STATE.DECAYING;
      }
    } else if (this.state === CometEntity.STATE.DECAYING) {
      // Triệt tiêu dần vận tốc để comet đứng im tại điểm cao nhất (apex), không bị rơi xuống do trọng lực
      this.velocity.multiplyScalar(Math.max(0, 1.0 - 8.0 * deltaTime));
      this.mesh.position.addScaledVector(this.velocity, deltaTime);
      if (this.velocity.lengthSq() > 0.01) {
        this.updateRotation();
      }

      this.decayTime += deltaTime;
      const decayRatio = this.decayTime / this.maxDecayTime;
      
      if (decayRatio >= 1.0) {
        this.state = CometEntity.STATE.DEAD;
      } else {
        // Tốc độ tàn nhanh dần (accelerated fading)
        const fadeRatio = Math.pow(decayRatio, 2.2);
        // Fade out opacity
        this.coreMesh.material.opacity = 1.0 - fadeRatio;
        // Shrink core
        const scale = 1.0 - fadeRatio * 0.8;
        if (this.preset?.shellType !== 'comet_cluster_notrail') {
          const baseScaleX = this.preset?.sparkleAtEnd ? 0.4 : 0.6;
          const baseScaleY = this.preset?.sparkleAtEnd ? 1.2 : 1.8;
          this.coreMesh.scale.set(baseScaleX * scale, baseScaleY * scale, baseScaleX * scale);
        }
      }
    }

    // Hiệu ứng strobe (chớp tắt nhấp nháy) cho lõi comet
    if (this.preset?.strobe && this.state !== CometEntity.STATE.DEAD) {
      const timeMs = this.age * 1000;
      const strobeFreq = 120; // Chớp tần suất 120ms
      this.coreMesh.visible = Math.floor(timeMs / strobeFreq) % 2 === 0;
    } else {
      this.coreMesh.visible = this.preset?.sparkleAtEnd ? (this.state === CometEntity.STATE.DECAYING) : true;
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
