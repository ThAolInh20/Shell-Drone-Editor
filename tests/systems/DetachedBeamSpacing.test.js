import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CometSystem } from '../../src/systems/CometSystem.js';
import { globalEventBus } from '../../src/core/EventBus.js';

describe('Detached Beam star column', () => {
  const systems = [];
  const preset = (extra = {}) => ({ shellType: 'comet_cluster_detached', clusterCount: 5, ...extra });
  const options = { ratioX: 0.5, ratioY: 0.5, ratioZ: 0.5, color: '#ffd700' };
  const create = () => {
    const system = new CometSystem(new THREE.Scene(), {
      spawnTrailParticle: vi.fn(), spawnEffectSpark: vi.fn(), spawnMicroCrackle: vi.fn()
    });
    systems.push(system);
    return system;
  };
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5));
  afterEach(() => {
    systems.forEach(system => system.destroy());
    systems.length = 0;
    vi.restoreAllMocks();
  });

  const launches = system => [...system.activeComets, ...system.pendingDetachedLaunches.map(item => item.launch)];
  const seeded = seed => () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  it.each([null, 481])('fills a long narrow volume without sorting speeds by launch time (seed %s)', seed => {
    if (seed !== null) Math.random.mockImplementation(seeded(seed));
    const system = create();
    const event = vi.spyOn(system, 'emitFireworkEvent');
    system.launchRandom(preset({ clusterCount: 40 }), options);
    expect(system.activeComets).toHaveLength(10);
    expect(system.pendingDetachedLaunches).toHaveLength(30);
    expect(event).toHaveBeenCalledTimes(1);
    const velocities = launches(system).map(item => item.velocity);
    const axis = system.resolveLaunchVelocity(system.resolveBurstHeight(null, 0.5)).normalize();
    const axial = velocities.map(velocity => velocity.dot(axis));
    const nominal = system.resolveLaunchVelocity(system.resolveBurstHeight(null, 0.5)).length();
    expect(Math.max(...axial) - Math.min(...axial)).toBeGreaterThan(nominal * 0.45);
    expect(axial.some((value, i) => i && value > axial[i - 1])).toBe(true);
    expect(axial.some((value, i) => i && value < axial[i - 1])).toBe(true);
    const radial = velocities.map(v => v.clone().addScaledVector(axis, -v.dot(axis)).length());
    expect(Math.min(...radial)).toBeLessThan(1);
    expect(Math.max(...radial)).toBeGreaterThan(4.5);
    expect(radial.filter(radius => radius > 1 && radius < 4).length).toBeGreaterThan(15);
    const transverse = velocities.map(v => v.clone().addScaledVector(axis, -v.dot(axis)));
    const right = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(axis, right).normalize();
    for (const basis of [right, up]) {
      expect(Math.min(...transverse.map(v => v.dot(basis)))).toBeLessThan(-2);
      expect(Math.max(...transverse.map(v => v.dot(basis)))).toBeGreaterThan(2);
    }
    system.update(0.12);
    expect(system.activeComets).toHaveLength(40);
    expect(system.pendingDetachedLaunches).toHaveLength(0);
    expect(event).toHaveBeenCalledTimes(1);
  });

  it('keeps offsets small and balanced around a tilted beam', () => {
    const system = create();
    system.launchRandom(preset(), { ...options, angleOffset: 0.5 });
    const axis = system.resolveLaunchVelocity(system.resolveBurstHeight(null, 0.5), 0.5).normalize();
    const velocities = [system.activeComets[0].velocity, ...system.pendingDetachedLaunches.map(item => item.launch.velocity)];
    for (const velocity of velocities) {
      const transverse = velocity.clone().addScaledVector(axis, -velocity.dot(axis));
      expect(transverse.length()).toBeLessThanOrEqual(5.000001);
      expect(velocity.angleTo(axis)).toBeLessThan(0.15);
    }
  });

  it.each(['low', 'medium', 'high'])('preserves quality-adjusted count in one short volley at %s quality', quality => {
    const system = create();
    system.setGraphicsQuality(quality);
    system.launchRandom(preset({ clusterCount: 30 }), options);
    const expected = Math.round(30 * system.graphicsQualityMultiplier);
    expect(launches(system)).toHaveLength(expected);
    const times = [0, ...system.pendingDetachedLaunches.map(item => item.time)];
    expect(times.at(-1)).toBeLessThanOrEqual(0.12);
    system.update(0.12);
    expect(system.activeComets).toHaveLength(expected);
  });

  it.each([{ detachedTrail: true }, { cometTrail: 'detached' }, { cometTrail: 'detached-trail' }])('recognizes detached overrides %j', effectOverrides => {
    const system = create();
    system.launchRandom({ shellType: 'comet_cluster', clusterCount: 5 }, { ...options, effectOverrides });
    expect(system.activeComets).toHaveLength(2);
    expect(system.pendingDetachedLaunches).toHaveLength(3);
  });

  it('preserves ordinary, cascade, and single launch timing', () => {
    for (const config of [preset({ shellType: 'comet_cluster' }), preset({ isCascade: true }), preset({ clusterCount: 1 })]) {
      const system = create();
      system.launchRandom(config, options);
      expect(system.pendingDetachedLaunches).toHaveLength(0);
      expect(system.activeComets).toHaveLength(config.clusterCount);
    }
  });

  it('snapshots pending effects, sound, spiral and launch location', () => {
    const system = create();
    const config = preset({ effects: ['crackle'], sound: { volume: 0.3 }, spiral: { radius: 2 } });
    system.launchRandom(config, options);
    config.effects.push('no-trail'); config.sound.volume = 0; config.spiral.radius = 99;
    const queued = system.pendingDetachedLaunches[0].launch;
    expect(queued.preset.effects).toEqual(['crackle']);
    expect(queued.preset.sound.volume).toBe(0.3);
    expect(queued.spiral.radius).toBe(2);
    const position = queued.position.clone();
    system.launchRandom(preset({ clusterCount: 1 }), { ...options, ratioX: 0.1 });
    expect(queued.position.equals(position)).toBe(true);
  });

  it.each(['clear', 'destroy', 'global'])('cancels pending launches through %s', action => {
    const system = create();
    system.launchRandom(preset(), options);
    if (action === 'global') globalEventBus.emit('firework:clear');
    else system[action]();
    system.update(1);
    expect(system.activeComets).toHaveLength(0);
    expect(system.pendingDetachedLaunches).toHaveLength(0);
    expect(system.scene.children).toHaveLength(0);
  });

  it('advances delayed comets only by the remaining part of a long frame', () => {
    const system = create();
    system.launchRandom(preset(), options);
    const times = [0, 0, ...system.pendingDetachedLaunches.map(item => item.time)];
    system.update(0.6);
    system.activeComets.forEach((comet, index) => expect(comet.age).toBeCloseTo(0.6 - times[index]));
  });

  it('keeps launch counts and ages stable at 30, 60, and 120 FPS', () => {
    const results = [30, 60, 120].map(fps => {
      Math.random.mockImplementation(seeded(77));
      const system = create();
      system.launchRandom(preset(), options);
      for (let frame = 0; frame < fps; frame++) system.update(1 / fps);
      expect(system.activeComets).toHaveLength(5);
      return system.activeComets.map(comet => comet.age);
    });
    results.slice(1).forEach(ages => ages.forEach((age, index) => expect(age).toBeCloseTo(results[0][index], 10)));
  });

  it('resolves a detached preset key', () => {
    const system = create();
    system.launchRandom('comet_cluster_detached', options);
    expect(launches(system).length).toBeGreaterThanOrEqual(36);
    expect(launches(system).length).toBeLessThanOrEqual(44);
    expect(system.activeComets[0].coreMesh.material.size).toBeCloseTo(34 * 0.42);
    expect(system.pendingDetachedLaunches.length).toBeGreaterThan(0);
  });

  it('preserves zero-delta updates for existing ordinary comets', () => {
    const system = create();
    system.launchRandom({ shellType: 'comet_cluster', clusterCount: 1 }, options);
    const update = vi.spyOn(system.activeComets[0], 'update');
    system.update(0);
    expect(update).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('shrinks detached mesh heads and their inner core without changing ordinary geometry or radiance', () => {
    const system = create();
    const makeHead = extra => {
      system.launchRandom(preset({ clusterCount: 1, ...extra }), options);
      return system.activeComets.at(-1);
    };
    const detached = makeHead({});
    const fullSize = makeHead({ detachedHeadScale: 1 });
    expect(detached.coreMesh.geometry.parameters.radius / fullSize.coreMesh.geometry.parameters.radius).toBeCloseTo(0.42);
    expect(detached.innerMesh.geometry.parameters.radius / fullSize.innerMesh.geometry.parameters.radius).toBeCloseTo(0.42);
    expect(detached.coreMesh.material.color.equals(fullSize.coreMesh.material.color)).toBe(true);
    for (const detachedHeadScale of [0, -1, NaN, Infinity]) {
      expect(makeHead({ detachedHeadScale }).coreMesh.geometry.parameters.radius).toBeCloseTo(detached.coreMesh.geometry.parameters.radius);
    }
    const ordinary = makeHead({ shellType: 'comet_cluster', detachedHeadScale: 0.1 });
    expect(ordinary.coreMesh.geometry.parameters.radius).toBeCloseTo(1.2);
    const single = makeHead({ shellType: 'comet_single', detachedHeadScale: 0.1 });
    expect(single.coreMesh.geometry.parameters.radius).toBeCloseTo(1.2 * 1.6);
    const point = makeHead({ noTrail: true, detachedHeadScale: 0.25 });
    expect(point.coreMesh.material.size).toBeCloseTo(34 * 0.25);
    const ordinaryPoint = makeHead({ shellType: 'comet_cluster_notrail', detachedHeadScale: 0.1 });
    expect(ordinaryPoint.coreMesh.material.size).toBe(34);
  });

  it('supports overlapping beams while ordinary comets still receive their full frame delta', () => {
    const system = create();
    system.launchRandom(preset(), options);
    system.update(0.1);
    system.launchRandom(preset(), { ...options, ratioX: 0.1 });
    system.launchRandom({ shellType: 'comet_cluster', clusterCount: 1 }, options);
    const ordinary = system.activeComets.at(-1);
    const update = vi.spyOn(ordinary, 'update');
    system.update(0.5);
    expect(update).toHaveBeenCalledExactlyOnceWith(0.5);
    expect(system.activeComets).toHaveLength(11);
    expect(system.pendingDetachedLaunches).toHaveLength(0);
    system.update(0.1);
    expect(system.activeComets).toHaveLength(11);
    expect(system.pendingDetachedLaunches).toHaveLength(0);
  });
});
