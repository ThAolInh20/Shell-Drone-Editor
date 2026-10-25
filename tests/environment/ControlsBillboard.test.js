import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ControlsBillboard } from '../../src/environment/ControlsBillboard.js';
import { CameraManager } from '../../src/core/CameraManager.js';
import { LAYER_DEFAULT, LAYER_REFLECTION } from '../../src/config/layers.js';

describe('ControlsBillboard', () => {
  let billboard;

  beforeEach(() => {
    billboard = new ControlsBillboard();
  });

  afterEach(() => {
    if (billboard) {
      billboard.dispose();
    }
  });

  it('should initialize positioned behind spectator at Z = 438', () => {
    expect(billboard.group).toBeDefined();
    expect(billboard.group.position.x).toBe(0);
    expect(billboard.group.position.y).toBe(9.5);
    expect(billboard.group.position.z).toBe(438);
    expect(billboard.width).toBe(36);
    expect(billboard.height).toBe(18);
  });

  it('should create display screen mesh facing towards -Z', () => {
    expect(billboard.boardMesh).toBeDefined();
    // Rotated 180 deg around Y so normal points toward spectator at Z=420
    expect(billboard.boardMesh.rotation.y).toBeCloseTo(Math.PI);
    expect(billboard.boardMesh.layers.isEnabled(LAYER_DEFAULT)).toBe(true);
    expect(billboard.boardMesh.layers.isEnabled(LAYER_REFLECTION)).toBe(true);
  });

  it('should create back chassis, frame trim, and support pillars', () => {
    expect(billboard.backMesh).toBeDefined();
    expect(billboard.frameMesh).toBeDefined();
    expect(billboard.pillars.length).toBe(2);

    const leftPillar = billboard.pillars[0];
    const rightPillar = billboard.pillars[1];
    expect(leftPillar.position.x).toBeLessThan(0);
    expect(rightPillar.position.x).toBeGreaterThan(0);
  });

  it('should allow custom dimensions and position', () => {
    const customBillboard = new ControlsBillboard({
      width: 60,
      height: 30,
      position: new THREE.Vector3(10, 20, 500)
    });

    expect(customBillboard.width).toBe(60);
    expect(customBillboard.height).toBe(30);
    expect(customBillboard.group.position.x).toBe(10);
    expect(customBillboard.group.position.y).toBe(20);
    expect(customBillboard.group.position.z).toBe(500);

    customBillboard.dispose();
  });

  it('should update without throwing errors', () => {
    expect(() => billboard.update(0.016)).not.toThrow();
  });

  it('should dispose resources cleanly and empty group', () => {
    billboard.dispose();
    expect(billboard.group.children.length).toBe(0);
    expect(billboard.pillars.length).toBe(0);
    expect(billboard.canvasTexture).toBeNull();
  });
});

describe('CameraManager look-behind toggle', () => {
  let cameraManager;

  beforeEach(() => {
    cameraManager = new CameraManager();
  });

  it('should toggle orientation between fireworks stage and controls billboard', () => {
    // Default camera at (0, 6, 420) looking at (0, 75, 0) -> forward Z is negative
    const initialForward = new THREE.Vector3();
    cameraManager.instance.getWorldDirection(initialForward);
    expect(initialForward.z).toBeLessThan(0);

    // Call toggleLookBehind() -> turns to look behind at billboard (0, 16, 490)
    cameraManager.toggleLookBehind();
    const behindForward = new THREE.Vector3();
    cameraManager.instance.getWorldDirection(behindForward);
    expect(behindForward.z).toBeGreaterThan(0);

    // Call toggleLookBehind() again -> turns back to look at stage (0, 75, 0)
    cameraManager.toggleLookBehind();
    const stageForward = new THREE.Vector3();
    cameraManager.instance.getWorldDirection(stageForward);
    expect(stageForward.z).toBeLessThan(0);
  });
});
