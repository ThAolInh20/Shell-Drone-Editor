import * as THREE from 'three';

export class Clock {
  constructor() {
    this.threeClock = new THREE.Clock();
    this.deltaTime = 0;
    this.elapsedTime = 0;
  }

  update() {
    this.deltaTime = this.threeClock.getDelta();
    this.elapsedTime = this.threeClock.getElapsedTime();
  }
}
