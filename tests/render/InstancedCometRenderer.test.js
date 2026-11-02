import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { InstancedCometRenderer } from '../../src/render/InstancedCometRenderer.js';
import { CometEntity } from '../../src/entities/CometEntity.js';

describe('InstancedCometRenderer', () => {
  let mockScene;
  let renderer;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    renderer = new InstancedCometRenderer(mockScene, 500);
  });

  it('should initialize with count 0 and not attach to scene until comets are active', () => {
    expect(renderer.coreMesh).toBeDefined();
    expect(renderer.innerMesh).toBeDefined();
    expect(renderer.coreMesh.count).toBe(0);
    expect(renderer.innerMesh.count).toBe(0);
    expect(renderer.isAttached).toBe(false);
    expect(mockScene.children).toHaveLength(0);
  });

  it('should batch active comets into instanced meshes and attach to scene', () => {
    const comets = [];
    for (let i = 0; i < 10; i++) {
      const comet = new CometEntity({
        position: new THREE.Vector3(i * 2, 50 + i, 0),
        velocity: new THREE.Vector3(0, 30, 0),
        color: new THREE.Color(0xff4500)
      });
      comets.push(comet);
    }

    renderer.update(comets);

    expect(renderer.isAttached).toBe(true);
    expect(renderer.coreMesh.count).toBe(10);
    expect(renderer.innerMesh.count).toBe(10);
    expect(mockScene.children).toContain(renderer.coreMesh);
    expect(mockScene.children).toContain(renderer.innerMesh);

    // Clean up comets
    comets.forEach(c => c.dispose());
  });

  it('should detach instanced meshes from scene when all comets are dead or cleared', () => {
    const comets = [
      new CometEntity({
        position: new THREE.Vector3(0, 50, 0),
        velocity: new THREE.Vector3(0, 30, 0),
        color: new THREE.Color(0x00bfff)
      })
    ];

    renderer.update(comets);
    expect(renderer.isAttached).toBe(true);
    expect(renderer.coreMesh.count).toBe(1);

    // Update with empty array
    renderer.update([]);
    expect(renderer.isAttached).toBe(false);
    expect(renderer.coreMesh.count).toBe(0);
    expect(mockScene.children).toHaveLength(0);

    comets.forEach(c => c.dispose());
  });

  it('should ignore dead or notrail points comets in instanced sphere renderer', () => {
    const ordinaryComet = new CometEntity({
      position: new THREE.Vector3(0, 50, 0),
      velocity: new THREE.Vector3(0, 30, 0),
      color: new THREE.Color(0xffffff)
    });

    const notrailComet = new CometEntity({
      position: new THREE.Vector3(10, 50, 0),
      velocity: new THREE.Vector3(0, 30, 0),
      color: new THREE.Color(0xffffff),
      preset: {
        shellType: 'comet_cluster_notrail'
      }
    });

    const deadComet = new CometEntity({
      position: new THREE.Vector3(20, 50, 0),
      velocity: new THREE.Vector3(0, 30, 0),
      color: new THREE.Color(0xffffff)
    });
    deadComet.markDead();

    renderer.update([ordinaryComet, notrailComet, deadComet]);

    // Only ordinaryComet should be counted
    expect(renderer.coreMesh.count).toBe(1);

    ordinaryComet.dispose();
    notrailComet.dispose();
    deadComet.dispose();
  });

  it('should cleanly dispose resources on destroy', () => {
    const comet = new CometEntity({
      position: new THREE.Vector3(0, 50, 0),
      velocity: new THREE.Vector3(0, 30, 0),
      color: new THREE.Color(0xffd700)
    });

    renderer.update([comet]);
    expect(renderer.isAttached).toBe(true);

    renderer.destroy();
    expect(renderer.isAttached).toBe(false);
    expect(mockScene.children).toHaveLength(0);

    comet.dispose();
  });
});

