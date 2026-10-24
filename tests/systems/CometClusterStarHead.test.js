import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CometEntity } from '../../src/entities/CometEntity.js';
import { ShellEntity } from '../../src/entities/ShellEntity.js';
import { FIREWORK_CONFIG } from '../../src/config/fireworks.js';

describe('Comet Cluster Firework Star Head Rendering', () => {
  it('should initialize cluster comets with toneMapped: false and hot-white inner core', () => {
    const comet = new CometEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 50, 0),
      color: new THREE.Color(0xff0000),
      preset: {
        shellType: 'comet_cluster',
        type: 'comet_cluster'
      }
    });

    expect(comet.coreMesh).toBeDefined();
    expect(comet.coreMesh.material.toneMapped).toBe(false);
    expect(comet.coreMesh.material.blending).toBe(THREE.AdditiveBlending);
    expect(comet.coreColor.r).toBeGreaterThan(1.0);

    expect(comet.innerMesh).toBeDefined();
    expect(comet.innerMesh.material.toneMapped).toBe(false);
    expect(comet.innerMesh.material.blending).toBe(THREE.AdditiveBlending);
    expect(comet.innerMesh.material.color.r).toBeGreaterThan(5.0);

    comet.dispose();
  });

  it('should initialize notrail cluster comets with toneMapped: false and HDR color', () => {
    const comet = new CometEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 45, 0),
      color: new THREE.Color(0x00ff00),
      preset: {
        shellType: 'comet_cluster_notrail',
        type: 'comet_cluster'
      }
    });

    expect(comet.coreMesh).toBeDefined();
    expect(comet.coreMesh.material.toneMapped).toBe(false);
    expect(comet.coreMesh.material.blending).toBe(THREE.AdditiveBlending);

    const colors = comet.coreMesh.geometry.getAttribute('color');
    expect(colors).toBeDefined();
    expect(colors.getX(0)).toBeCloseTo(0.0);
    expect(colors.getY(0)).toBeGreaterThan(2.0);

    comet.dispose();
  });

  it('should synchronize innerMesh opacity and visibility with coreMesh during updates', () => {
    const comet = new CometEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 20, 0),
      color: new THREE.Color(0x0000ff),
      preset: {
        shellType: 'comet_cluster',
        type: 'comet_cluster'
      }
    });

    comet.update(0.1);
    expect(comet.innerMesh.visible).toBe(comet.coreMesh.visible);

    // Simulate fading
    comet.isFading = true;
    comet.update(0.2);
    expect(comet.innerMesh.material.opacity).toBeCloseTo(comet.coreMesh.material.opacity);

    comet.dispose();
  });

  it('ShellEntity should render with toneMapped: false and hot-white innerCoreMesh', () => {
    const shell = new ShellEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 60, 0),
      targetHeight: 120,
      color: new THREE.Color(0xffa500),
      preset: {
        shellType: 'floral-child',
        isBouquetComet: true
      }
    });

    expect(shell.coreMesh).toBeDefined();
    expect(shell.coreMesh.material.toneMapped).toBe(false);
    expect(shell.innerCoreMesh).toBeDefined();
    expect(shell.innerCoreMesh.material.toneMapped).toBe(false);
    expect(shell.innerCoreMesh.material.color.r).toBeGreaterThan(3.0);
  });

  it('should support stackable active effects on comet clusters', async () => {
    const { getTemplateForPreset } = await import('../../src/factories/FireworkCompositionHelper.js');
    const { ShellPresetFactory } = await import('../../src/factories/ShellPresetFactory.js');

    const templateNoTrail = getTemplateForPreset('comet_cluster_notrail');
    expect(templateNoTrail.effects).toContain('no-trail');

    const factory = new ShellPresetFactory();
    const presetNoTrail = factory.createPresetByKey('comet_cluster_notrail');
    expect(presetNoTrail.effects).toContain('no-trail');

    // Create a comet with stacked effects (crackle + crossette + strobe + flow)
    const comet = new CometEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 30, 0),
      color: new THREE.Color(0xffd700),
      preset: {
        shellType: 'comet_cluster',
        effects: ['crackle', 'crossette', 'glitter-strobe', 'flow']
      }
    });

    expect(comet.hasCrackle).toBe(true);
    expect(comet.hasCrossette).toBe(true);
    expect(comet.hasStrobe).toBe(true);
    expect(comet.isGlitterStrobe).toBe(true);
    expect(comet.hasFlow).toBe(true);
    expect(comet.flowSpeed).toBeGreaterThan(0);

    comet.dispose();
  });

  it('should support comet_tadpole_burst with bulbous head, corkscrew spiral and apex flurry', async () => {
    const { ShellPresetFactory } = await import('../../src/factories/ShellPresetFactory.js');
    const { getTemplateForPreset } = await import('../../src/factories/FireworkCompositionHelper.js');
    const { CometSystem } = await import('../../src/systems/CometSystem.js');

    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('comet_tadpole_burst');
    expect(preset).toBeDefined();
    expect(preset.shellType).toBe('comet_tadpole_burst');
    expect(preset.dynamicsType).toBe('tadpole-spiral');
    expect(preset.isTadpole).toBe(true);

    const template = getTemplateForPreset('comet_tadpole_burst');
    expect(template.dynamics).toBe('tadpole-spiral');

    // Test CometEntity tadpole initialization and head sizing
    const comet = new CometEntity({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 45, 0),
      color: new THREE.Color(0xff4500),
      preset
    });

    expect(comet.isTadpole).toBe(true);
    expect(comet.coreMesh).toBeDefined();
    expect(comet.coreMesh.scale.x).toBeGreaterThanOrEqual(0.85);
    expect(comet.coreMesh.scale.y).toBeGreaterThanOrEqual(1.5);

    // Initial position at launch
    const initialPos = comet.mesh.position.clone();

    // Step 1: Early ascent - gentle sway (not crazy wide spiral)
    comet.update(0.2);
    const earlyRadius = Math.hypot(
      comet.mesh.position.x - comet.ballisticPosition.x,
      comet.mesh.position.z - comet.ballisticPosition.z
    );
    expect(earlyRadius).toBeLessThanOrEqual(0.75);

    // Step 2: Higher ascent remains gentle sway <= 0.85m
    comet.update(0.8);
    const midRadius = Math.hypot(
      comet.mesh.position.x - comet.ballisticPosition.x,
      comet.mesh.position.z - comet.ballisticPosition.z
    );
    expect(midRadius).toBeLessThanOrEqual(0.85);

    // Test CometSystem flurry and arrow sparks triggering
    const mockScene = {
      add: () => {},
      remove: () => {}
    };
    const mockTrailSystem = {
      spawnTrailParticle: () => {},
      spawnEffectSpark: () => {},
      spawnMicroCrackle: () => {}
    };

    const cometSystem = new CometSystem(mockScene, mockTrailSystem);
    let flurryTriggered = false;
    let arrowSparksTriggered = false;
    cometSystem.spawnTadpoleFlurry = () => {
      flurryTriggered = true;
    };
    cometSystem.spawnTadpoleArrowSparks = () => {
      arrowSparksTriggered = true;
    };

    cometSystem.activeComets.push(comet);

    // Simulate early-mid ascent (progress >= 0.28)
    comet.state = CometEntity.STATE.LAUNCHING;
    comet.tadpoleProgress = 0.32;
    comet.tadpoleArrowTimer = 0;
    cometSystem.update(0.1);
    expect(arrowSparksTriggered).toBe(true);

    // Simulate reaching near apex (velocity.y <= 6.0)
    comet.velocity.y = 5.0;
    cometSystem.update(0.1);

    expect(comet.hasFlurried).toBe(true);
    expect(flurryTriggered).toBe(true);

    comet.dispose();
    cometSystem.destroy();
  });

  it('should support chrysanthemum_tadpole_burst shell and orient arrow sparks along star flight direction', async () => {
    const { ShellPresetFactory } = await import('../../src/factories/ShellPresetFactory.js');
    const { getTemplateForPreset } = await import('../../src/factories/FireworkCompositionHelper.js');
    const { FireworkSystem } = await import('../../src/systems/FireworkSystem.js');
    const { CometSystem } = await import('../../src/systems/CometSystem.js');
    const { globalEventBus } = await import('../../src/core/EventBus.js');

    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('chrysanthemum_tadpole_burst');
    expect(preset).toBeDefined();
    expect(preset.shellType).toBe('chrysanthemum_tadpole_burst');
    expect(preset.isTadpoleShell).toBe(true);
    expect(preset.dynamicsType).toBe('tadpole-spiral');

    const template = getTemplateForPreset('chrysanthemum_tadpole_burst');
    expect(template).toBeDefined();
    expect(template.dynamics).toBe('tadpole-spiral');
    expect(template.effects).toContain('tadpole-flurry');

    const mockScene = {
      add: () => {},
      remove: () => {}
    };
    const mockTrailSystem = {
      spawnTrailParticle: () => {},
      spawnEffectSpark: () => {},
      spawnMicroCrackle: () => {}
    };
    const mockSmokeSystem = {
      spawnAscentSmoke: () => {},
      spawnBurstSmoke: () => {}
    };

    const fireworkSystem = new FireworkSystem(
      mockScene,
      mockTrailSystem,
      mockSmokeSystem
    );
    const cometSystem = new CometSystem(
      mockScene,
      mockTrailSystem,
      mockSmokeSystem
    );

    // Test burst spawns multiple child tadpole comets via comet:spawn
    const spawnedComets = [];
    cometSystem.spawnComet = (detail) => {
      spawnedComets.push(detail);
      return null;
    };

    fireworkSystem.triggerTadpoleBurstShell(
      new THREE.Vector3(0, 120, 0),
      new THREE.Color(0xffaa00),
      preset,
      'test-shell-tadpole',
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 20, 0)
    );

    expect(preset.burstSmoke).toBe(false);
    expect(spawnedComets.length).toBeGreaterThanOrEqual(18);
    expect(spawnedComets[0].preset.isTadpole).toBe(true);
    expect(spawnedComets[0].preset.shellType).toBe('comet_tadpole_burst');
    expect(spawnedComets[0].preset.burstSmoke).toBe(false);

    // Test horizontal flying comet star: arrow sparks must align backwards relative to velocity
    const horizontalComet = new CometEntity({
      position: new THREE.Vector3(0, 100, 0),
      velocity: new THREE.Vector3(30, 0, 0), // Flying purely along +X
      color: new THREE.Color(0x00ff88),
      preset: {
        isTadpole: true,
        maxDecayTime: 2.0
      }
    });

    let spawnedArrowSparks = [];
    mockTrailSystem.spawnTrailParticle = (pos, col, lifeMul, zeroVel, customLife, opacity, strobe, vel, gravity, drag) => {
      spawnedArrowSparks.push({
        position: pos,
        velocity: vel,
        gravityScale: gravity
      });
    };

    // Trigger arrow sparks for the horizontal comet
    cometSystem.spawnTadpoleArrowSparks(
      horizontalComet.mesh.position,
      horizontalComet.color,
      horizontalComet.velocity
    );

    expect(spawnedArrowSparks.length).toBeGreaterThanOrEqual(2);
    const expectedStandoff = FIREWORK_CONFIG.COMET_TADPOLE?.standoffDistance ?? 0.25;
    for (const spark of spawnedArrowSparks) {
      expect(spark.gravityScale).toBeCloseTo(0.20, 2);
      expect(spark.velocity.lengthSq()).toBeGreaterThan(1.0);
      expect(spark.position.x).toBeCloseTo(-expectedStandoff, 1);
      expect(spark.position.distanceTo(horizontalComet.mesh.position)).toBeCloseTo(expectedStandoff, 1);
    }

    horizontalComet.dispose();
    cometSystem.destroy();
    fireworkSystem.clear();
  });

  it('should apply tadpole-flurry arrow sparks to standard firework burst particles and inherit strobe', async () => {
    const { FireworkSystem } = await import('../../src/systems/FireworkSystem.js');
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);
    let emittedSparks = [];
    fireworkSystem.trailSystem = {
      spawnTrailParticle: (pos, col, lifeMul, zeroVel, customLife, opacity, strobe, vel, gravity, drag, shimmer, phase, exactColor) => {
        emittedSparks.push({
          position: pos,
          color: col,
          strobe,
          exactColor,
          velocity: vel
        });
      },
      spawnMicroCrackle: () => {}
    };

    // Create a burst shell with tadpole-flurry and strobe in effects
    const burstPosition = new THREE.Vector3(0, 150, 0);
    const burstColor = new THREE.Color(0xff4400);
    fireworkSystem.createBurst(
      burstPosition,
      burstColor,
      'sphere',
      {
        effects: ['tadpole-flurry', 'strobe'],
        strobe: true
      },
      'test-shell-tadpole'
    );

    expect(fireworkSystem.burstParticles.length).toBeGreaterThan(0);
    const tadpoleParticles = fireworkSystem.burstParticles.filter((p) => p.hasTadpoleFlurry);
    expect(tadpoleParticles.length).toBeGreaterThan(0);
    const tadpoleRatio = tadpoleParticles.length / fireworkSystem.burstParticles.length;
    expect(tadpoleRatio).toBeGreaterThanOrEqual(0.18);
    expect(tadpoleRatio).toBeLessThanOrEqual(0.55);

    const sampleParticle = tadpoleParticles[0];
    expect(sampleParticle.hasTadpoleFlurry).toBe(true);

    // Fast forward particle age to 35% of maxLife to enter arrow sparks window
    sampleParticle.age = sampleParticle.maxLife * 0.35;
    sampleParticle.tadpoleArrowTimer = 0.10;

    fireworkSystem.updateBurstParticles(0.016);

    expect(emittedSparks.length).toBeGreaterThan(0);
    // Sparks must inherit strobe = true and exactColor = true
    const spark = emittedSparks[0];
    const expectedStandoff = FIREWORK_CONFIG.COMET_TADPOLE?.standoffDistance ?? 0.25;
    expect(spark.strobe).toBe(true);
    expect(spark.exactColor).toBe(true);
    expect(spark.velocity).toBeDefined();
    expect(spark.position.distanceTo(sampleParticle.position)).toBeCloseTo(expectedStandoff, 1);

    fireworkSystem.clear();
  });
});


