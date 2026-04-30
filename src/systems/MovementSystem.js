import * as THREE from 'three';

export class MovementSystem {
  constructor(inputSystem, camera) {
    this.input = inputSystem;
    this.camera = camera;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.speed = 500.0; // Movement acceleration
    this.friction = 10.0;  // Decrease velocity naturally
  }

  update(deltaTime) {
    if (!this.input.controls.isLocked) return;

    // Apply friction to slow down over time
    this.velocity.x -= this.velocity.x * this.friction * deltaTime;
    this.velocity.z -= this.velocity.z * this.friction * deltaTime;

    // Determine target direction based on inputs
    this.direction.z = Number(this.input.keys.forward) - Number(this.input.keys.backward);
    this.direction.x = Number(this.input.keys.right) - Number(this.input.keys.left);
    this.direction.normalize(); // Ensure consistent speed in all directions (e.g., diagonally)

    if (this.input.keys.forward || this.input.keys.backward) {
      this.velocity.z -= this.direction.z * this.speed * deltaTime;
    }
    if (this.input.keys.left || this.input.keys.right) {
      this.velocity.x -= this.direction.x * this.speed * deltaTime;
    }

    const directions = [];
    if (this.input.keys.forward) directions.push('forward');
    if (this.input.keys.backward) directions.push('backward');
    if (this.input.keys.left) directions.push('left');
    if (this.input.keys.right) directions.push('right');
    this.input.setMovementStatus(directions.join(' + '));

    // PointerLockControls uses moveRight and moveForward which applies math relative to the current viewing angle
    this.input.controls.moveRight(-this.velocity.x * deltaTime);
    this.input.controls.moveForward(-this.velocity.z * deltaTime);

    // this.constrainToLaunchViewZone();
  }

  // constrainToLaunchViewZone() {
  //   const launchZone = this.input.fireworkSystem?.getLaunchZone?.();
  //   if (!launchZone) {
  //     return;
  //   }

  //   const { center, noEntryHalfWidth, noEntryHalfDepth, boundaryPadding } = launchZone;
  //   const cameraPosition = this.camera.position;
  //   const deltaX = cameraPosition.x - center.x;
  //   const deltaZ = cameraPosition.z - center.z;

  //   if (Math.abs(deltaX) >= noEntryHalfWidth || Math.abs(deltaZ) >= noEntryHalfDepth) {
  //     return;
  //   }

  //   const xPenetration = noEntryHalfWidth - Math.abs(deltaX);
  //   const zPenetration = noEntryHalfDepth - Math.abs(deltaZ);

  //   if (xPenetration < zPenetration) {
  //     cameraPosition.x = center.x + Math.sign(deltaX || 1) * (noEntryHalfWidth + boundaryPadding);
  //     this.velocity.x = 0;
  //   } else {
  //     cameraPosition.z = center.z + Math.sign(deltaZ || 1) * (noEntryHalfDepth + boundaryPadding);
  //     this.velocity.z = 0;
  //   }
  // }
}
