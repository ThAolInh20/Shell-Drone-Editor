export class FormationUIBridge {
  constructor(director) {
    this._director = director;

    this.gizmoSystem = {
      setMode: (mode) => {
        director.gizmoSystem.setMode(mode);
      },

      activateDeformMode: () => {
        director.gizmoSystem.activateDeformMode();
      },

      deactivateDeformMode: (applyState) => {
        director.gizmoSystem.deactivateDeformMode(applyState);
      },

      get isDeformModeActive() {
        return director.gizmoSystem.isDeformModeActive;
      },

      set deformType(type) {
        director.gizmoSystem.deformType = type;
      },

      get deformType() {
        return director.gizmoSystem.deformType;
      },

      set deformStrength(strength) {
        director.gizmoSystem.deformStrength = strength;
      },

      get deformStrength() {
        return director.gizmoSystem.deformStrength;
      },

      updateDeformLine: () => {
        director.gizmoSystem.updateDeformLine();
      },

      updateGroupDeformation: () => {
        director.gizmoSystem.updateGroupDeformation();
      }
    };
  }

  get cameraManager() {
    return this._director.cameraManager;
  }

  get controls() {
    return this._director.controls;
  }

  updateGhostModelTransform() {
    this._director.updateGhostModelTransform();
  }

  updateReferenceImageTransform() {
    this._director.updateReferenceImageTransform();
  }

  loadGhostModel(file) {
    this._director.loadGhostModel(file);
  }

  recalculateBezierDrones() {
    this._director.recalculateBezierDrones();
  }

  clearGhostModel() {
    this._director.clearGhostModel();
  }

  loadReferenceImage(file) {
    this._director.loadReferenceImage(file);
  }

  clearReferenceImage() {
    this._director.clearReferenceImage();
  }
}
