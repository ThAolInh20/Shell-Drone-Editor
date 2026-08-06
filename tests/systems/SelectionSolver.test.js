import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SelectionSolver } from '../../src/core/SelectionSolver.js';

describe('SelectionSolver', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('solveBoxSelection', () => {
    it('should select points inside the 2D bounding box on the screen', () => {
      const mockDomElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600
        })
      };

      const camera = new THREE.PerspectiveCamera(
        75,
        800 / 600,
        0.1,
        1000
      );
      camera.position.set(
        0,
        0,
        10
      );
      camera.updateMatrixWorld();

      const pos1 = new THREE.Vector3(
        0,
        0,
        0
      );
      const pos2 = new THREE.Vector3(
        0,
        0,
        20
      );
      const pos3 = new THREE.Vector3(
        100,
        0,
        0
      );

      const positions = [
        pos1,
        pos2,
        pos3
      ];

      const selected = SelectionSolver.solveBoxSelection({
        startX: 300,
        startY: 200,
        endX: 500,
        endY: 400,
        domElement: mockDomElement,
        camera,
        positions
      });

      expect(selected).toContain(0);
      expect(selected).not.toContain(1);
      expect(selected).not.toContain(2);
    });
  });

  describe('solveClickSelection', () => {
    let mockState;
    let mockUISelectGroup;

    beforeEach(() => {
      mockState = {
        selectedIndices: new Set(),
        particleGroups: [
          'groupA',
          'groupA',
          'groupB'
        ],
        select: vi.fn(),
        deselect: vi.fn(),
        selectGroup: vi.fn(),
        clearSelection: vi.fn()
      };

      mockUISelectGroup = {
        checked: false
      };

      vi.stubGlobal(
        'document',
        {
          getElementById: vi.fn().mockImplementation((id) => {
            if (id === 'ui-select-group') return mockUISelectGroup;
            return null;
          })
        }
      );
    });

    it('should clear selection if click misses everything and multiSelect is false', () => {
      const mockEvent = {
        shiftKey: false,
        ctrlKey: false
      };
      SelectionSolver.solveClickSelection({
        intersects: [],
        event: mockEvent,
        state: mockState
      });

      expect(mockState.clearSelection).toHaveBeenCalled();
    });

    it('should not clear selection if click misses but multiSelect (shift) is true', () => {
      const mockEvent = {
        shiftKey: true,
        ctrlKey: false
      };
      SelectionSolver.solveClickSelection({
        intersects: [],
        event: mockEvent,
        state: mockState
      });

      expect(mockState.clearSelection).not.toHaveBeenCalled();
    });

    it('should select individual index if checked is false', () => {
      const mockEvent = {
        shiftKey: false,
        ctrlKey: false
      };
      const intersects = [
        {
          instanceId: 1
        }
      ];

      SelectionSolver.solveClickSelection({
        intersects,
        event: mockEvent,
        state: mockState
      });

      expect(mockState.select).toHaveBeenCalledWith(
        1,
        false
      );
    });

    it('should select group if ui-select-group checked is true and group is inactive', () => {
      mockUISelectGroup.checked = true;
      const mockEvent = {
        shiftKey: false,
        ctrlKey: false
      };
      const intersects = [
        {
          instanceId: 0
        }
      ];

      SelectionSolver.solveClickSelection({
        intersects,
        event: mockEvent,
        state: mockState
      });

      expect(mockState.selectGroup).toHaveBeenCalledWith(
        'groupA',
        false
      );
    });

    it('should select individual item inside group if group already has selection', () => {
      mockUISelectGroup.checked = true;
      mockState.selectedIndices.add(0);
      const mockEvent = {
        shiftKey: true,
        ctrlKey: false
      };
      const intersects = [
        {
          instanceId: 1
        }
      ];

      SelectionSolver.solveClickSelection({
        intersects,
        event: mockEvent,
        state: mockState
      });

      expect(mockState.select).toHaveBeenCalledWith(
        1,
        true
      );
    });

    it('should deselect item if already selected and multiSelect is true', () => {
      mockState.selectedIndices.add(1);
      const mockEvent = {
        shiftKey: true,
        ctrlKey: false
      };
      const intersects = [
        {
          instanceId: 1
        }
      ];

      SelectionSolver.solveClickSelection({
        intersects,
        event: mockEvent,
        state: mockState
      });

      expect(mockState.deselect).toHaveBeenCalledWith(1);
    });

    it('should fallback to individual selection if groupName is falsy and ui-select-group checked is true', () => {
      mockUISelectGroup.checked = true;
      mockState.particleGroups = [];
      const mockEvent = {
        shiftKey: false,
        ctrlKey: false
      };
      const intersects = [
        {
          instanceId: 1
        }
      ];

      SelectionSolver.solveClickSelection({
        intersects,
        event: mockEvent,
        state: mockState
      });

      expect(mockState.select).toHaveBeenCalledWith(
        1,
        false
      );
    });
  });
});
