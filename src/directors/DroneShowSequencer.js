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
            const SPEED = 40 // m/s
            let currentTime = 0;

            for (let i = 0; i < this.steps.length; i++) {
                const step = this.steps[i];
                // Ensure default values and backward compatibility
                step.holdTime = step.holdTime || 0;
                
                let moveEff = step.holdMoveEffect;
                let lightEff = step.holdLightEffect;
                
                if (!moveEff && !lightEff && step.holdEffect) {
                    if (['strobe', 'shimmer'].includes(step.holdEffect)) {
                        moveEff = 'none';
                        lightEff = step.holdEffect;
                    } else {
                        moveEff = step.holdEffect;
                        lightEff = 'none';
                    }
                }
                
                step.holdMoveEffect = moveEff || 'none';
                step.holdLightEffect = lightEff || 'none';

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

        const defaultCenter = new THREE.Vector3(0, 20, 0);
        const centerA = stepA.center ? new THREE.Vector3(stepA.center.x, stepA.center.y, stepA.center.z) : defaultCenter;
        const centerB = stepB.center ? new THREE.Vector3(stepB.center.x, stepB.center.y, stepB.center.z) : defaultCenter;
        const currentCenter = new THREE.Vector3().lerpVectors(centerA, centerB, t);

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

            // 1. Phân tích Chuyển động (Movement Effect)
            const holdMoveEffectA = (stepA.holdMoveEffect && stepA.holdMoveEffect !== 'none') ? stepA.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectA) ? droneEffectA : 'none');
            const holdMoveEffectB = (stepB.holdMoveEffect && stepB.holdMoveEffect !== 'none') ? stepB.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectB) ? droneEffectB : 'none');

            let currentMoveEffect = 'none';
            if (t > 0.01 && t < 0.99) {
                const transEff = stepA.transitionEffect || 'none';
                currentMoveEffect = ['wave', 'swing', 'pulse'].includes(transEff) ? transEff : 'none';
            } else if (t <= 0.01) {
                currentMoveEffect = holdMoveEffectA;
            } else {
                currentMoveEffect = holdMoveEffectB;
            }

            // 2. Phân tích Ánh sáng (Light Effect)
            const holdLightEffectA = (stepA.holdLightEffect && stepA.holdLightEffect !== 'none') ? stepA.holdLightEffect : (['strobe', 'shimmer'].includes(droneEffectA) ? droneEffectA : 'none');
            const holdLightEffectB = (stepB.holdLightEffect && stepB.holdLightEffect !== 'none') ? stepB.holdLightEffect : (['strobe', 'shimmer'].includes(droneEffectB) ? droneEffectB : 'none');

            let currentLightEffect = 'none';
            if (t > 0.01 && t < 0.99) {
                const transEff = stepA.transitionEffect || 'none';
                currentLightEffect = ['strobe', 'shimmer'].includes(transEff) ? transEff : 'none';
            } else if (t <= 0.01) {
                currentLightEffect = holdLightEffectA;
            } else {
                currentLightEffect = holdLightEffectB;
            }

            // --- ÁP DỤNG HIỆU ỨNG DI CHUYỂN (MOVEMENT EFFECT) ---
            if (currentMoveEffect === 'wave') {
                dummy.position.y += Math.sin(age * 3.0 + (i * 0.1)) * 2.0;
            } else if (currentMoveEffect === 'swing') {
                dummy.position.x += Math.sin(age * 2.0 + (i * 0.1)) * 2.5;
            } else if (currentMoveEffect === 'pulse') {
                const p = 1.0 + Math.sin(age * Math.PI * 2 + (i * 0.1)) * 0.5;
                dummy.scale.set(p, p, p);
            } else if (currentMoveEffect === 'orbit' || currentMoveEffect === 'spiral') {
                const toDrone = new THREE.Vector3().subVectors(dummy.position, currentCenter);
                let angle = age * 0.6; // Rotation speed
                let radiusScale = 1.0;
                
                if (currentMoveEffect === 'spiral') {
                    const dist = toDrone.length();
                    radiusScale = 1.0 + Math.sin(age * 2.0 - dist * 0.05) * 0.15;
                    angle += dist * 0.02; // Twist spiral
                }
                
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const rx = toDrone.x * cos - toDrone.z * sin;
                const rz = toDrone.x * sin + toDrone.z * cos;
                
                dummy.position.set(
                    currentCenter.x + rx * radiusScale,
                    dummy.position.y, // Maintain height
                    currentCenter.z + rz * radiusScale
                );
            } else if (currentMoveEffect === 'expand') {
                const toDrone = new THREE.Vector3().subVectors(dummy.position, currentCenter);
                const pulseScale = 1.0 + Math.sin(age * 3.0) * 0.2;
                
                dummy.position.set(
                    currentCenter.x + toDrone.x * pulseScale,
                    dummy.position.y,
                    currentCenter.z + toDrone.z * pulseScale
                );
            }

            // Apply Global Offset
            dummy.updateMatrix();
            this.droneSystem.droneMesh.mesh.setMatrixAt(i, dummy.matrix);

            const colA = stepA.colors[i] ? new THREE.Color(stepA.colors[i]) : new THREE.Color(0xffffff);
            const colB = stepB.colors[i] ? new THREE.Color(stepB.colors[i]) : colA;
            color.copy(colA).lerp(colB, t);

            // --- ÁP DỤNG HIỆU ỨNG ÁNH SÁNG (LIGHT EFFECT) ---
            if (currentLightEffect === 'strobe') {
                const p = Math.sin(age * 15.0 + (i * 0.5));
                if (p < 0) color.multiplyScalar(0.1);
            } else if (currentLightEffect === 'shimmer') {
                const flicker = 1.0 + (Math.random() - 0.5) * 0.8;
                color.multiplyScalar(Math.max(0, flicker));
            } else if (currentLightEffect === 'pulse-color') {
                const factor = 0.5 + 0.5 * Math.sin(age * Math.PI * 2.0 + (i * 0.1));
                color.multiplyScalar(factor);
            } else if (currentLightEffect === 'rainbow') {
                const hue = (age * 0.1 + (i * 0.01)) % 1.0;
                color.setHSL(hue, 1.0, 0.5);
            } else if (currentLightEffect === 'wave-light') {
                const dist = dummy.position.distanceTo(currentCenter);
                const waveFactor = 0.5 + 0.5 * Math.sin(age * 5.0 - dist * 0.2);
                color.multiplyScalar(waveFactor);
            }

            this.droneSystem.droneMesh.mesh.setColorAt(i, color);
        }

        this.droneSystem.droneMesh.updateBuffers();
    }
}
