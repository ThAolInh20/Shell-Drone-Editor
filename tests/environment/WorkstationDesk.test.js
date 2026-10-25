import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { WorkstationDesk } from '../../src/environment/WorkstationDesk.js';
import { SceneManager } from '../../src/core/SceneManager.js';

describe('WorkstationDesk', () => {
  let desk;

  beforeEach(() => {
    desk = new WorkstationDesk();
  });

  afterEach(() => {
    if (desk) {
      desk.dispose();
    }
  });

  it('should initialize positioned on the right side of spectator position at (3.2, 4.1, 420.5)', () => {
    expect(desk.group).toBeDefined();
    expect(desk.position.x).toBeCloseTo(3.2);
    expect(desk.position.y).toBeCloseTo(4.1);
    expect(desk.position.z).toBeCloseTo(420.5);
    expect(desk.interactionRadius).toBeCloseTo(4.2);
  });

  it('should create desk structure, legs, and laptop meshes', () => {
    expect(desk.group.children.length).toBeGreaterThan(5);

    const deskTop = desk.group.getObjectByName('WorkstationDeskTop');
    expect(deskTop).toBeDefined();

    // Check that lid group or meshes are present
    const hasMeshes = desk.group.children.some(child => child.isMesh || child.isGroup);
    expect(hasMeshes).toBe(true);
  });

  it('should accurately calculate proximity to camera position', () => {
    // Camera at initial spectator position (0, 6, 420)
    // Distance to (3.2, 4.1, 420.5): sqrt(3.2^2 + 1.9^2 + 0.5^2) = sqrt(10.24 + 3.61 + 0.25) = sqrt(14.1) ≈ 3.75m
    const initialCamPos = new THREE.Vector3(0, 6, 420);
    const distFromCenter = desk.getDistanceTo(initialCamPos);
    expect(distFromCenter).toBeCloseTo(3.75, 1);

    // When standing slightly closer to desk at (2, 5, 420.5)
    const nearCamPos = new THREE.Vector3(2, 5, 420.5);
    expect(desk.isNear(nearCamPos)).toBe(true);

    // When far away at fireworks launch zone (0, 6, 340)
    const farCamPos = new THREE.Vector3(0, 6, 340);
    expect(desk.isNear(farCamPos)).toBe(false);
  });

  it('should toggle timeline editor and unlock controls on interact', () => {
    const mockTimelineEditor = {
      visible: false,
      toggle: vi.fn(function () {
        this.visible = !this.visible;
      })
    };
    const mockControls = {
      isLocked: true,
      unlock: vi.fn(function () {
        this.isLocked = false;
      })
    };

    // Trigger interaction
    desk.interact(mockTimelineEditor, mockControls);

    expect(mockTimelineEditor.toggle).toHaveBeenCalled();
    expect(mockTimelineEditor.visible).toBe(true);
    expect(mockControls.unlock).toHaveBeenCalled();
    expect(mockControls.isLocked).toBe(false);
  });

  it('should update proximity state and toggle prompt', () => {
    const nearCamPos = new THREE.Vector3(2.5, 4.5, 420.5);
    desk.update(0.016, nearCamPos, false);
    expect(desk.isNearPlayer).toBe(true);

    // When timeline becomes visible, prompt state clears
    desk.update(0.016, nearCamPos, true);
    expect(desk.isNearPlayer).toBe(false);

    // When moving far away
    const farCamPos = new THREE.Vector3(0, 6, 300);
    desk.update(0.016, farCamPos, false);
    expect(desk.isNearPlayer).toBe(false);
  });

  it('should dispose resources cleanly and empty group', () => {
    desk.dispose();
    expect(desk.group.children.length).toBe(0);
    expect(desk.screenTexture).toBeNull();
  });
});

describe('SceneManager integration with WorkstationDesk', () => {
  let sceneManager;

  beforeEach(() => {
    sceneManager = new SceneManager();
  });

  afterEach(() => {
    if (sceneManager) {
      sceneManager.destroy();
    }
  });

  it('should have workstationDesk instance and isNearWorkstation method', () => {
    expect(sceneManager.workstationDesk).toBeDefined();
    expect(typeof sceneManager.isNearWorkstation).toBe('function');

    const nearPos = new THREE.Vector3(3.6, 4.2, 420.5);
    expect(sceneManager.isNearWorkstation(nearPos)).toBe(true);

    const farPos = new THREE.Vector3(0, 10, 0);
    expect(sceneManager.isNearWorkstation(farPos)).toBe(false);
  });
});
