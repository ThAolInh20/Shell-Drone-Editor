import * as THREE from 'three';

export class ConstraintSolver {
  static solveLineConstraints(positions, lineConstraints) {
    let changed = false;
    for (const lc of lineConstraints) {
      const posA = positions[lc.anchorA];
      const posB = positions[lc.anchorB];
      if (posA && posB) {
        const count = lc.intermediates.length;
        for (let i = 0; i < count; i++) {
          const idx = lc.intermediates[i];
          if (positions[idx]) {
            const t = (i + 1) / (count + 1);
            const newPos = new THREE.Vector3().lerpVectors(posA, posB, t);
            if (positions[idx].distanceToSquared(newPos) > 0.0001) {
              positions[idx].copy(newPos);
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  }

  static adjustConstraintsOnDeletion(lineConstraints, deletedIndicesSortedDescending) {
    return lineConstraints.filter(lc => {
      // If anchorA or anchorB is deleted, the constraint is invalid
      if (deletedIndicesSortedDescending.includes(lc.anchorA) || deletedIndicesSortedDescending.includes(lc.anchorB)) {
        return false;
      }
      
      // Filter out deleted intermediates
      lc.intermediates = lc.intermediates.filter(idx => !deletedIndicesSortedDescending.includes(idx));
      
      // If no intermediates left, the constraint is invalid
      if (lc.intermediates.length === 0) {
        return false;
      }
      
      // Adjust remaining indices
      for (const deletedIdx of deletedIndicesSortedDescending) {
        if (lc.anchorA > deletedIdx) lc.anchorA--;
        if (lc.anchorB > deletedIdx) lc.anchorB--;
        lc.intermediates = lc.intermediates.map(idx => idx > deletedIdx ? idx - 1 : idx);
      }
      return true;
    });
  }
}
