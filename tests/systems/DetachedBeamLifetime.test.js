import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CometSystem } from '../../src/systems/CometSystem.js';
import { ShowEventDispatcher } from '../../src/directors/ShowEventDispatcher.js';

const systems = [];
function create() {
  const system = new CometSystem(new THREE.Scene(), {
    spawnTrailParticle() {}, spawnEffectSpark() {}, spawnMicroCrackle() {}
  });
  systems.push(system);
  system.setGraphicsQuality('medium');
  return system;
}
afterEach(() => {
  systems.forEach(system => system.destroy());
  systems.length = 0;
  vi.restoreAllMocks();
});

describe('Detached column shared burnout', () => {
  it('forwards a standalone ghost flare switch from a show event', () => {
    const system = create();
    new ShowEventDispatcher().dispatch({
      type: 'single', preset: 'comet_cluster_detached', 'ghost-flare': true
    }, { sequencer: { cometSystem: system } });
    expect(system.activeComets.length).toBeGreaterThan(0);
    expect(system.activeComets.every(c => c.isGhostFlare)).toBe(true);
  });

  it.each([30, 60, 120])('runs ghost dark, final flare, then soft disappearance at %s FPS', fps => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const system = create();
    system.launchRandom('comet_cluster_detached', {
      ratioX: 0.5, ratioY: 0.5, ratioZ: 0.5, color: '#ff33cc',
      effectOverrides: { effects: ['ghost-flare'] }
    });
    const total = system.activeComets.length + system.pendingDetachedLaunches.length;
    const first = system.activeComets[0];
    const size = first.initialPointSize;
    let darkBrightness;
    let lastOpacity = 1;
    for (let frame = 1; frame <= Math.ceil(fps * 2.75); frame++) {
      const time = frame / fps;
      system.update(1 / fps);
      if (Math.abs(time - 1.3) < 1e-6) {
        expect(system.activeComets).toHaveLength(total);
        expect(system.activeComets.every(c => c.ghostFlare.stage === 'dark')).toBe(true);
        expect(first.coreMesh.material.opacity).toBeCloseTo(0.06);
        expect(first.coreMesh.material.size).toBeLessThan(size);
        darkBrightness = first.coreMesh.material.color.r;
      }
      if (Math.abs(time - 1.8) < 1e-6) {
        expect(system.activeComets).toHaveLength(total);
        expect(system.activeComets.every(c => c.ghostFlare.stage === 'flare')).toBe(true);
        expect(first.coreMesh.material.opacity).toBeGreaterThan(0.5);
        expect(first.coreMesh.material.opacity).toBeLessThan(0.85);
        expect(first.coreMesh.material.color.r).toBeGreaterThan(darkBrightness);
        expect(first.coreMesh.material.size).toBeLessThan(size);
        expect(first.coreMesh.material.size).toBeGreaterThan(size * 0.5);
      }
      if (Math.abs(time - 2.4) < 1e-6) {
        expect(system.activeComets).toHaveLength(total);
        expect(system.activeComets.every(c => c.coreMesh.material.opacity < 0.25)).toBe(true);
      }
      if (system.activeComets.length === 0) expect(lastOpacity).toBeLessThan(0.02);
      else lastOpacity = Math.max(...system.activeComets.map(c => c.coreMesh.material.opacity));
    }
    expect(system.activeComets).toHaveLength(0);
  });

  it.each([{ ghostFlare: true }, { 'ghost-flare': true }])('recognizes ghost flare flag %j', effectOverrides => {
    const system = create();
    system.launchRandom('comet_cluster_detached', { ratioY: 0.5, effectOverrides });
    expect(system.activeComets.every(c => c.isGhostFlare)).toBe(true);
  });

  it('flares and fades both mesh core and inner head when trail rendering is enabled', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const system = create();
    system.launchRandom('comet_cluster_detached', {
      ratioY: 0.5, effectOverrides: { noTrail: false, effects: ['ghost-flare'] }
    });
    const first = system.activeComets[0];
    for (let frame = 1; frame <= 165; frame++) {
      system.update(1 / 60);
      if (frame === 108) {
        expect(first.ghostFlare.stage).toBe('flare');
        expect(first.coreMesh.material.opacity).toBeGreaterThan(0.5);
        expect(first.coreMesh.material.opacity).toBeLessThan(0.85);
        expect(first.innerMesh.material.opacity).toBe(first.coreMesh.material.opacity);
      }
      if (frame === 144) {
        expect(first.coreMesh.material.opacity).toBeLessThan(0.05);
        expect(first.innerMesh.material.opacity).toBe(first.coreMesh.material.opacity);
      }
    }
    expect(system.activeComets).toHaveLength(0);
  });

  it.each([30, 60, 120])('keeps slow and fast stars until a common fade at %s FPS', fps => {
    let seed = 9817;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    const system = create();
    system.launchRandom('comet_cluster_detached', {
      ratioX: 0.5, ratioY: 0.5, ratioZ: 0.5, sectorId: 'center', color: '#ff33cc'
    });
    const total = system.activeComets.length + system.pendingDetachedLaunches.length;
    const deaths = [];
    const fadeSamples = [];
    const initialSize = system.activeComets[0].coreMesh.material.size;
    let lastVisibleOpacity = 1;
    let previous = total;
    for (let frame = 1; frame <= Math.ceil(fps * 2.75); frame++) {
      system.update(1 / fps);
      const time = frame / fps;
      if (time > 0.2 && time < 1.3) {
        expect(system.activeComets).toHaveLength(total);
        expect(system.activeComets.every(comet => !comet.isFading)).toBe(true);
      }
      if ([1.5, 1.8, 2.1, 2.4].some(sample => Math.abs(time - sample) < (0.51 / fps))) {
        if (system.activeComets.length > 0) {
          fadeSamples.push(system.activeComets[0].coreMesh.material.opacity);
        }
      }
      if (Math.abs(time - 2.3) < (0.51 / fps)) {
        expect(system.activeComets).toHaveLength(total);
        expect(system.activeComets.every(comet => comet.isFading)).toBe(true);
        expect(system.activeComets.every(comet => comet.coreMesh.material.opacity > 0 && comet.coreMesh.material.opacity < 1)).toBe(true);
      }
      const count = system.activeComets.length + system.pendingDetachedLaunches.length;
      if (count < previous) {
        deaths.push(time);
      }
      if (system.activeComets.length) {
        lastVisibleOpacity = Math.max(...system.activeComets.map(comet => comet.coreMesh.material.opacity));
      }
      previous = count;
    }
    expect(system.activeComets).toHaveLength(0);
    expect(lastVisibleOpacity).toBeLessThan(0.02);
    expect(fadeSamples).toHaveLength(4);
    expect(fadeSamples[0]).toBeGreaterThan(0.7);
    expect(fadeSamples[1]).toBeLessThan(fadeSamples[0]);
    expect(fadeSamples[2]).toBeLessThan(fadeSamples[1]);
    expect(fadeSamples[3]).toBeLessThan(fadeSamples[2]);
    expect(deaths[0]).toBeGreaterThanOrEqual(2.35);
    expect(deaths.at(-1)).toBeLessThanOrEqual(2.70 + 1 / fps);
    expect(deaths.at(-1) - deaths[0]).toBeGreaterThan(0.15);
    expect(deaths.at(-1) - deaths[0]).toBeLessThanOrEqual(0.30 + 1 / fps);
  });

  it('compensates delayed release and keeps ordinary comets on their previous lifecycle', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const system = create();
    system.launchRandom({ shellType: 'comet_cluster_detached', clusterCount: 8 }, { ratioY: 0.5 });
    for (const queued of system.pendingDetachedLaunches) {
      expect(queued.time + queued.launch.lifetime).toBeGreaterThan(2.35);
      expect(queued.time + queued.launch.lifetime).toBeLessThan(2.70);
    }
    system.launchRandom({ shellType: 'comet_cluster', clusterCount: 1 }, { ratioY: 0.5 });
    const ordinary = system.activeComets.at(-1);
    expect(ordinary.synchronizedLifetime).toBeNull();
    system.update(2.75);
    expect(system.activeComets.every(comet => comet === ordinary)).toBe(true);
    expect(system.pendingDetachedLaunches).toHaveLength(0);
  });

  it('extinguishes stars in strict bottom-to-top order', () => {
    const system = create();
    system.launchRandom('comet_cluster_detached', { ratioY: 0.5 });
    system.update(0.15); // ensure all detached stars are spawned
    const stars = [...system.activeComets];
    const deathBatches = [];
    while (system.activeComets.length > 0) {
      const before = [...system.activeComets];
      system.update(1 / 120);
      const after = new Set(system.activeComets);
      const deadInFrame = [];
      for (const c of before) {
        if (!after.has(c)) {
          deadInFrame.push(c);
        }
      }
      if (deadInFrame.length > 0) {
        deathBatches.push(deadInFrame);
      }
    }
    const totalDead = deathBatches.reduce((sum, batch) => sum + batch.length, 0);
    expect(totalDead).toBe(stars.length);
    // Across consecutive death frames, the maximum vy in an earlier frame should be <= max vy in later frame
    for (let b = 1; b < deathBatches.length; b++) {
      const prevMaxVy = Math.max(...deathBatches[b - 1].map(c => c.initialVy));
      const currMaxVy = Math.max(...deathBatches[b].map(c => c.initialVy));
      expect(currMaxVy).toBeGreaterThanOrEqual(prevMaxVy);
    }
  });
});
