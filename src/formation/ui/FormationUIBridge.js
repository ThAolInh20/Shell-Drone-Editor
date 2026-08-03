export class FormationUIBridge {
  constructor(director) {
    this._director = director;

    this.gizmoSystem = {
      setMode: (mode) => {
        this._director.gizmoSystem.setMode(mode);
      },

      activateDeformMode: () => {
        this._director.gizmoSystem.activateDeformMode();
      },

      deactivateDeformMode: (applyState) => {
        this._director.gizmoSystem.deactivateDeformMode(applyState);
      },

      get isDeformModeActive() {
        return this._director.gizmoSystem.isDeformModeActive;
      },

      set deformType(type) {
        this._director.gizmoSystem.deformType = type;
      },

      get deformType() {
        return this._director.gizmoSystem.deformType;
      },

      set deformStrength(strength) {
        this._director.gizmoSystem.deformStrength = strength;
      },

      get deformStrength() {
        return this._director.gizmoSystem.deformStrength;
      },

      updateDeformLine: () => {
        this._director.gizmoSystem.updateDeformLine();
      },

      updateGroupDeformation: () => {
        this._director.gizmoSystem.updateGroupDeformation();
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
