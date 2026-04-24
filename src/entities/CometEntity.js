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
    this.maxDecayTime = 0.6; // Time to fade out
    this.state = CometEntity.STATE.INIT;

    this.mesh = new THREE.Group();

    // Use a slightly vertically elongated core for motion blur feel
    const coreGeometry = new THREE.SphereGeometry(COMET_CORE_SIZE, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.coreMesh.scale.set(0.6, 1.8, 0.6); // Elongated in Y
    this.mesh.add(this.coreMesh);

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
      return false;
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
      this.velocity.y += -30 * deltaTime;
      this.mesh.position.addScaledVector(this.velocity, deltaTime);
      this.updateRotation();

      this.decayTime += deltaTime;
      const decayRatio = this.decayTime / this.maxDecayTime;
      
      if (decayRatio >= 1.0) {
        this.state = CometEntity.STATE.DEAD;
      } else {
        // Fade out opacity
        this.coreMesh.material.opacity = 1.0 - decayRatio;
        // Shrink core
        const scale = 1.0 - decayRatio * 0.8;
        this.coreMesh.scale.set(0.6 * scale, 1.8 * scale, 0.6 * scale);
      }
    }

    // Return true if it is completely dead so the system can remove it
    return this.state === CometEntity.STATE.DEAD;
  }

  markDead() {
    this.state = CometEntity.STATE.DEAD;
  }
}
