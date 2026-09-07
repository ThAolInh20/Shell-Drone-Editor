import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { LAYER_REFLECTION } from '../config/layers.js';

export class LaunchBarge {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LaunchBargeGroup';
    this.time = 0;
    this.beaconLights = [];

    this._createBarges();
    this.setLayer(LAYER_REFLECTION);
  }

  _createBarges() {
    const center = LAUNCH_ZONE_CONFIG.center;
    const arcRadius = LAUNCH_ZONE_CONFIG.arcRadius || 360;

    // Angles for the 3 barge clusters (left, center, right)
    const angles = [
      (140 + 220) * 0.5 * Math.PI / 180, // Left sector
      (50 + 130) * 0.5 * Math.PI / 180,  // Center sector
      (-40 + 40) * 0.5 * Math.PI / 180   // Right sector
    ];

    const platformGeo = new THREE.BoxGeometry(32, 1.2, 16);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      metalness: 0.8,
      roughness: 0.35
    });

    const tubeGeo = new THREE.CylinderGeometry(0.5, 0.5, 3.2, 8);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x222a38,
      metalness: 0.9,
      roughness: 0.25
    });

    angles.forEach((angle, idx) => {
      const barge = new THREE.Group();

      const x = arcRadius * Math.cos(angle);
      const z = -arcRadius * Math.sin(angle);
      barge.position.set(center.x + x, center.y, center.z + z);
      barge.rotation.y = angle - Math.PI / 2;

      // Main Floating Pontoon Deck
      const deck = new THREE.Mesh(platformGeo, platformMat);
      deck.position.y = 0.6;
      barge.add(deck);

      // Rows of mortar launch tubes
      const rows = 3;
      const cols = 7;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          tube.position.set(
            (c - (cols - 1) * 0.5) * 3.8,
            2.2,
            (r - (rows - 1) * 0.5) * 4.2
          );
          // Slight random tilt for fan spread
          tube.rotation.z = (c - (cols - 1) * 0.5) * 0.04;
          barge.add(tube);
        }
      }

      // Safety Beacon Lights at Barge Corners
      const beaconOffsets = [
        [-15, 1.6, -7],
        [15, 1.6, -7],
        [-15, 1.6, 7],
        [15, 1.6, 7]
      ];

      const beaconColor = idx === 1 ? 0xffaa22 : 0xff3322;
      const beaconMat = new THREE.MeshBasicMaterial({
        color: beaconColor
      });
      const beaconGeo = new THREE.SphereGeometry(0.6, 8, 8);

      beaconOffsets.forEach((pos) => {
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(pos[0], pos[1], pos[2]);
        barge.add(beacon);
        this.beaconLights.push({
          mesh: beacon,
          baseColor: new THREE.Color(beaconColor),
          phase: Math.random() * Math.PI * 2
        });
      });

      this.group.add(barge);
    });
  }

  setLayer(layerIndex) {
    this.group.traverse((obj) => {
      obj.layers.enable(layerIndex);
    });
  }

  update(deltaTime) {
    this.time += deltaTime;
    // Pulse beacon lights
    for (let i = 0; i < this.beaconLights.length; i++) {
      const b = this.beaconLights[i];
      const blink = Math.sin(this.time * 3.0 + b.phase);
      const intensity = blink > 0.3 ? 1.0 : 0.15;
      b.mesh.material.color.copy(b.baseColor).multiplyScalar(intensity);
    }
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
