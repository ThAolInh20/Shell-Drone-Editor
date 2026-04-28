import { DroneFormationFactory } from '../factories/DroneFormationFactory.js';
import { DroneFormats } from '../config/droneFormats.js';

export class DroneShowSequencer {
    constructor(droneSystem) {
        this.droneSystem = droneSystem;
        this.steps = [];
        this.currentStepIndex = 0;
        this.isWaitingForFormation = false;
        this.holdTimer = 0;
        this.isActive = false;
        this.isPlaying = false;
        this.droneCount = 0;

        
        this.isWaitingForFormation = false;
        this.holdTimer = 0;
    }

    loadSequence(sequenceData) {
        this.reset();
        
        if (sequenceData && sequenceData.droneCount) {
            this.droneCount = sequenceData.droneCount;
            this.droneSystem.createDrones(this.droneCount);
        }

        if (sequenceData && sequenceData.steps) {
            this.steps = sequenceData.steps;
        } else if (sequenceData && sequenceData.timeline) {
            // Fallback for old time-based sequence: map to steps
            this.steps = sequenceData.timeline.map(item => item.cue);
        }
    }

    play() {
        this.isPlaying = true;
    }

    pause() {
        this.isPlaying = false;
    }

    stop() {
        this.isPlaying = false;
        this.currentStepIndex = 0;
        this.isWaitingForFormation = false;
    }

    reset() {
        this.steps = [];
        this.currentStepIndex = 0;
        this.isPlaying = false;
        this.droneCount = 0;
        this.isWaitingForFormation = false;
        this.holdTimer = 0;
        
        // Return drones to ground grid
        if (this.droneSystem && this.droneSystem.drones.length > 0) {
             const positions = DroneFormationFactory.createFormation(
                'grid', 
                this.droneSystem.drones.length, 
                { y: 0, spacing: 15 }
            );
            this.droneSystem.applyFormat(positions, {
                formation: 'grid',
                motion: 'smooth',
                transitionColor: { type: 'solid', color: '#000000' },
                arrivalColor: { type: 'instant', color: '#ffffff' }
            });
        }
    }

    update(deltaTime) {
        if (!this.isPlaying || this.steps.length === 0 || this.currentStepIndex >= this.steps.length) return;

        if (!this.isWaitingForFormation) {
            // Execute next step
            const step = this.steps[this.currentStepIndex];
            this.executeStep(step);
            this.isWaitingForFormation = true;
            this.holdTimer = 0;
        } else {
            // Check if formation is complete
            if (this.droneSystem.isFormationComplete()) {
                const step = this.steps[this.currentStepIndex];
                const holdDuration = step.holdDuration || 2.0; // Default hold time 2 seconds
                
                this.holdTimer += deltaTime;
                if (this.holdTimer >= holdDuration) {
                    this.isWaitingForFormation = false;
                    this.currentStepIndex++;
                }
            }
        }
    }

    executeStep(step) {
        if (!step) return;
        
        if (step.type === 'format') {
            const count = this.droneSystem.drones.length;
            if (count === 0) return;
            
            const formatConfig = DroneFormats[step.id];
            if (!formatConfig) {
                console.error(`Format ${step.id} not found in DroneFormats`);
                return;
            }
            
            const positions = DroneFormationFactory.createFormation(
                formatConfig.formation, 
                count, 
                formatConfig.formationParams || {}
            );
            
            this.droneSystem.applyFormat(positions, formatConfig);
        } else if (step.type === 'animation') {
            this.droneSystem.triggerAnimation(step.animation, step.params || {}, step.duration || 0);
        }
    }
}
