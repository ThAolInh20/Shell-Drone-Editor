import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MovementSystem } from '../../src/systems/MovementSystem.js';
import * as THREE from 'three';

describe('MovementSystem', () => {
  let mockInputSystem;
  let mockCamera;
  let movementSystem;

  beforeEach(() => {
    mockInputSystem = {
      controls: {
        isLocked: true,
        moveRight: vi.fn(),
        moveForward: vi.fn()
      },
      keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false
      },
      setMovementStatus: vi.fn()
    };

    mockCamera = {
      position: new THREE.Vector3(
        0,
        10,
        0
      )
    };

    movementSystem = new MovementSystem(
      mockInputSystem,
      mockCamera
    );
  });

  it('should not update if controls are not locked', () => {
    mockInputSystem.controls.isLocked = false;
    movementSystem.update(0.1);
    expect(mockInputSystem.controls.moveForward).not.toHaveBeenCalled();
  });

  it('should move forward when forward key is pressed and shift is false', () => {
    mockInputSystem.keys.forward = true;
    movementSystem.update(0.1);

    expect(mockInputSystem.controls.moveForward).toHaveBeenCalled();
    expect(mockCamera.position.y).toBe(10);
  });

  it('should fly up when forward key and shift key are pressed', () => {
    mockInputSystem.keys.forward = true;
    mockInputSystem.keys.shift = true;
    movementSystem.update(0.1);

    expect(mockCamera.position.y).toBeGreaterThan(10);
  });

  it('should fly down when backward key and shift key are pressed', () => {
    mockInputSystem.keys.backward = true;
    mockInputSystem.keys.shift = true;
    movementSystem.update(0.1);

    expect(mockCamera.position.y).toBeLessThan(10);
  });

  it('should route WASD input to cameraManager when mode is not free', () => {
    const mockCameraManager = {
      mode: 'boat',
      handleWasdInput: vi.fn()
    };
    const cinematicMovement = new MovementSystem(
      mockInputSystem,
      mockCamera,
      mockCameraManager
    );

    mockInputSystem.keys.right = true;
    cinematicMovement.update(0.1);

    expect(mockCameraManager.handleWasdInput).toHaveBeenCalledWith(
      1,
      0,
      false,
      0.1
    );
    expect(mockInputSystem.controls.moveForward).not.toHaveBeenCalled();
  });

  it('should update speed multiplier and scale movement speed', () => {
    movementSystem.setSpeedMultiplier(2.0);
    expect(movementSystem.speedMultiplier).toBe(2.0);
    expect(movementSystem.speed).toBe(1000.0);
  });
});
