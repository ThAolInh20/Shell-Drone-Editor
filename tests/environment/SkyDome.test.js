import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SkyDome } from '../../src/environment/SkyDome.js';

describe('SkyDome', () => {
  let skyDome;

  beforeEach(() => {
    skyDome = new SkyDome({
      radius: 1400,
      topColor: 0x02020a,
      bottomColor: 0x091226,
      starCount: 100,
      cloudCoverage: 0.6,
      cloudSpeed: 1.2
    });
  });

  afterEach(() => {
    if (skyDome) {
      skyDome.dispose();
    }
  });

  it('should initialize dome with uniforms and procedural cloud parameters', () => {
    expect(skyDome.group).toBeDefined();
    expect(skyDome.domeMesh).toBeDefined();
    expect(skyDome.domeUniforms).toBeDefined();
    expect(skyDome.domeUniforms.uCloudCoverage.value).toBeCloseTo(0.6);
    expect(skyDome.domeUniforms.uCloudSpeed.value).toBeCloseTo(1.2);
    expect(skyDome.domeUniforms.uFlashIntensity.value).toBe(0);
  });

  it('should update cloud coverage and cloud speed correctly', () => {
    skyDome.setCloudCoverage(0.85);
    expect(skyDome.cloudCoverage).toBeCloseTo(0.85);
    expect(skyDome.domeUniforms.uCloudCoverage.value).toBeCloseTo(0.85);

    skyDome.setCloudSpeed(2.5);
    expect(skyDome.cloudSpeed).toBeCloseTo(2.5);
    expect(skyDome.domeUniforms.uCloudSpeed.value).toBeCloseTo(2.5);
  });

  it('should update burst flash uniform for dynamic lighting', () => {
    const flashPos = new THREE.Vector3(100, 250, -50);
    const flashColor = new THREE.Color(0xff4422);

    skyDome.setBurstFlash(
      flashPos,
      flashColor,
      0.95
    );

    expect(skyDome.domeUniforms.uFlashPos.value.x).toBe(100);
    expect(skyDome.domeUniforms.uFlashPos.value.y).toBe(250);
    expect(skyDome.domeUniforms.uFlashPos.value.z).toBe(-50);
    expect(skyDome.domeUniforms.uFlashIntensity.value).toBe(0.95);
  });

  it('should advance procedural time on update', () => {
    skyDome.update(0.5);
    expect(skyDome.time).toBeCloseTo(0.5);
    expect(skyDome.domeUniforms.uTime.value).toBeCloseTo(0.5);
    expect(skyDome.starUniforms.uTime.value).toBeCloseTo(0.5);
  });

  it('should initialize moon and update moon phases with lighting', () => {
    expect(skyDome.moonGroup).toBeDefined();
    expect(skyDome.moonMesh).toBeDefined();
    expect(skyDome.moonLight).toBeDefined();
    expect(skyDome.moonUniforms.uMoonPhaseValue.value).toBeCloseTo(1.0);

    // Test full moon day 15
    skyDome.setMoonDay(15);
    expect(skyDome.moonDay).toBe(15);
    expect(skyDome.moonUniforms.uMoonPhaseValue.value).toBeCloseTo(1.0, 1);
    expect(skyDome.moonMesh.visible).toBe(true);

    // Test new moon day 1
    skyDome.setMoonDay(1);
    expect(skyDome.moonDay).toBe(1);
    expect(skyDome.moonUniforms.uMoonPhaseValue.value).toBeCloseTo(0.0, 2);
    expect(skyDome.moonMesh.visible).toBe(false);

    // Test first quarter day 8
    skyDome.setMoonDay(8);
    expect(skyDome.moonDay).toBe(8);
    expect(skyDome.moonUniforms.uMoonPhaseValue.value).toBeGreaterThan(0.4);
    expect(skyDome.moonMesh.visible).toBe(true);
  });

  it('should update moon position and altitude correctly', () => {
    skyDome.setMoonPosition('left');
    skyDome.setMoonAltitude('high');
    expect(skyDome.moonPosition).toBe('left');
    expect(skyDome.moonAltitude).toBe('high');
    expect(skyDome.moonGroup.position.x).toBe(-520);
    expect(skyDome.moonGroup.position.y).toBe(720);

    skyDome.setMoonPosition('center');
    skyDome.setMoonAltitude('low');
    expect(skyDome.moonPosition).toBe('center');
    expect(skyDome.moonAltitude).toBe('low');
    expect(skyDome.moonGroup.position.x).toBe(0);
    expect(skyDome.moonGroup.position.y).toBe(280);
  });
});
