import * as THREE from 'three';

export class SelectionSolver {
  /**
   * Solves which 3D points fall within a 2D screen marquee box.
   *
   * @param {Object} params
   * @param {number} params.startX
   * @param {number} params.startY
   * @param {number} params.endX
   * @param {number} params.endY
   * @param {HTMLCanvasElement} params.domElement
   * @param {THREE.Camera} params.camera
   * @param {THREE.Vector3[]} params.positions
   * @returns {number[]} Array of selected indices
   */
  static solveBoxSelection(params) {
    const {
      startX,
      startY,
      endX,
      endY,
      domElement,
      camera,
      positions
    } = params;

    const minX = Math.min(
      startX,
      endX
    );
    const maxX = Math.max(
      startX,
      endX
    );
    const minY = Math.min(
      startY,
      endY
    );
    const maxY = Math.max(
      startY,
      endY
    );

    const rect = domElement.getBoundingClientRect();
    const selectedList = [];
    const scratchVec = new THREE.Vector3();

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];

      // Project to camera/view space
      const viewV = scratchVec.copy(pos).applyMatrix4(camera.matrixWorldInverse);
      if (viewV.z > 0) {
        // Behind camera
        continue;
      }

      // Project view space to NDC
      viewV.applyMatrix4(camera.projectionMatrix);

      // Convert NDC to client screen coords
      const x = rect.left + (viewV.x * 0.5 + 0.5) * rect.width;
      const y = rect.top + (-viewV.y * 0.5 + 0.5) * rect.height;

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        selectedList.push(i);
      }
    }

    return selectedList;
  }

  /**
   * Resolves standard selection based on raycast intersection with the instanced mesh.
   *
   * @param {Object} params
   * @param {Object[]} params.intersects Raycast intersections with instanced mesh
   * @param {MouseEvent} params.event The mouse event (for shift/ctrl modifiers)
   * @param {Object} params.state The state object containing selection methods
   */
  static solveClickSelection(params) {
    const {
      intersects,
      event,
      state
    } = params;

    console.log('solveClickSelection called, intersects count:', intersects.length);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      console.log('first intersect instanceId:', instanceId);
      const multiSelect = event.shiftKey || event.ctrlKey;
      const selectGroupUI = document.getElementById('ui-select-group');

      if (selectGroupUI && selectGroupUI.checked) {
        const groupName = state.particleGroups[instanceId];
        if (groupName) {
          // Check if this group already has ANY selected drones
          let groupHasSelection = false;
          for (const idx of state.selectedIndices) {
            if (state.particleGroups[idx] === groupName) {
              groupHasSelection = true;
              break;
            }
          }

          if (groupHasSelection) {
            // Group is already "active", drill down to individual particle
            if (multiSelect && state.selectedIndices.has(instanceId)) {
              state.deselect(instanceId);
            } else {
              state.select(
                instanceId,
                multiSelect
              );
            }
          } else {
            // Group is not active, select the entire group
            state.selectGroup(
              groupName,
              multiSelect
            );
          }
        } else {
          // Fallback to individual selection if no group name is defined
          if (multiSelect && state.selectedIndices.has(instanceId)) {
            state.deselect(instanceId);
          } else {
            state.select(
              instanceId,
              multiSelect
            );
          }
        }
      } else {
        // Strict individual selection mode
        if (multiSelect && state.selectedIndices.has(instanceId)) {
          state.deselect(instanceId);
        } else {
          state.select(
            instanceId,
            multiSelect
          );
        }
      }
    } else {
      const multiSelect = event.shiftKey || event.ctrlKey;
      if (!multiSelect) {
        state.clearSelection();
      }
    }
  }
}
