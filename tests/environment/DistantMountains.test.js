import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { DistantMountains } from '../../src/environment/DistantMountains.js';
import { LAYER_REFLECTION } from '../../src/config/layers.js';

describe('DistantMountains', () => {
  let distantMountains;

  beforeEach(() => {
    distantMountains = new DistantMountains({
      innerRadius: 600,
      outerRadius: 900,
      angularSegments: 64,
      radialSegments: 8,
      maxHeight: 120,
      seed: 23
    });
  });

  afterEach(() => {
    if (distantMountains) {
      distantMountains.dispose();
    }
  });

  it('should initialize procedural terrain mesh with position, color, and normal attributes', () => {
    expect(distantMountains.group).toBeDefined();
    expect(distantMountains.group.name).toBe('DistantMountainsGroup');

    const mesh = distantMountains.mountainsMesh;
    expect(mesh).toBeDefined();
    expect(mesh.name).toBe('DistantHorizonMountains');

    const geo = mesh.geometry;
    expect(geo.getAttribute('position')).toBeDefined();
    expect(geo.getAttribute('color')).toBeDefined();
    expect(geo.getAttribute('normal')).toBeDefined();
    expect(geo.getIndex()).toBeDefined();

    const expectedVertices = (64 + 1) * (8 + 1);
    expect(geo.getAttribute('position').count).toBe(expectedVertices);
    expect(geo.getAttribute('color').count).toBe(expectedVertices);
  });

  it('should generate mid-distance limestone islands that share the mountain material', () => {
    expect(distantMountains.islandsGroup).toBeDefined();
    expect(distantMountains.islandsGroup.children.length).toBe(8);

    distantMountains.islandsGroup.children.forEach((island, idx) => {
      expect(island.name).toBe(`LimestoneIsland_${idx}`);
      expect(island.material).toBe(distantMountains.material);
      expect(island.geometry.getAttribute('position')).toBeDefined();
      expect(island.geometry.getAttribute('color')).toBeDefined();
      expect(island.geometry.getAttribute('normal')).toBeDefined();
    });
  });

  it('should initialize night terrain shader uniforms', () => {
    const uniforms = distantMountains.mountainUniforms;
    expect(uniforms).toBeDefined();
    expect(uniforms.uMoonDirection.value).toBeInstanceOf(THREE.Vector3);
    expect(uniforms.uMoonColor.value).toBeInstanceOf(THREE.Color);
    expect(uniforms.uMoonIntensity.value).toBeCloseTo(0.32);
    expect(uniforms.uFogColor.value).toBeInstanceOf(THREE.Color);
    expect(uniforms.uFogDensity.value).toBeCloseTo(0.0016);
    expect(uniforms.uFlashIntensity0.value).toBe(0.0);
    expect(uniforms.uFlashIntensity1.value).toBe(0.0);
  });

  it('should update directional moon lighting and intensity', () => {
    const moonPos = new THREE.Vector3(300, 500, -200);
    distantMountains.setMoonDirection(
      moonPos,
      0.65
    );

    const expectedNormalized = moonPos.clone().normalize();
    const uniforms = distantMountains.mountainUniforms;

    expect(uniforms.uMoonDirection.value.x).toBeCloseTo(expectedNormalized.x);
    expect(uniforms.uMoonDirection.value.y).toBeCloseTo(expectedNormalized.y);
    expect(uniforms.uMoonDirection.value.z).toBeCloseTo(expectedNormalized.z);
    expect(uniforms.uMoonIntensity.value).toBeCloseTo(0.65);
  });

  it('should update and reset dual firework flash lights across slots 0 and 1', () => {
    const flashPos0 = new THREE.Vector3(0, 180, 50);
    const flashColor0 = new THREE.Color(0xff8833);
    const flashPos1 = new THREE.Vector3(-120, 220, -80);
    const flashColor1 = new THREE.Color(0x3388ff);

    distantMountains.setBurstFlash(
      flashColor0,
      0.85,
      flashPos0,
      0
    );

    distantMountains.setBurstFlash(
      flashColor1,
      0.60,
      flashPos1,
      1
    );

    const uniforms = distantMountains.mountainUniforms;
    expect(uniforms.uFlashIntensity0.value).toBeCloseTo(0.85);
    expect(uniforms.uFlashColor0.value.r).toBeCloseTo(flashColor0.r);
    expect(uniforms.uFlashPosition0.value.x).toBe(0);

    expect(uniforms.uFlashIntensity1.value).toBeCloseTo(0.60);
    expect(uniforms.uFlashColor1.value.b).toBeCloseTo(flashColor1.b);
    expect(uniforms.uFlashPosition1.value.x).toBe(-120);

    // Reset slot 0 and auto-clear
    distantMountains.setBurstFlash(
      null,
      0
    );
    expect(uniforms.uFlashIntensity0.value).toBe(0.0);
    expect(uniforms.uFlashIntensity1.value).toBe(0.0);
  });

  it('should support batch updateFlashes with sorted active fireworks', () => {
    const fireworks = [
      {
        intensity: 0.95,
        position: new THREE.Vector3(50, 150, 0),
        color: new THREE.Color(0xff4422)
      },
      {
        intensity: 0.70,
        position: new THREE.Vector3(-80, 200, 30),
        color: new THREE.Color(0x22ee44)
      }
    ];

    distantMountains.updateFlashes(fireworks);

    const uniforms = distantMountains.mountainUniforms;
    expect(uniforms.uFlashIntensity0.value).toBeCloseTo(0.95);
    expect(uniforms.uFlashPosition0.value.x).toBe(50);
    expect(uniforms.uFlashIntensity1.value).toBeCloseTo(0.70);
    expect(uniforms.uFlashPosition1.value.x).toBe(-80);

    // Update with empty array clears both
    distantMountains.updateFlashes([]);
    expect(uniforms.uFlashIntensity0.value).toBe(0.0);
    expect(uniforms.uFlashIntensity1.value).toBe(0.0);
  });

  it('should enable reflection layer across all meshes', () => {
    distantMountains.setLayer(LAYER_REFLECTION);

    distantMountains.group.traverse((obj) => {
      expect(obj.layers.isEnabled(LAYER_REFLECTION)).toBe(true);
    });
  });

  it('should properly dispose geometries and materials without memory leaks', () => {
    let geoDisposed = false;
    distantMountains.mountainsMesh.geometry.addEventListener('dispose', () => {
      geoDisposed = true;
    });

    distantMountains.dispose();
    expect(geoDisposed).toBe(true);
  });
});
