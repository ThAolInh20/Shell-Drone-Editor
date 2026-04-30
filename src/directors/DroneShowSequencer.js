import * as THREE from 'three';

export class DroneShowSequencer {
    constructor(droneSystem) {
        this.droneSystem = droneSystem;
        this.steps = [];
        this.isPlaying = false;
        this.droneCount = 0;
        this.playbackTime = 0;
        this.basePlaybackTime = 0; // To sync with ShowDirector's elapsedTime
    }

    loadSequence(sequenceData, startTime = 0) {
        const wasPlaying = this.isPlaying;
        this.reset();
        this.isPlaying = wasPlaying;


        if (sequenceData && sequenceData.droneCount) {
            this.droneCount = sequenceData.droneCount;
            // Only update the instanced mesh directly, bypassing slow DroneEntity logic
            this.droneSystem.droneMesh.setCount(this.droneCount);
            this.droneSystem.drones = []; // Disable DroneSystem's internal update loop
        }

        if (sequenceData && sequenceData.steps) {
            this.steps = sequenceData.steps;

            // Auto-calculate absolute times based on a fixed drone speed
            const SPEED = 20 // m/s
            let currentTime = 0;

            for (let i = 0; i < this.steps.length; i++) {
                const step = this.steps[i];
                // Ensure default values
                step.holdTime = step.holdTime || 0;
                step.holdEffect = step.holdEffect || 'none';

                if (i === 0) {
                    step.time = 0;
                    currentTime = step.holdTime;
                } else {
                    const prevStep = this.steps[i - 1];
                    let maxDist = 0;
                    for (let j = 0; j < Math.min(step.positions.length, prevStep.positions.length); j++) {
                        const p1 = prevStep.positions[j];
                        const p2 = step.positions[j];
                        if (p1 && p2) {
                            const dx = p1.x - p2.x;
                            const dy = p1.y - p2.y;
                            const dz = p1.z - p2.z;
                            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist > maxDist) maxDist = dist;
                        }
                    }

                    let flightTime = (maxDist / SPEED) * 1000;
                    if (flightTime < 1000) flightTime = 1000; // minimum 1s flight time

                    step.time = prevStep.time + prevStep.holdTime + flightTime;
                    currentTime = step.time + step.holdTime;
                }
            }
        }

        this.basePlaybackTime = startTime;
        this.playbackTime = 0; // It will be synced via update() or seek()
    }

    play() {
        this.isPlaying = true;
    }

    pause() {
        this.isPlaying = false;
    }

    stop() {
        this.isPlaying = false;
        this.playbackTime = 0;
        this.basePlaybackTime = 0;
    }

    seek(time) {
        this.playbackTime = time;
    }

    reset() {
        this.steps = [];
        this.isPlaying = false;
        this.droneCount = 0;
        this.playbackTime = 0;

        // Return drones to ground grid
        if (this.droneSystem) {
            this.droneSystem.droneMesh.setCount(0);
        }
    }

    update(deltaTime) {
        if (this.steps.length === 0 || this.droneCount === 0) return;

        if (this.isPlaying) {
            this.playbackTime += deltaTime;
        }

        // Convert to milliseconds because Drone Editor uses ms (time: 1000, 2000, etc)
        const msTime = (this.playbackTime - this.basePlaybackTime) * 1000;

        const steps = this.steps;
        const maxTime = steps[steps.length - 1].time;

        if (msTime < 0) {
            // Hide drones before show starts
            const dummy = new THREE.Object3D();
            dummy.position.set(0, -10000, 0);
            dummy.updateMatrix();
            for (let i = 0; i < this.droneCount; i++) {
                this.droneSystem.droneMesh.mesh.setMatrixAt(i, dummy.matrix);
            }
            this.droneSystem.droneMesh.updateBuffers();
            return;
        }

        // Find which steps we are between
        let stepA = steps[0];
        let stepB = steps[steps.length - 1];

        for (let i = 0; i < steps.length - 1; i++) {
            if (msTime >= steps[i].time && msTime <= steps[i + 1].time) {
                stepA = steps[i];
                stepB = steps[i + 1];
                break;
            }
        }

        if (msTime > stepB.time) {
            stepA = stepB;
        }

        const holdTime = stepA.holdTime || 0;
        const flightDuration = stepB.time - (stepA.time + holdTime);
        let t = 0;

        if (msTime <= stepA.time + holdTime) {
            t = 0; // Holding
        } else if (flightDuration > 0) {
            t = (msTime - (stepA.time + holdTime)) / flightDuration;
            // Smoothstep easing
            t = t * t * (3 - 2 * t);
            if (t > 1) t = 1;
        } else {
            t = 1;
        }

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const count = this.droneSystem.droneMesh.count; // Respect maxDrones cap
        const age = msTime / 1000;

        for (let i = 0; i < count; i++) {
            // Fallback to stepA if positions are missing
            const posA = stepA.positions[i] || new THREE.Vector3();
            const posB = stepB.positions[i] || posA;

            dummy.position.lerpVectors(posA, posB, t);
            dummy.scale.set(1, 1, 1);

            // Apply mathematical effects
            const droneEffectA = stepA.effects ? (stepA.effects[i] || 'none') : 'none';
            const droneEffectB = stepB.effects ? (stepB.effects[i] || 'none') : 'none';

            const holdEffectA = (stepA.holdEffect && stepA.holdEffect !== 'none') ? stepA.holdEffect : droneEffectA;
            const holdEffectB = (stepB.holdEffect && stepB.holdEffect !== 'none') ? stepB.holdEffect : droneEffectB;

            let currentEffect = 'none';
            if (t > 0.01 && t < 0.99) {
                currentEffect = stepA.transitionEffect || 'none';
            } else if (t <= 0.01) {
                currentEffect = holdEffectA;
            } else {
                currentEffect = holdEffectB;
            }

            if (currentEffect === 'wave') {
                dummy.position.y += Math.sin(age * 3.0 + (i * 0.1)) * 2.0;
            } else if (currentEffect === 'swing') {
                dummy.position.x += Math.sin(age * 2.0 + (i * 0.1)) * 2.5;
            } else if (currentEffect === 'pulse') {
                const p = 1.0 + Math.sin(age * Math.PI * 2 + (i * 0.1)) * 0.5;
                dummy.scale.set(p, p, p);
            }

            // Apply Global Offset: DRONE_ZONE_CONFIG.position is already applied via performanceZone Group
            // We just write to the local InstancedMesh buffer!
            dummy.updateMatrix();
            this.droneSystem.droneMesh.mesh.setMatrixAt(i, dummy.matrix);

            const colA = stepA.colors[i] ? new THREE.Color(stepA.colors[i]) : new THREE.Color(0xffffff);
            const colB = stepB.colors[i] ? new THREE.Color(stepB.colors[i]) : colA;
            color.copy(colA).lerp(colB, t);

            if (currentEffect === 'strobe') {
                const p = Math.sin(age * 15.0 + (i * 0.5));
                if (p < 0) color.multiplyScalar(0.1);
            } else if (currentEffect === 'shimmer') {
                const flicker = 1.0 + (Math.random() - 0.5) * 0.8;
                color.multiplyScalar(Math.max(0, flicker));
            }

            this.droneSystem.droneMesh.mesh.setColorAt(i, color);
        }

        this.droneSystem.droneMesh.updateBuffers();
    }
}
