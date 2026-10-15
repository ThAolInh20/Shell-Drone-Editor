import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { SkyLightReactionSystem } from '../../src/systems/SkyLightReactionSystem.js';

describe('SkyLightReactionSystem', () => {
  let mockScene;
  let mockSceneManager;
  let mockSmokeSystem;
  let skyLightSystem;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    mockScene.background = new THREE.Color(0x0a0c14);
    mockScene.fog = new THREE.FogExp2(0x0a0c14, 0.001);

    mockSceneManager = {
      instance: mockScene,
      baseSkyColor: new THREE.Color(0x0a0c14),
      baseAmbientIntensity: 0.15,
      baseHemisphereIntensity: 0.25,
      ambientLight: new THREE.AmbientLight(0xffffff, 0.15),
      hemisphereLight: new THREE.HemisphereLight(0xffffff, 0x000000, 0.25),
      waterSurface: {
        setBurstFlash: vi.fn()
      },
      distantMountains: {
        updateFlashes: vi.fn()
      },
      skyDome: {
        setSkyColors: vi.fn(),
        setBurstFlash: vi.fn()
      }
    };

    mockSmokeSystem = {
      setMultiLights: vi.fn(),
      setBurstFlash: vi.fn()
    };

    skyLightSystem = new SkyLightReactionSystem(
      mockSceneManager,
      mockSmokeSystem
    );
  });

  afterEach(() => {
    if (skyLightSystem) {
      skyLightSystem.destroy();
    }
  });

  it('should initialize with default scene light properties', () => {
    expect(skyLightSystem.reactions.length).toBe(0);
    expect(skyLightSystem.reusableBurstLight).toBeDefined();
    expect(mockScene.children).toContain(skyLightSystem.reusableBurstLight);
  });

  it('should register burst and sustain star radiance beyond initial blast flash', () => {
    skyLightSystem.onBurst({
      position: { x: 0, y: 140, z: 0 },
      colorHex: 0xff3300,
      intensity: 0.8,
      duration: 1.0,
      particleLife: 3.0
    });

    expect(skyLightSystem.reactions.length).toBe(1);
    const reaction = skyLightSystem.reactions[0];
    expect(reaction.starDuration).toBeCloseTo(3.0);
    expect(reaction.skyDuration).toBeCloseTo(1.0);

    // Initial shockwave flash phase (t = 0.05s)
    skyLightSystem.update(0.05);
    expect(mockSmokeSystem.setMultiLights).toHaveBeenCalled();
    const firstCallLights = mockSmokeSystem.setMultiLights.mock.calls[0][0];
    expect(firstCallLights.length).toBe(1);
    expect(firstCallLights[0].intensity).toBeGreaterThan(0.5);

    // After blast flash has settled (t = 1.2s), star radiance must remain active!
    skyLightSystem.update(1.15);
    expect(skyLightSystem.reactions.length).toBe(1);
    const sustainedCallLights = mockSmokeSystem.setMultiLights.mock.calls[
      mockSmokeSystem.setMultiLights.mock.calls.length - 1
    ][0];
    expect(sustainedCallLights.length).toBe(1);
    expect(sustainedCallLights[0].intensity).toBeGreaterThan(0.1);

    // When particles burn out (past 3.0s total age)
    skyLightSystem.update(2.0);
    expect(skyLightSystem.reactions.length).toBe(0);
  });

  it('should pass multiple active shell lights to smoke system during overlapping bursts', () => {
    // Firework 1: Red shell
    skyLightSystem.onBurst({
      position: { x: -60, y: 120, z: 0 },
      colorHex: 0xff0000,
      intensity: 0.9,
      particleLife: 2.8
    });

    // Firework 2: Green shell
    skyLightSystem.onBurst({
      position: { x: 60, y: 140, z: 0 },
      colorHex: 0x00ff00,
      intensity: 0.85,
      particleLife: 2.8
    });

    expect(skyLightSystem.reactions.length).toBe(2);

    skyLightSystem.update(0.3);

    const lastCall = mockSmokeSystem.setMultiLights.mock.calls[
      mockSmokeSystem.setMultiLights.mock.calls.length - 1
    ];
    const activeLights = lastCall[0];

    expect(activeLights.length).toBe(2);
    // Both red and green lights should be present
    const colors = activeLights.map((l) => l.color.getHex());
    expect(colors).toContain(0xff0000);
    expect(colors).toContain(0x00ff00);
  });

  it('should reset lights cleanly when all reactions expire', () => {
    skyLightSystem.onBurst({
      position: { x: 0, y: 100, z: 0 },
      colorHex: 0xffff00,
      intensity: 0.5,
      particleLife: 1.5
    });

    // Advance beyond particle life
    skyLightSystem.update(2.0);
    expect(skyLightSystem.reactions.length).toBe(0);

    const lastCall = mockSmokeSystem.setMultiLights.mock.calls[
      mockSmokeSystem.setMultiLights.mock.calls.length - 1
    ];
    expect(lastCall[0].length).toBe(0);
    expect(skyLightSystem.reusableBurstLight.intensity).toBe(0);
  });

  it('should incorporate drone luminous centroid into smoke illumination', () => {
    const mockDroneSystem = {
      getLuminousCentroid: vi.fn(() => ({
        position: new THREE.Vector3(0, 80, 0),
        color: new THREE.Color(0x00ffff),
        intensity: 0.65,
        radius: 380.0
      }))
    };

    skyLightSystem.droneSystem = mockDroneSystem;

    // When reactions are 0, resetToBase still feeds drone formation light to smoke
    skyLightSystem.update(0.1);
    expect(mockSmokeSystem.setMultiLights).toHaveBeenCalled();
    let lastLights = mockSmokeSystem.setMultiLights.mock.calls[
      mockSmokeSystem.setMultiLights.mock.calls.length - 1
    ][0];
    expect(lastLights.length).toBe(1);
    expect(lastLights[0].color.getHex()).toBe(0x00ffff);
    expect(lastLights[0].intensity).toBeCloseTo(0.65);

    // When fireworks burst simultaneously, both drone light and shell light are present
    skyLightSystem.onBurst({
      position: { x: 0, y: 150, z: 0 },
      colorHex: 0xff0000,
      intensity: 0.9,
      particleLife: 2.0
    });

    skyLightSystem.update(0.1);
    lastLights = mockSmokeSystem.setMultiLights.mock.calls[
      mockSmokeSystem.setMultiLights.mock.calls.length - 1
    ][0];
    expect(lastLights.length).toBe(2);
    const colors = lastLights.map((l) => l.color.getHex());
    expect(colors).toContain(0x00ffff);
    expect(colors).toContain(0xff0000);
  });
});
