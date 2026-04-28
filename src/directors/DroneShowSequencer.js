import { DroneFormationFactory } from '../factories/DroneFormationFactory.js';

export class DroneShowSequencer {
    constructor(droneSystem) {
        this.droneSystem = droneSystem;
        this.timeline = [];
        this.currentTime = 0;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.droneCount = 0;
    }

    loadSequence(sequenceData) {
        this.reset();
        
        if (sequenceData && sequenceData.droneCount) {
            this.droneCount = sequenceData.droneCount;
            this.droneSystem.createDrones(this.droneCount);
        }

        if (sequenceData && sequenceData.timeline) {
            // Sort by time
            this.timeline = [...sequenceData.timeline].sort((a, b) => a.time - b.time);
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
        this.currentTime = 0;
        this.currentIndex = 0;
    }

    reset() {
        this.timeline = [];
        this.currentTime = 0;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.droneCount = 0;
        
        // Return drones to ground grid
        if (this.droneSystem && this.droneSystem.drones.length > 0) {
             const positions = DroneFormationFactory.createFormation(
                'grid', 
                this.droneSystem.drones.length, 
                { y: 0, spacing: 15 }
            );
            this.droneSystem.setTargets(positions, 0xffffff);
        }
    }

    seek(time) {
        this.currentTime = time;
        this.currentIndex = 0;
        let lastCue = null;
        
        for (let i = 0; i < this.timeline.length; i++) {
            if (this.timeline[i].time <= this.currentTime) {
                this.currentIndex = i + 1;
                lastCue = this.timeline[i];
            } else {
                break;
            }
        }
        
        if (lastCue) {
            this.executeCue(lastCue.cue);
        }
    }

    update(deltaTime) {
        if (!this.isPlaying || this.timeline.length === 0) return;

        this.currentTime += deltaTime;

        while (
            this.currentIndex < this.timeline.length && 
            this.currentTime >= this.timeline[this.currentIndex].time
        ) {
            const cue = this.timeline[this.currentIndex].cue;
            this.executeCue(cue);
            this.currentIndex++;
        }
    }

    executeCue(cue) {
        if (!cue) return;
        
        if (cue.type === 'formation') {
            const count = this.droneSystem.drones.length;
            if (count === 0) return;
            
            const positions = DroneFormationFactory.createFormation(
                cue.formation, 
                count, 
                cue.params || {}
            );
            
            const colorHex = cue.color ? parseInt(cue.color.replace('#', '0x')) : 0xffffff;
            this.droneSystem.setTargets(positions, colorHex);
        }
    }
}
