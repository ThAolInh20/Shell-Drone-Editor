import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { PlanarReflector } from '../../src/environment/PlanarReflector.js';
import { WaterSurface } from '../../src/environment/WaterSurface.js';
import { SceneManager } from '../../src/core/SceneManager.js';

describe('PlanarReflector and Water Reflection Optimizations', () => {
  let planarReflector;

  beforeEach(() => {
    planarReflector = new PlanarReflector({
      waterY: 0.0,
      resolutionScale: 0.5
    });
  });

  afterEach(() => {
    if (planarReflector) {
      planarReflector.dispose();
    }
  });

  it('should initialize with correct default resolution scale and render target', () => {
    expect(planarReflector.resolutionScale).toBe(0.5);
    expect(planarReflector.renderTarget).toBeDefined();
    expect(planarReflector.texture).toBeDefined();
  });

  it('should update render target size when setResolutionScale is called', () => {
    planarReflector.setSize(
      1920,
      1080
    );
    expect(planarReflector.renderTarget.width).toBe(960);
    expect(planarReflector.renderTarget.height).toBe(540);

    planarReflector.setResolutionScale(0.25);
    expect(planarReflector.resolutionScale).toBe(0.25);
    expect(planarReflector.renderTarget.width).toBe(480);
    expect(planarReflector.renderTarget.height).toBe(270);
  });

  it('should toggle mirror reflection state on WaterSurface', () => {
    const waterSurface = new WaterSurface({
      planarReflector,
      size: 1000
    });

    expect(waterSurface.isMirrorEnabled()).toBe(true);
    expect(waterSurface.uniforms.uMirrorEnabled.value).toBe(1.0);

    waterSurface.setMirrorReflection(false);
    expect(waterSurface.isMirrorEnabled()).toBe(false);
    expect(waterSurface.uniforms.uMirrorEnabled.value).toBe(0.0);

    waterSurface.setMirrorReflection(true);
    expect(waterSurface.isMirrorEnabled()).toBe(true);
    expect(waterSurface.uniforms.uMirrorEnabled.value).toBe(1.0);

    waterSurface.dispose();
  });

  it('should skip planar reflector update in SceneManager when mirror reflection is disabled', () => {
    const sceneManager = new SceneManager();
    const updateSpy = vi.spyOn(
      sceneManager.planarReflector,
      'update'
    );

    const dummyRenderer = {
      getRenderTarget: vi.fn(),
      setRenderTarget: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
      autoClear: true
    };
    const dummyCamera = new THREE.PerspectiveCamera();
    dummyCamera.position.set(0, 50, 100);
    dummyCamera.lookAt(0, 0, 0);

    // When mirror reflection is enabled (default)
    sceneManager.renderReflection(
      dummyRenderer,
      dummyCamera
    );
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // When mirror reflection is disabled
    sceneManager.setMirrorReflection(false);
    sceneManager.renderReflection(
      dummyRenderer,
      dummyCamera
    );
    // Should NOT have been called again (still 1)
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Re-enable
    sceneManager.setMirrorReflection(true);
    sceneManager.renderReflection(
      dummyRenderer,
      dummyCamera
    );
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });
});
