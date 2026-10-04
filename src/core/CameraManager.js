import * as THREE from 'three';
import { globalEventBus } from './EventBus.js';

export class CameraManager {
  constructor(eventBus = null) {
    const aspect = typeof window !== 'undefined'
      ? window.innerWidth / window.innerHeight
      : 16 / 9;

    // 65 degree FOV for cinematic landscape depth
    this.instance = new THREE.PerspectiveCamera(
      65,
      aspect,
      0.1,
      10000
    );

    // Position camera close to water surface (50% sky, 50% lake composition)
    this.instance.position.set(0, 6, 420);
    this.instance.lookAt(0, 75, 0);

    this.eventBus = eventBus || globalEventBus;
    this.trauma = 0.0;
    this.shakeTime = 0.0;
    this.shakeOffset = new THREE.Vector3();
    this.shakeRotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.tempVector = new THREE.Vector3();
    this.isShakingApplied = false;
    this.enabled = true;

    // Camera Perspective Modes: 'free', 'boat', 'birds_eye'
    this.mode = 'free';
    this.sceneManager = null;
    this.stageTarget = new THREE.Vector3(0, 75, 0);

    // River Boat vantage settings
    this.boatOffset = new THREE.Vector3(0, 0, 0);
    this.userBoatLocalPos = new THREE.Vector3(0, 0, 0);

    // Birds Eye aerial drifting settings
    this.birdsEyePos = new THREE.Vector3(0, 220, 380);
    this.birdsEyeSpeed = 18.0;
    this.speedMultiplier = 1.0;
    this.birdsEyeDriftHeading = new THREE.Vector3(1, 0, -0.2).normalize();
    this.lastWasdDirection = new THREE.Vector2(1, 0);

    // Saved states for switching back to free mode
    this.savedFreePosition = new THREE.Vector3(0, 6, 420);
    this.savedFreeRotation = new THREE.Euler(0, 0, 0);

    this.eventSubscriptions = [];
    if (this.eventBus && typeof this.eventBus.on === 'function') {
      this.eventSubscriptions.push(
        this.eventBus.on('firework:burst', (detail) => {
          this.onBurst(detail);
        })
      );
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize.bind(this));
    }
  }

  get userBoatOffset() {
    return this.userBoatLocalPos;
  }

  setMode(mode) {
    const validModes = ['free', 'boat', 'birds_eye'];
    const targetMode = validModes.includes(mode) ? mode : 'free';

    if (this.mode === targetMode) {
      return;
    }

    if (this.mode === 'free') {
      this.savedFreePosition.copy(this.instance.position);
      this.savedFreeRotation.copy(this.instance.rotation);
    }

    this.mode = targetMode;

    if (this.mode === 'free') {
      this.instance.position.copy(this.savedFreePosition);
      this.instance.rotation.copy(this.savedFreeRotation);
    } else if (this.mode === 'boat') {
      this.userBoatLocalPos.set(0, 0, 0);
      if (this.sceneManager) {
        if (typeof this.sceneManager.setBoatPassengerPos === 'function') {
          this.sceneManager.setBoatPassengerPos(0, 0);
        }
        const boatTransform = typeof this.sceneManager.getBoatTransform === 'function'
          ? this.sceneManager.getBoatTransform(0, 0)
          : null;
        if (boatTransform) {
          this.instance.position.set(
            boatTransform.x,
            boatTransform.y,
            boatTransform.z
          );
        }
      }
      this.instance.lookAt(this.stageTarget);
    } else if (this.mode === 'birds_eye') {
      this.birdsEyePos.set(0, 220, 380);
      this.birdsEyeDriftHeading.set(1, 0, -0.15).normalize();
      this.instance.position.copy(this.birdsEyePos);
      this.instance.lookAt(this.stageTarget);
    }
  }

  resetPosition() {
    if (this.mode === 'free') {
      this.instance.position.set(0, 6, 420);
      this.instance.lookAt(0, 75, 0);
      this.savedFreePosition.set(0, 6, 420);
      this.savedFreeRotation.copy(this.instance.rotation);
    } else if (this.mode === 'boat') {
      this.userBoatLocalPos.set(0, 0, 0);
      if (
        this.sceneManager &&
        typeof this.sceneManager.resetBoats === 'function'
      ) {
        this.sceneManager.resetBoats();
      }
      if (this.sceneManager) {
        if (typeof this.sceneManager.setBoatPassengerPos === 'function') {
          this.sceneManager.setBoatPassengerPos(0, 0);
        }
        const boatTransform = typeof this.sceneManager.getBoatTransform === 'function'
          ? this.sceneManager.getBoatTransform(0, 0)
          : null;
        if (boatTransform) {
          this.instance.position.set(
            boatTransform.x,
            boatTransform.y,
            boatTransform.z
          );
        }
      }
      this.instance.lookAt(this.stageTarget);
    } else if (this.mode === 'birds_eye') {
      this.birdsEyePos.set(0, 220, 380);
      this.birdsEyeDriftHeading.set(1, 0, -0.15).normalize();
      this.instance.position.copy(this.birdsEyePos);
      this.instance.lookAt(this.stageTarget);
    }

    if (this.movementSystem) {
      this.movementSystem.reset();
    }
  }

  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = Math.max(0.1, parseFloat(multiplier) || 1.0);
  }

  handleWasdInput(
    dirX,
    dirZ,
    shift,
    deltaTime
  ) {
    if (dirX !== 0 || dirZ !== 0) {
      this.lastWasdDirection.set(dirX, dirZ).normalize();
    }

    // Compute horizontal forward and right vectors aligned with current camera view
    const forward = new THREE.Vector3();
    this.instance.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0.0001) {
      forward.normalize();
    } else {
      forward.set(0, 0, -1);
    }

    const right = new THREE.Vector3();
    right.crossVectors(forward, this.instance.up).normalize();

    // View-relative movement vector
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(right, dirX);
    moveDir.addScaledVector(forward, dirZ);
    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
    }

    if (this.mode === 'birds_eye') {
      if (dirX !== 0 || dirZ !== 0) {
        // Steer flight drift heading relative to view angle
        this.birdsEyeDriftHeading.copy(moveDir);

        // Responsive glide nudge
        this.birdsEyePos.x += moveDir.x * 65.0 * this.speedMultiplier * deltaTime;
        this.birdsEyePos.z += moveDir.z * 65.0 * this.speedMultiplier * deltaTime;
      }

      if (shift && (dirZ !== 0)) {
        this.birdsEyePos.y += dirZ * 45.0 * this.speedMultiplier * deltaTime;
        this.birdsEyePos.y = Math.max(110.0, Math.min(380.0, this.birdsEyePos.y));
      }
    } else if (this.mode === 'boat') {
      if (dirX !== 0 || dirZ !== 0) {
        if (shift) {
          // Shift + WASD: Drive and steer the boat itself along the river!
          if (
            this.sceneManager &&
            typeof this.sceneManager.steerBoat === 'function'
          ) {
            this.sceneManager.steerBoat(
              moveDir.x * deltaTime,
              moveDir.z * deltaTime,
              this.speedMultiplier
            );
          }
        } else {
          // Normal WASD: Walk across the physical boat deck relative to view direction
          let localDeltaX = moveDir.x;
          let localDeltaZ = moveDir.z;

          const currentBoat = this.sceneManager?.getBoatTransform
            ? this.sceneManager.getBoatTransform(
                this.userBoatLocalPos.x,
                this.userBoatLocalPos.z
              )
            : null;

          if (currentBoat && currentBoat.dir < 0) {
            localDeltaX = -moveDir.x;
            localDeltaZ = -moveDir.z;
          }

          const walkSpeed = 14.0 * this.speedMultiplier;
          this.userBoatLocalPos.x += localDeltaX * walkSpeed * deltaTime;
          this.userBoatLocalPos.z += localDeltaZ * walkSpeed * deltaTime;

          // Keep vantage within physical walkable deck boundaries
          this.userBoatLocalPos.x = Math.max(-13.0, Math.min(13.5, this.userBoatLocalPos.x));
          this.userBoatLocalPos.z = Math.max(-2.4, Math.min(2.4, this.userBoatLocalPos.z));
        }
      }
    }
  }

  onResize() {
    if (typeof window !== 'undefined') {
      this.instance.aspect = window.innerWidth / window.innerHeight;
      this.instance.updateProjectionMatrix();
    }
  }

  onBurst(detail = {}) {
    if (!this.enabled || !detail) {
      return;
    }

    const rawIntensity = detail.intensity ?? 0.5;
    const burstPos = detail.position;

    let distanceFactor = 1.0;
    if (burstPos && burstPos.x !== undefined) {
      this.tempVector.set(
        burstPos.x,
        burstPos.y,
        burstPos.z
      );
      const dist = Math.max(
        25.0,
        this.instance.position.distanceTo(this.tempVector)
      );
      // Inverse distance falloff: close bursts impart heavy impulse, far bursts impart subtle tremor
      distanceFactor = Math.min(1.4, 220.0 / dist);
    }

    // Heavy bursts (shell size >= 3" or finale) impart noticeable acoustic thump
    const addedTrauma = Math.pow(rawIntensity, 1.3) * 0.38 * distanceFactor;
    this.trauma = Math.min(0.70, this.trauma + addedTrauma);
  }

  addImpulse(intensity = 0.4) {
    if (!this.enabled) {
      return;
    }
    this.trauma = Math.min(0.70, this.trauma + intensity);
  }

  update(deltaTime) {
    // 1. Perspective Modes Handling
    if (this.mode === 'boat') {
      if (this.sceneManager) {
        if (typeof this.sceneManager.setBoatPassengerPos === 'function') {
          this.sceneManager.setBoatPassengerPos(
            this.userBoatLocalPos.x,
            this.userBoatLocalPos.z
          );
        }

        const boatTransform = typeof this.sceneManager.getBoatTransform === 'function'
          ? this.sceneManager.getBoatTransform(
              this.userBoatLocalPos.x,
              this.userBoatLocalPos.z
            )
          : null;

        if (boatTransform) {
          this.instance.position.set(
            boatTransform.x,
            boatTransform.y,
            boatTransform.z
          );
        }
      }
    } else if (this.mode === 'birds_eye') {
      const driftSpeed = (
        this.sceneManager?.riverProps?.driftSpeed || 1.0
      ) * this.birdsEyeSpeed * this.speedMultiplier;

      // Glide in the direction of the last WASD movement
      this.birdsEyePos.x += this.birdsEyeDriftHeading.x * driftSpeed * deltaTime;
      this.birdsEyePos.z += this.birdsEyeDriftHeading.z * driftSpeed * deltaTime;

      // Wrap-around bounds smoothly
      if (this.birdsEyePos.x > 500) {
        this.birdsEyePos.x = -500;
      } else if (this.birdsEyePos.x < -500) {
        this.birdsEyePos.x = 500;
      }
      if (this.birdsEyePos.z > 550) {
        this.birdsEyePos.z = 220;
      } else if (this.birdsEyePos.z < 180) {
        this.birdsEyePos.z = 520;
      }

      this.instance.position.copy(this.birdsEyePos);
    }

    // 2. Camera Shake / Trauma Dissipation
    if (this.trauma <= 0.001) {
      this.trauma = 0.0;
      this.shakeOffset.set(0, 0, 0);
      this.shakeRotation.set(0, 0, 0);
      return;
    }

    this.shakeTime += deltaTime * 48.0;
    // Quadratic trauma produces natural visceral kick and gentle decay
    const shake = this.trauma * this.trauma;

    // Harmonic multi-frequency translational offsets
    const ox = (
      Math.sin(this.shakeTime * 1.15) +
      Math.sin(this.shakeTime * 2.37) * 0.45
    ) * 0.28 * shake;

    const oy = (
      Math.cos(this.shakeTime * 1.35) +
      Math.sin(this.shakeTime * 2.81) * 0.40
    ) * 0.36 * shake;

    const oz = Math.sin(this.shakeTime * 0.95) * 0.15 * shake;

    this.shakeOffset.set(ox, oy, oz);

    // Subtle pitch and roll micro-rotation impulses
    const rx = Math.sin(this.shakeTime * 1.25) * 0.0035 * shake;
    const rz = Math.cos(this.shakeTime * 1.55) * 0.0025 * shake;
    this.shakeRotation.set(rx, 0, rz);

    // Rapid trauma dissipation
    this.trauma = Math.max(0.0, this.trauma - deltaTime * 2.9);
  }

  applyShake() {
    if (this.isShakingApplied) {
      return;
    }
    if (this.shakeOffset.lengthSq() > 0.000001 || this.shakeRotation.x !== 0 || this.shakeRotation.z !== 0) {
      this.instance.position.add(this.shakeOffset);
      this.instance.rotation.x += this.shakeRotation.x;
      this.instance.rotation.z += this.shakeRotation.z;
      this.isShakingApplied = true;
    }
  }

  restoreShake() {
    if (!this.isShakingApplied) {
      return;
    }
    this.instance.position.sub(this.shakeOffset);
    this.instance.rotation.x -= this.shakeRotation.x;
    this.instance.rotation.z -= this.shakeRotation.z;
    this.isShakingApplied = false;
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
    this.eventSubscriptions = [];
  }
}

