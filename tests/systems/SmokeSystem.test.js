import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SmokeSystem } from '../../src/systems/SmokeSystem.js';
import { globalEventBus } from '../../src/core/EventBus.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('SmokeSystem', () => {
  let mockScene;
  let mockSceneManager;
  let smokeSystem;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockSceneManager = {
      instance: mockScene
    };
    smokeSystem = new SmokeSystem(mockSceneManager);
  });

  afterEach(() => {
    if (smokeSystem) {
      smokeSystem.destroy();
    }
  });

  it('should initialize geometry with custom buffer attributes including aSeed', () => {
    expect(smokeSystem.smokeGeometry).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('position')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('color')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('aSize')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('aOpacity')).toBeDefined();
    expect(smokeSystem.smokeGeometry.getAttribute('aSeed')).toBeDefined();
    expect(mockScene.children).toContain(smokeSystem.smokePoints);
  });

  it('should spawn sub-cluster volumetric smoke clouds onBurst when burst-smoke is present', () => {
    smokeSystem.setQuality('medium');
    const initialCount = smokeSystem.puffs.length;

    smokeSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      colorHex: 0xff4500,
      intensity: 0.8,
      effects: ['burst-smoke']
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(initialCount);
    const firstPuff = smokeSystem.puffs[0];
    expect(firstPuff.drag).toBeGreaterThan(2.0);
    expect(firstPuff.seed).toBeDefined();
    expect(firstPuff.buoyancy).toBeGreaterThan(0);
    expect(firstPuff.life).toBeGreaterThanOrEqual(FIREWORK_CONFIG.SMOKE.burstLifeMin);
    expect(firstPuff.life).toBeLessThanOrEqual(FIREWORK_CONFIG.SMOKE.burstLifeMax);
  });

  it('should NOT spawn burst smoke onBurst if burst-smoke effect is not present', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      colorHex: 0xff4500,
      intensity: 0.8
    });

    expect(smokeSystem.puffs.length).toBe(0);
  });

  it('should spawn trail smoke onLaunch', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.onLaunch({
      position: { x: 10, y: 0, z: 20 }
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(0);
    const trailPuff = smokeSystem.puffs[0];
    expect(trailPuff.position.x).toBeGreaterThanOrEqual(8);
    expect(trailPuff.position.x).toBeLessThanOrEqual(12);
    expect(trailPuff.drag).toBeDefined();
    expect(trailPuff.life).toBeGreaterThanOrEqual(FIREWORK_CONFIG.SMOKE.trailLifeMin);
    expect(trailPuff.life).toBeLessThanOrEqual(FIREWORK_CONFIG.SMOKE.trailLifeMax);
  });

  it('should apply exponential drag and wind lerp on update', () => {
    smokeSystem.setQuality('high');
    smokeSystem.clear();

    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(20, 0, 0),
      {
        life: 3.0,
        drag: 3.0,
        buoyancy: 0.5,
        scale: 10
      }
    );

    const initialVelX = smokeSystem.puffs[0].velocity.x;
    smokeSystem.update(0.1);

    // Exponential drag should reduce velocity significantly
    expect(smokeSystem.puffs[0].velocity.x).toBeLessThan(initialVelX);
    expect(smokeSystem.activePuffCount).toBe(1);
    expect(smokeSystem.smokeGeometry.drawRange.count).toBe(1);
  });

  it('should handle quality switching and turning off', () => {
    smokeSystem.setQuality('high');
    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 1),
      { life: 2.0 }
    );
    expect(smokeSystem.smokePoints.visible).toBe(true);

    smokeSystem.setQuality('off');
    expect(smokeSystem.smokePoints.visible).toBe(false);
    expect(smokeSystem.puffs.length).toBe(0);
    expect(smokeSystem.smokeGeometry.drawRange.count).toBe(0);
  });

  it('should clear all puffs cleanly', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.onBurst({
      position: { x: 0, y: 100, z: 0 },
      hasBurstSmoke: true
    });
    expect(smokeSystem.puffs.length).toBeGreaterThan(0);

    smokeSystem.clear();
    expect(smokeSystem.puffs.length).toBe(0);
    expect(smokeSystem.activePuffCount).toBe(0);
    expect(smokeSystem.smokeGeometry.drawRange.count).toBe(0);
  });

  it('should support unlimited smoke mode with expanded capacity', () => {
    smokeSystem.setQuality('low');
    expect(smokeSystem.maxPuffs.launch).toBe(150);
    expect(smokeSystem.maxPuffs.aerial).toBe(450);
    expect(smokeSystem.maxPuffs.total).toBe(600);

    smokeSystem.setUnlimited(true);
    expect(smokeSystem.unlimited).toBe(true);
    expect(smokeSystem.maxPuffs.launch).toBe(10000);
    expect(smokeSystem.maxPuffs.aerial).toBe(15000);
    expect(smokeSystem.maxPuffs.total).toBe(25000);

    smokeSystem.setUnlimited(false);
    expect(smokeSystem.unlimited).toBe(false);
    expect(smokeSystem.maxPuffs.total).toBe(600);
  });

  it('should apply lifespan multiplier to spawned puffs', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();
    smokeSystem.setLifespanMultiplier(3.0);

    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      { life: 4.0 }
    );

    expect(smokeSystem.puffs.length).toBe(1);
    expect(smokeSystem.puffs[0].life).toBeCloseTo(12.0);
  });

  it('should properly update burst flash uniforms via setBurstFlash', () => {
    const flashPos = new THREE.Vector3(50, 180, -30);
    const flashColor = new THREE.Color(0xffaa22);
    const intensity = 0.85;

    smokeSystem.setBurstFlash(flashPos, flashColor, intensity);

    expect(smokeSystem.smokeUniforms.uFlashPos.value.x).toBe(50);
    expect(smokeSystem.smokeUniforms.uFlashPos.value.y).toBe(180);
    expect(smokeSystem.smokeUniforms.uFlashPos.value.z).toBe(-30);
    expect(smokeSystem.smokeUniforms.uFlashColor.value.getHex()).toBe(0xffaa22);
    expect(smokeSystem.smokeUniforms.uFlashIntensity.value).toBe(0.85);
  });

  it('should reset burst flash intensity when intensity is zero', () => {
    smokeSystem.setBurstFlash(null, null, 0);
    expect(smokeSystem.smokeUniforms.uFlashIntensity.value).toBe(0);
  });

  it('should default smoke to white color when hasCustomColor is not set', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      colorHex: 0xff0000,
      effects: ['burst-smoke']
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(0);
    expect(smokeSystem.puffs[0].color.getHex()).toBe(0xf2f5f9);
  });

  it('should use custom firework color for smoke when hasCustomColor is true', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      colorHex: 0xff0088,
      effects: ['burst-smoke'],
      hasCustomColor: true
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(0);
    expect(smokeSystem.puffs[0].color.getHex()).toBe(0xff0088);
  });

  it('should generate radial streaks along particle burst paths extending approximately 1/3 of firework spread', () => {
    smokeSystem.setQuality('high');
    smokeSystem.clear();

    const burstPos = new THREE.Vector3(0, 150, 0);
    const burstRadius = 60.0;

    smokeSystem.onBurst({
      position: { x: burstPos.x, y: burstPos.y, z: burstPos.z },
      burstRadius: burstRadius,
      intensity: 0.8,
      effects: ['burst-smoke']
    });

    expect(smokeSystem.puffs.length).toBeGreaterThan(15);

    // Calculate maximum puff distance from burst center
    let maxDist = 0;
    for (const puff of smokeSystem.puffs) {
      const dist = puff.position.distanceTo(burstPos);
      if (dist > maxDist) {
        maxDist = dist;
      }
    }

    // Maximum distance reached by radial streaks should roughly be within ~1/3 to 1/2 of firework spread
    expect(maxDist).toBeGreaterThan(burstRadius * 0.20);
    expect(maxDist).toBeLessThanOrEqual(burstRadius * 0.65);
  });

  it('should accept flight smoke parameters via addSmokePoint for collinear streaks', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    const origin = new THREE.Vector3(0, 10, 0);
    const vel = new THREE.Vector3(0, -2, 0);
    const options = {
      life: 4.5,
      scale: 4.8,
      growth: 3.2,
      drag: 1.8,
      buoyancy: 0.38,
      opacity: 0.28,
      color: new THREE.Color(0xf2f5f8)
    };

    smokeSystem.addSmokePoint(
      origin,
      vel,
      options
    );

    expect(smokeSystem.puffs.length).toBe(1);
    const puff = smokeSystem.puffs[0];
    expect(puff.position.x).toBe(0);
    expect(puff.position.y).toBe(10);
    expect(puff.drag).toBe(1.8);
    expect(puff.buoyancy).toBe(0.38);
    expect(puff.baseScale).toBe(4.8);
    expect(puff.growth).toBe(3.2);
    expect(puff.baseOpacity).toBe(0.28);
  });

  it('should promote dying smoke puff with isHazePromoter to ambient haze puff', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    const origin = new THREE.Vector3(0, 50, 0);
    const vel = new THREE.Vector3(0, 0, 0);

    smokeSystem.spawnPuff(
      origin,
      vel,
      {
        life: 1.0,
        scale: 5.0,
        opacity: 0.3,
        isHazePromoter: true
      }
    );

    expect(smokeSystem.puffs.length).toBe(1);
    expect(smokeSystem.puffs[0].isHaze).toBe(false);
    expect(smokeSystem.puffs[0].isHazePromoter).toBe(true);

    // Advance time past the handover ratio (0.35s > 0.30 * 1.0s)
    smokeSystem.update(0.35);

    expect(smokeSystem.puffs.length).toBe(1);
    const morphedPuff = smokeSystem.puffs[0];
    expect(morphedPuff.isHaze).toBe(true);
    expect(morphedPuff.isHazePromoter).toBe(false);
    expect(morphedPuff.age).toBe(0);
    expect(morphedPuff.life).toBeCloseTo(0.70, 2);
    expect(morphedPuff.baseScale).toBeGreaterThan(5.0);
    expect(morphedPuff.baseOpacity).toBeLessThan(0.30);

    // Advance past haze life (0.70s) to ensure it terminates cleanly without infinite loop
    smokeSystem.update(0.75);
    expect(smokeSystem.puffs.length).toBe(0);
  });

  it('should cleanly remove dying puff if isHazePromoter is false', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(0, 0, 0),
      {
        life: 1.0,
        isHazePromoter: false
      }
    );

    expect(smokeSystem.puffs.length).toBe(1);
    // Advance past non-promoter early cutoff (0.40s > 0.30 * 1.25 = 0.375s)
    smokeSystem.update(0.40);
    expect(smokeSystem.puffs.length).toBe(0);
  });

  it('should support progressive coalescence where nucleus expands and satellite dissolves', () => {
    smokeSystem.setQuality('medium');
    smokeSystem.clear();

    smokeSystem.spawnPuff(
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(0, 0, 0),
      {
        life: 1.0,
        scale: 10.0,
        isNucleus: true,
        nucleusBoost: 3.5
      }
    );
    smokeSystem.spawnPuff(
      new THREE.Vector3(5, 50, 0),
      new THREE.Vector3(0, 0, 0),
      {
        life: 1.0,
        scale: 10.0,
        isNucleus: false
      }
    );

    expect(smokeSystem.puffs.length).toBe(2);

    // Advance time into coalescence merging phase (t = 0.20)
    smokeSystem.update(0.20);
    expect(smokeSystem.puffs.length).toBe(2);
    expect(smokeSystem.sizesArray[0]).toBeGreaterThan(15.0);

    // Advance time past early cutoff for satellite (cumulative t = 0.40)
    smokeSystem.update(0.20);
    expect(smokeSystem.puffs.length).toBe(1);
    expect(smokeSystem.puffs[0].isNucleus).toBe(true);
  });

  it('should update wind direction vectors correctly', () => {
    smokeSystem.setWindSpeed(1.0);

    // Test 0 degrees (blowing along +X axis)
    smokeSystem.setWindDirection(0);
    expect(smokeSystem.windDirection).toBe(0);
    expect(smokeSystem.baseWind.x).toBeCloseTo(6.04, 1);
    expect(smokeSystem.baseWind.z).toBeCloseTo(0.0, 1);
    expect(smokeSystem.baseWind.y).toBeCloseTo(0.8, 1);

    // Test 90 degrees (blowing along +Z axis)
    smokeSystem.setWindDirection(90);
    expect(smokeSystem.windDirection).toBe(90);
    expect(smokeSystem.baseWind.x).toBeCloseTo(0.0, 1);
    expect(smokeSystem.baseWind.z).toBeCloseTo(6.04, 1);

    // Test 180 degrees (blowing along -X axis)
    smokeSystem.setWindDirection(180);
    expect(smokeSystem.baseWind.x).toBeCloseTo(-6.04, 1);
    expect(smokeSystem.baseWind.z).toBeCloseTo(0.0, 1);
  });

  it('should maintain night ambient lighting uniforms and responsive flash updates', () => {
    expect(smokeSystem.smokeUniforms.uFlashIntensity.value).toBe(0.0);
    expect(smokeSystem.smokeUniforms.uFlashRadius.value).toBe(650.0);

    const burstPos = new THREE.Vector3(120, 250, -40);
    const vibrantMagenta = new THREE.Color(0xff00aa);
    smokeSystem.setBurstFlash(burstPos, vibrantMagenta, 0.95);

    expect(smokeSystem.smokeUniforms.uFlashIntensity.value).toBe(0.95);
    expect(smokeSystem.smokeUniforms.uFlashColor.value.getHex()).toBe(0xff00aa);
    expect(smokeSystem.smokeUniforms.uFlashPos.value.x).toBe(120);
    expect(smokeSystem.smokeUniforms.uFlashPos.value.y).toBe(250);
    expect(smokeSystem.smokeUniforms.uFlashPos.value.z).toBe(-40);
  });

  it('should support multiple concurrent dynamic light sources via setMultiLights', () => {
    smokeSystem.setQuality('high');
    const lights = [
      {
        position: new THREE.Vector3(10, 100, 20),
        color: new THREE.Color(0xff0000),
        intensity: 0.9,
        radius: 350
      },
      {
        position: new THREE.Vector3(-40, 120, 50),
        color: new THREE.Color(0x00ff00),
        intensity: 0.75,
        radius: 320
      },
      {
        position: new THREE.Vector3(80, 150, -60),
        color: new THREE.Color(0x0000ff),
        intensity: 0.6,
        radius: 300
      }
    ];

    smokeSystem.setMultiLights(lights);

    expect(smokeSystem.smokeUniforms.uActiveLightCount.value).toBe(3);
    expect(smokeSystem.smokeUniforms.uLightPositions.value[0].x).toBe(10);
    expect(smokeSystem.smokeUniforms.uLightColors.value[0].getHex()).toBe(0xff0000);
    expect(smokeSystem.smokeUniforms.uLightIntensities.value[0]).toBeCloseTo(0.9);
    expect(smokeSystem.smokeUniforms.uLightRadii.value[0]).toBeCloseTo(350);

    expect(smokeSystem.smokeUniforms.uLightPositions.value[1].x).toBe(-40);
    expect(smokeSystem.smokeUniforms.uLightColors.value[1].getHex()).toBe(0x00ff00);

    expect(smokeSystem.smokeUniforms.uLightPositions.value[2].x).toBe(80);
    expect(smokeSystem.smokeUniforms.uLightColors.value[2].getHex()).toBe(0x0000ff);
  });

  it('should limit active lights according to quality preset', () => {
    const lights = [
      { position: new THREE.Vector3(0, 100, 0), color: new THREE.Color(0xffffff), intensity: 1, radius: 400 },
      { position: new THREE.Vector3(10, 100, 0), color: new THREE.Color(0xffffff), intensity: 1, radius: 400 },
      { position: new THREE.Vector3(20, 100, 0), color: new THREE.Color(0xffffff), intensity: 1, radius: 400 },
      { position: new THREE.Vector3(30, 100, 0), color: new THREE.Color(0xffffff), intensity: 1, radius: 400 }
    ];

    // Low quality: capped at 1 light
    smokeSystem.setQuality('low');
    smokeSystem.setMultiLights(lights);
    expect(smokeSystem.smokeUniforms.uActiveLightCount.value).toBe(1);

    // Medium quality: capped at 2 lights
    smokeSystem.setQuality('medium');
    smokeSystem.setMultiLights(lights);
    expect(smokeSystem.smokeUniforms.uActiveLightCount.value).toBe(2);

    // High quality: up to 4 lights
    smokeSystem.setQuality('high');
    smokeSystem.setMultiLights(lights);
    expect(smokeSystem.smokeUniforms.uActiveLightCount.value).toBe(4);
  });

  it('should push existing smoke puffs radially outward when a nearby burst shockwave occurs', () => {
    smokeSystem.setQuality('high');
    smokeSystem.clear();

    // Spawn an existing resting puff at (10, 150, 0)
    smokeSystem.spawnPuff(
      new THREE.Vector3(10, 150, 0),
      new THREE.Vector3(0, 0, 0),
      { life: 5.0 }
    );

    expect(smokeSystem.puffs.length).toBe(1);
    expect(smokeSystem.puffs[0].velocity.x).toBe(0);

    // Firework bursts at origin (0, 150, 0), which is 10 units away in +X direction
    smokeSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      burstRadius: 50.0,
      intensity: 0.9,
      effects: ['burst-smoke']
    });

    // The existing puff must receive an outward +X radial velocity impulse
    const existingPuff = smokeSystem.puffs[0];
    expect(existingPuff.velocity.x).toBeGreaterThan(5.0);
  });
});
