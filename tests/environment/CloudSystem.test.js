import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { CloudSystem } from '../../src/environment/CloudSystem.js';

describe('CloudSystem', () => {
  let scene;
  let cloudSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    cloudSystem = new CloudSystem({
      scene,
      count: 20,
      windSpeed: 2.0
    });
  });

  afterEach(() => {
    if (cloudSystem) {
      cloudSystem.dispose();
    }
  });

  it('should initialize points, geometry attributes, and uniforms', () => {
    expect(cloudSystem.points).toBeDefined();
    expect(cloudSystem.geometry).toBeDefined();
    expect(cloudSystem.material).toBeDefined();
    expect(cloudSystem.positionsArray.length).toBe(20 * 3);
    expect(cloudSystem.sizesArray.length).toBe(20);
    expect(cloudSystem.opacitiesArray.length).toBe(20);
    expect(cloudSystem.seedsArray.length).toBe(20);

    const posAttr = cloudSystem.geometry.getAttribute('position');
    expect(posAttr).toBeDefined();
    expect(posAttr.count).toBe(20);

    expect(cloudSystem.cloudUniforms).toBeDefined();
    expect(cloudSystem.cloudUniforms.uActiveLightCount.value).toBe(0);
    expect(cloudSystem.cloudUniforms.uLightPositions.value.length).toBe(4);
  });

  it('should advance time and drift positions with wind on update', () => {
    const initialX = cloudSystem.positionsArray[0];
    const initialZ = cloudSystem.positionsArray[2];

    cloudSystem.update(0.5);

    expect(cloudSystem.cloudUniforms.uTime.value).toBeCloseTo(0.5);
    expect(cloudSystem.positionsArray[0]).not.toBe(initialX);
    expect(cloudSystem.positionsArray[2]).not.toBe(initialZ);
  });

  it('should update multi-light uniforms when setMultiLights is called', () => {
    const lights = [
      {
        position: new THREE.Vector3(50, 420, -30),
        color: new THREE.Color(0xff4400),
        intensity: 0.9,
        radius: 350.0
      },
      {
        position: new THREE.Vector3(-100, 390, 80),
        color: new THREE.Color(0x00ff88),
        intensity: 0.75,
        radius: 400.0
      }
    ];

    cloudSystem.setMultiLights(lights);

    expect(cloudSystem.cloudUniforms.uActiveLightCount.value).toBe(2);
    expect(cloudSystem.cloudUniforms.uLightPositions.value[0].x).toBe(50);
    expect(cloudSystem.cloudUniforms.uLightPositions.value[0].y).toBe(420);
    expect(cloudSystem.cloudUniforms.uLightColors.value[0].getHex()).toBe(0xff4400);
    expect(cloudSystem.cloudUniforms.uLightIntensities.value[0]).toBeCloseTo(0.9);
    expect(cloudSystem.cloudUniforms.uLightRadii.value[0]).toBeCloseTo(350.0);

    expect(cloudSystem.cloudUniforms.uLightPositions.value[1].x).toBe(-100);
    expect(cloudSystem.cloudUniforms.uLightColors.value[1].getHex()).toBe(0x00ff88);
    expect(cloudSystem.cloudUniforms.uLightIntensities.value[1]).toBeCloseTo(0.75);

    // Light 2 and 3 should be zeroed
    expect(cloudSystem.cloudUniforms.uLightIntensities.value[2]).toBe(0.0);
    expect(cloudSystem.cloudUniforms.uLightIntensities.value[3]).toBe(0.0);
  });

  it('should clean up resources on dispose', () => {
    cloudSystem.dispose();
    expect(scene.children.includes(cloudSystem.points)).toBe(false);
  });
});
