import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { RiverPropsManager } from '../../src/environment/RiverPropsManager.js';

describe('RiverPropsManager', () => {
  let riverProps;

  beforeEach(() => {
    riverProps = new RiverPropsManager({
      maxLanterns: 100,
      lanternCount: 40,
      lanternsEnabled: true,
      boatsEnabled: true,
      driftSpeed: 1.2
    });
  });

  afterEach(() => {
    if (riverProps) {
      riverProps.dispose();
    }
  });

  it('should initialize group with floating lanterns and boats', () => {
    expect(riverProps.group).toBeDefined();
    expect(riverProps.petalInstancedMesh).toBeDefined();
    expect(riverProps.flameInstancedMesh).toBeDefined();
    expect(riverProps.boatsGroup).toBeDefined();
    expect(riverProps.boats.length).toBeGreaterThan(0);
    expect(riverProps.lanternCount).toBe(40);
    expect(riverProps.petalInstancedMesh.count).toBe(40);
  });

  it('should toggle lanterns and update visibility and instance count', () => {
    riverProps.setLanternsEnabled(false);
    expect(riverProps.lanternsEnabled).toBe(false);
    expect(riverProps.petalInstancedMesh.visible).toBe(false);
    expect(riverProps.petalInstancedMesh.count).toBe(0);

    riverProps.setLanternsEnabled(true);
    expect(riverProps.lanternsEnabled).toBe(true);
    expect(riverProps.petalInstancedMesh.visible).toBe(true);
    expect(riverProps.petalInstancedMesh.count).toBe(40);

    riverProps.setLanternsCount(80);
    expect(riverProps.lanternCount).toBe(80);
    expect(riverProps.petalInstancedMesh.count).toBe(80);
  });

  it('should toggle boats visibility', () => {
    riverProps.setBoatsEnabled(false);
    expect(riverProps.boatsEnabled).toBe(false);
    expect(riverProps.boatsGroup.visible).toBe(false);

    riverProps.setBoatsEnabled(true);
    expect(riverProps.boatsEnabled).toBe(true);
    expect(riverProps.boatsGroup.visible).toBe(true);
  });

  it('should update drift speed and advance animation state on update', () => {
    riverProps.setDriftSpeed(2.0);
    expect(riverProps.driftSpeed).toBe(2.0);

    const initialBoatX = riverProps.boats[0].x;
    riverProps.update(0.5);

    expect(riverProps.time).toBeCloseTo(0.5);
    expect(riverProps.boats[0].x).not.toBe(initialBoatX);

    riverProps.resetBoats();
    expect(riverProps.boats[0].x).toBe(-280);
    expect(riverProps.boats[0].model.position.x).toBe(-280);
  });

  it('should calculate physical deck elevation adapting to position on boat', () => {
    // Cabin center
    const cabinHeight = riverProps.getLeadBoatDeckHeight(0, 0);
    expect(cabinHeight).toBeCloseTo(2.0 + 1.62);

    // Raised Bow prow (front)
    const bowHeight = riverProps.getLeadBoatDeckHeight(10.0, 0);
    expect(bowHeight).toBeGreaterThan(cabinHeight);

    // Raised Stern deck (rear)
    const sternHeight = riverProps.getLeadBoatDeckHeight(-10.0, 0);
    expect(sternHeight).toBeGreaterThan(cabinHeight);

    // Transform at specific deck position
    const transform = riverProps.getLeadBoatTransform(5.0, 1.0);
    expect(transform).toBeDefined();
    expect(transform.localX).toBe(5.0);
    expect(transform.localZ).toBe(1.0);
    expect(transform.y).toBeGreaterThan(0);
  });

  it('should reverse boat direction when reaching river boundary', () => {
    const boat = riverProps.boats[0];
    boat.x = 449;
    boat.dir = 1;

    // Advance simulation to push boat past 450
    riverProps.update(1.0);

    expect(boat.dir).toBe(-1);
    expect(boat.x).toBeLessThanOrEqual(450);
  });
});
