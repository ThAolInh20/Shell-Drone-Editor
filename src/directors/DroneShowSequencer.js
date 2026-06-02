import * as THREE from 'three';

export class DroneShowSequencer {
    constructor(droneSystem) {
        this.droneSystem = droneSystem;
        this.steps = [];
        this.isPlaying = false;
        this.droneCount = 0;
        this.playbackTime = 0;
        this.basePlaybackTime = 0; // To sync with ShowDirector's elapsedTime
        this.globalOffset = new THREE.Vector3(0, 0, 240); // Shift drone performance closer to the camera (at z = 480)
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
            const SPEED = 40; // m/s
            let currentTime = 0;

            for (let i = 0; i < this.steps.length; i++) {
                const step = this.steps[i];
                // Ensure default values and backward compatibility
                step.holdTime = step.holdTime || 0;

                // Apply global Z-offset to translate the entire drone performance closer to camera
                if (!step._offsetApplied) {
                    if (step.positions) {
                        step.positions = step.positions.map(p => {
                            const vec = (p instanceof THREE.Vector3) ? p.clone() : new THREE.Vector3(p.x, p.y, p.z);
                            vec.add(this.globalOffset);
                            return vec;
                        });
                    }
                    
                    if (step.center) {
                        if (step.center instanceof THREE.Vector3) {
                            step.center = step.center.clone().add(this.globalOffset);
                        } else {
                            step.center = new THREE.Vector3(step.center.x, step.center.y, step.center.z).add(this.globalOffset);
                        }
                    } else {
                        step.center = new THREE.Vector3(0, 20, 0).add(this.globalOffset);
                    }

                    if (!step.groupConfigs) {
                        step.groupConfigs = {};
                    }

                    for (const gName in step.groupConfigs) {
                        const cfg = step.groupConfigs[gName];
                        if (cfg && cfg.center) {
                            if (cfg.center instanceof THREE.Vector3) {
                                cfg.center = cfg.center.clone().add(this.globalOffset);
                            } else {
                                cfg.center = new THREE.Vector3(cfg.center.x, cfg.center.y, cfg.center.z).add(this.globalOffset);
                            }
                        }
                    }

                    step._offsetApplied = true;
                }

                // Ensure particleGroups array is initialized
                if (!step.particleGroups && step.positions) {
                    step.particleGroups = new Array(step.positions.length).fill('Default');
                }

                // Ensure groupConfigs exist
                if (!step.groupConfigs) {
                    step.groupConfigs = {};
                }
                
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

                    if (step.transitionTime === undefined) {
                        let maxDist = 0;
                        for (let j = 0; j < Math.min(step.positions.length, prevStep.positions.length); j++) {
                            const p1 = prevStep.positions[j];
                            const p2 = step.positions[j];
                            if (p1 && p2) {
                                const dist = p1.distanceTo(p2);
                                if (dist > maxDist) maxDist = dist;
                            }
                        }

                        let flightTime = (maxDist / SPEED) * 1000;
                        if (flightTime < 1000) flightTime = 1000; // minimum 1s flight time
                        step.transitionTime = Math.round(flightTime);
                    }

                    step.time = prevStep.time + prevStep.holdTime + (step.transitionTime || 1000);
                    currentTime = step.time + step.holdTime;
                }
            }
        }

        this.basePlaybackTime = startTime;
        this.playbackTime = 0; // It will be synced via update() or seek()
    }

    getGroupConfigForStep(groupName, step) {
        if (!step) return null;
        const resolvedName = String(groupName || 'Default').split('/')[0];
        if (!step.groupConfigs) step.groupConfigs = {};
        if (!step.groupConfigs[resolvedName]) {
            // Lazy initialize group config using step parameters
            step.groupConfigs[resolvedName] = {
                transitionMode: step.transitionMode || 'transform',
                transitionMoveEffect: step.transitionMoveEffect || step.transitionEffect || 'none',
                transitionMoveSpeed: step.transitionMoveSpeed !== undefined ? step.transitionMoveSpeed : 1.0,
                transitionMoveFreq: step.transitionMoveFreq !== undefined ? step.transitionMoveFreq : 1.0,
                transitionLightEffect: step.transitionLightEffect || 'none',
                transitionLightSpeed: step.transitionLightSpeed !== undefined ? step.transitionLightSpeed : 1.0,
                transitionLightFreq: step.transitionLightFreq !== undefined ? step.transitionLightFreq : 1.0,
                transitionSparkleColor: step.transitionSparkleColor || '#ffffff',
                holdMoveEffect: step.holdMoveEffect || 'none',
                holdMoveSpeed: step.holdMoveSpeed !== undefined ? step.holdMoveSpeed : 1.0,
                holdMoveFreq: step.holdMoveFreq !== undefined ? step.holdMoveFreq : 1.0,
                holdLightEffect: step.holdLightEffect || 'none',
                holdLightSpeed: step.holdLightSpeed !== undefined ? step.holdLightSpeed : 1.0,
                holdLightFreq: step.holdLightFreq !== undefined ? step.holdLightFreq : 1.0,
                applyLightEffect: step.applyLightEffect || 'none',
                landingLightEffect: step.landingLightEffect || 'none',
                landingLightSpeed: step.landingLightSpeed !== undefined ? step.landingLightSpeed : 1.0,
                landingLightFreq: step.landingLightFreq !== undefined ? step.landingLightFreq : 1.0,
                center: step.center ? (step.center instanceof THREE.Vector3 ? step.center.clone() : new THREE.Vector3(step.center.x, step.center.y, step.center.z)) : new THREE.Vector3(0, 20, 0)
            };
        }
        
        const cfg = step.groupConfigs[resolvedName];
        if (cfg && cfg.center && !(cfg.center instanceof THREE.Vector3)) {
            cfg.center = new THREE.Vector3(cfg.center.x, cfg.center.y, cfg.center.z);
        }
        return cfg;
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

        const holdProgress = holdTime > 0 ? THREE.MathUtils.clamp((msTime - stepA.time) / holdTime, 0.0, 1.0) : 1.0;

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const count = this.droneSystem.droneMesh.count; // Respect maxDrones cap
        const age = msTime / 1000;

        const fadeA = 1.0 - t;
        const fadeB = t;

        // Helper function to calculate the offset and scale factor of a movement effect
        const getMoveEffectOffset = (effectType, basePos, centerPos, speed, freq, index) => {
            const offset = new THREE.Vector3();
            let scaleFactor = 1.0;
            if (effectType === 'none' || !effectType) return { offset, scaleFactor };

            if (effectType === 'wave') {
                offset.y = Math.sin(age * 3.0 * speed + (index * 0.1)) * 2.0 * freq;
            } else if (effectType === 'swing') {
                offset.x = Math.sin(age * 2.0 * speed + (index * 0.1)) * 2.5 * freq;
            } else if (effectType === 'pulse') {
                scaleFactor = 1.0 + Math.sin(age * Math.PI * 2 * speed + (index * 0.1)) * 0.5 * freq;
            } else if (effectType === 'orbit' || effectType === 'spiral') {
                const toDrone = new THREE.Vector3().subVectors(basePos, centerPos);
                let angle = age * 0.6 * speed;
                let radiusScale = 1.0;

                if (effectType === 'spiral') {
                    const dist = toDrone.length();
                    radiusScale = 1.0 + Math.sin(age * 2.0 * speed - dist * 0.05) * 0.15 * freq;
                    angle += dist * 0.02 * freq;
                }

                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const rx = toDrone.x * cos - toDrone.z * sin;
                const rz = toDrone.x * sin + toDrone.z * cos;

                const rotatedPos = new THREE.Vector3(
                    centerPos.x + rx * radiusScale,
                    basePos.y,
                    centerPos.z + rz * radiusScale
                );
                offset.subVectors(rotatedPos, basePos);
            } else if (effectType === 'expand') {
                const toDrone = new THREE.Vector3().subVectors(basePos, centerPos);
                const pulseScale = 1.0 + Math.sin(age * 3.0 * speed) * 0.2 * freq;
                const expandedPos = new THREE.Vector3(
                    centerPos.x + toDrone.x * pulseScale,
                    basePos.y,
                    centerPos.z + toDrone.z * pulseScale
                );
                offset.subVectors(expandedPos, basePos);
            }

            return { offset, scaleFactor };
        };

        // Helper function to apply light effects smoothly
        const getLightEffectColor = (effectType, baseColor, speed, freq, dummyPos, centerPos, fade, index, sparkleColor) => {
            const col = baseColor.clone();
            if (effectType === 'none' || !effectType || fade <= 0.001) return col;

            if (effectType === 'blackout') {
                return col.setRGB(0, 0, 0);
            } else if (effectType === 'sparkle-spark') {
                const flicker = Math.sin(age * 12.0 * speed + (index * 7.3)) * 0.5 + 0.5;
                const threshold = 1.0 - (freq * 0.3);
                const isSpark = flicker > threshold;
                const sparkCol = sparkleColor || new THREE.Color(1, 1, 1);
                const targetCol = isSpark ? sparkCol.clone() : new THREE.Color(0, 0, 0);
                return col.lerp(targetCol, fade);
            } else if (effectType === 'patch-spark') {
                const patchX = Math.floor(dummyPos.x / 10.0);
                const patchZ = Math.floor(dummyPos.z / 10.0);
                const noise = Math.sin(patchX * 12.9898 + patchZ * 78.233 + age * 6.0 * speed) * 0.5 + 0.5;
                const threshold = 1.0 - (freq * 0.3);
                const isSpark = noise > threshold;
                const sparkCol = sparkleColor || new THREE.Color(1, 1, 1);
                const targetCol = isSpark ? sparkCol.clone() : new THREE.Color(0, 0, 0);
                return col.lerp(targetCol, fade);
            } else if (effectType === 'strobe') {
                const p = Math.sin(age * 15.0 * speed + (index * 0.5));
                const factor = p < 0 ? (1.0 - 0.9 * freq) : 1.0;
                const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
                col.multiplyScalar(blendedFactor);
            } else if (effectType === 'shimmer') {
                const flicker = 1.0 + (Math.random() - 0.5) * 0.8 * freq * Math.sin(age * 10 * speed);
                const factor = Math.max(0, flicker);
                const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
                col.multiplyScalar(blendedFactor);
            } else if (effectType === 'pulse-color') {
                const factor = (1.0 - 0.5 * freq) + (0.5 * freq) * Math.sin(age * Math.PI * 2.0 * speed + (index * 0.1));
                const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
                col.multiplyScalar(blendedFactor);
            } else if (effectType === 'rainbow') {
                const hue = (age * 0.1 * speed + (index * 0.01 * freq)) % 1.0;
                const rainbowCol = new THREE.Color().setHSL(hue, 1.0, 0.5);
                col.lerp(rainbowCol, fade);
            } else if (effectType === 'wave-light') {
                const dist = dummyPos.distanceTo(centerPos);
                const factor = (1.0 - 0.5 * freq) + (0.5 * freq) * Math.sin(age * 5.0 * speed - dist * 0.2);
                const blendedFactor = THREE.MathUtils.lerp(1.0, factor, fade);
                col.multiplyScalar(blendedFactor);
            }

            return col;
        };

        for (let i = 0; i < count; i++) {
            const group = (stepA.particleGroups && stepA.particleGroups[i]) || (stepB.particleGroups && stepB.particleGroups[i]) || 'Default';
            const parentGroup = group.split('/')[0];
            const configA = this.getGroupConfigForStep(parentGroup, stepA);
            const configB = this.getGroupConfigForStep(parentGroup, stepB);

            const defaultCenter = new THREE.Vector3(0, 20, 0);
            const centerA = configA.center || defaultCenter;
            const centerB = configB.center || defaultCenter;
            const currentCenter = new THREE.Vector3().lerpVectors(centerA, centerB, t);

            const posA = stepA.positions[i] || new THREE.Vector3();
            const posB = stepB.positions[i] || posA;

            // Interpolate Hold Move speed and frequency
            const speedMoveA = configA.holdMoveSpeed !== undefined ? configA.holdMoveSpeed : 1.0;
            const speedMoveB = configB.holdMoveSpeed !== undefined ? configB.holdMoveSpeed : 1.0;
            const currentMoveSpeed = THREE.MathUtils.lerp(speedMoveA, speedMoveB, t);

            const freqMoveA = configA.holdMoveFreq !== undefined ? configA.holdMoveFreq : 1.0;
            const freqMoveB = configB.holdMoveFreq !== undefined ? configB.holdMoveFreq : 1.0;
            const currentMoveFreq = THREE.MathUtils.lerp(freqMoveA, freqMoveB, t);

            // Retrieve transition parameters from the destination step B (transitioning to step B)
            const currentTransMoveSpeed = configB.transitionMoveSpeed !== undefined ? configB.transitionMoveSpeed : 1.0;
            const currentTransMoveFreq = configB.transitionMoveFreq !== undefined ? configB.transitionMoveFreq : 1.0;
            const currentTransLightSpeed = configB.transitionLightSpeed !== undefined ? configB.transitionLightSpeed : 1.0;
            const currentTransLightFreq = configB.transitionLightFreq !== undefined ? configB.transitionLightFreq : 1.0;

            // Apply transition mode & effects from the destination step B
            const transMoveEff = configB.transitionMoveEffect || 'none';
            const transLightEff = configB.transitionLightEffect || 'none';
            const mode = configB.transitionMode || 'transform';

            let basePos = new THREE.Vector3();

            if (transMoveEff === 'arc' && t > 0.0 && t < 1.0) {
                basePos.lerpVectors(posA, posB, t);
                const dist = posA.distanceTo(posB);
                const arcHeight = Math.max(8, dist * 0.2) * Math.sin(t * Math.PI);
                basePos.y += arcHeight;
            } else if (transMoveEff === 'spiral' && t > 0.0 && t < 1.0) {
                const relA = new THREE.Vector3().subVectors(posA, centerA);
                const relB = new THREE.Vector3().subVectors(posB, centerB);
                const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
                const spinAngle = (1.0 - t) * Math.PI * 2.0 * (i % 2 === 0 ? 1 : -1) * currentTransMoveSpeed;
                const cos = Math.cos(spinAngle);
                const sin = Math.sin(spinAngle);
                const rx = relPos.x * cos - relPos.z * sin;
                const rz = relPos.x * sin + relPos.z * cos;
                basePos.set(currentCenter.x + rx, currentCenter.y + relPos.y, currentCenter.z + rz);
            } else if (transMoveEff === 'wave-delay' && t > 0.0 && t < 1.0) {
                const delay = (i % 10) * 0.04;
                let localT = (t - delay) / (1.0 - 0.36);
                localT = THREE.MathUtils.clamp(localT, 0.0, 1.0);
                localT = localT * localT * (3 - 2 * localT);
                basePos.lerpVectors(posA, posB, localT);
            } else {
                // Transition modes (transform vs move vs custom)
                if (mode === 'move') {
                    const relA = new THREE.Vector3().subVectors(posA, centerA);
                    const relB = new THREE.Vector3().subVectors(posB, centerB);
                    const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
                    basePos.addVectors(currentCenter, relPos);
                } else if (mode === 'disperse') {
                    basePos.lerpVectors(posA, posB, t);
                    const toDrone = new THREE.Vector3().subVectors(posA, centerA);
                    const dist = toDrone.length();
                    if (dist > 0.001) {
                        toDrone.divideScalar(dist);
                    } else {
                        toDrone.set(Math.sin(i * 1.7), 0, Math.cos(i * 2.3)).normalize();
                    }
                    const fadeTrans = Math.sin(t * Math.PI);
                    const pushStrength = (15.0 + dist * 0.3) * fadeTrans;
                    const noise = new THREE.Vector3(
                        Math.sin(i * 4.3) * 3.0,
                        Math.cos(i * 5.7) * 2.0,
                        Math.sin(i * 7.1) * 3.0
                    ).multiplyScalar(fadeTrans);
                    basePos.addScaledVector(toDrone, pushStrength).add(noise);
                } else if (mode === 'vortex') {
                    const relA = new THREE.Vector3().subVectors(posA, centerA);
                    const relB = new THREE.Vector3().subVectors(posB, centerB);
                    const relPos = new THREE.Vector3().lerpVectors(relA, relB, t);
                    const spinAngle = Math.sin(t * Math.PI) * Math.PI * 3.0 * (i % 2 === 0 ? 1 : -1);
                    const shrinkFactor = 1.0 - Math.sin(t * Math.PI) * 0.4;
                    const cos = Math.cos(spinAngle);
                    const sin = Math.sin(spinAngle);
                    const rx = relPos.x * cos - relPos.z * sin;
                    const rz = relPos.x * sin + relPos.z * cos;
                    basePos.set(
                        currentCenter.x + rx * shrinkFactor,
                        currentCenter.y + relPos.y,
                        currentCenter.z + rz * shrinkFactor
                    );
                } else if (mode === 'cascade') {
                    let maxAy = 1;
                    for (let j = 0; j < count; j++) {
                        const p = stepA.positions[j] || posA;
                        if (p.y > maxAy) maxAy = p.y;
                    }
                    const delay = (posA.y / maxAy) * 0.4;
                    let localT = (t - delay) / (1.0 - delay);
                    localT = THREE.MathUtils.clamp(localT, 0.0, 1.0);
                    const easedT = localT * localT * (3 - 2 * localT);
                    basePos.lerpVectors(posA, posB, easedT);
                } else if (mode === 'helix') {
                    basePos.lerpVectors(posA, posB, t);
                    const fadeTrans = Math.sin(t * Math.PI);
                    const helixRadius = 8.0 * fadeTrans;
                    const angle = t * Math.PI * 4.0 * (i % 2 === 0 ? 1 : -1) + (i * 0.1);
                    basePos.x += Math.cos(angle) * helixRadius;
                    basePos.z += Math.sin(angle) * helixRadius;
                } else {
                    basePos.lerpVectors(posA, posB, t);
                }
            }

            // Apply mathematical effects with smooth transition (fading)
            const droneEffectA = stepA.effects ? (stepA.effects[i] || 'none') : 'none';
            const droneEffectB = stepB.effects ? (stepB.effects[i] || 'none') : 'none';

            const holdMoveEffectA = (configA.holdMoveEffect && configA.holdMoveEffect !== 'none') ? configA.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectA) ? droneEffectA : 'none');
            const holdMoveEffectB = (configB.holdMoveEffect && configB.holdMoveEffect !== 'none') ? configB.holdMoveEffect : (['wave', 'swing', 'pulse'].includes(droneEffectB) ? droneEffectB : 'none');

            // Calculate blended hold movement offsets
            let blendedOffset = new THREE.Vector3();
            let blendedScale = 1.0;

            if (t === 0.0 || t === 1.0) {
                const resA = getMoveEffectOffset(holdMoveEffectA, posA, centerA, speedMoveA, freqMoveA, i);
                const resB = getMoveEffectOffset(holdMoveEffectB, posB, centerB, speedMoveB, freqMoveB, i);

                blendedOffset.addVectors(
                    resA.offset.clone().multiplyScalar(fadeA),
                    resB.offset.clone().multiplyScalar(fadeB)
                );

                blendedScale = (resA.scaleFactor - 1.0) * fadeA + (resB.scaleFactor - 1.0) * fadeB + 1.0;
            }

            // Apply transition movement effect if active (fades in and out during transition)
            const isTransMove = ['wave', 'swing', 'pulse', 'orbit', 'spiral', 'expand'].includes(transMoveEff);
            if (isTransMove && t > 0.0 && t < 1.0) {
                const fadeTrans = Math.sin(t * Math.PI);
                const resTrans = getMoveEffectOffset(transMoveEff, basePos, currentCenter, currentTransMoveSpeed, currentTransMoveFreq, i);
                blendedOffset.add(resTrans.offset.clone().multiplyScalar(fadeTrans));
                blendedScale += (resTrans.scaleFactor - 1.0) * fadeTrans;
            }

            dummy.position.addVectors(basePos, blendedOffset);
            dummy.scale.set(blendedScale, blendedScale, blendedScale);
            dummy.updateMatrix();
            this.droneSystem.droneMesh.mesh.setMatrixAt(i, dummy.matrix);

            // --- ÁP DỤNG HIỆU ỨNG ÁNH SÁNG (LIGHT EFFECT) ---
            const colA = (stepA.colors && stepA.colors[i] !== undefined) ? new THREE.Color(stepA.colors[i]) : new THREE.Color(0xffffff);

            // Apply Landing Color Effect (transition from black to step color colA) during the hold phase
            const landingLightEffA = configA.landingLightEffect || 'none';
            const landingLightSpeed = configA.landingLightSpeed !== undefined ? configA.landingLightSpeed : 1.0;
            const landingLightFreq = configA.landingLightFreq !== undefined ? configA.landingLightFreq : 1.0;

            if (landingLightEffA === 'none' || landingLightEffA === '') {
                color.copy(colA);
            } else {
                const colPrev = new THREE.Color(0, 0, 0);
                const progress = THREE.MathUtils.clamp(holdProgress * landingLightSpeed, 0.0, 1.0);

                if (landingLightEffA === 'radial') {
                    const dist = dummy.position.distanceTo(centerA);
                    const delay = dist * 0.03 * landingLightFreq;
                    const maxDelay = 0.8;
                    const scaledDelay = Math.min(delay, maxDelay);
                    let localT = THREE.MathUtils.clamp((progress * (1.0 + scaledDelay)) - scaledDelay, 0.0, 1.0);
                    localT = localT * localT * (3 - 2 * localT);
                    color.copy(colPrev).lerp(colA, localT);
                } else if (landingLightEffA === 'linear-lr') {
                    const relX = dummy.position.x - centerA.x;
                    const delay = relX * 0.03 * landingLightFreq;
                    const scaledDelay = THREE.MathUtils.clamp(delay, -0.4, 0.4);
                    let localT = THREE.MathUtils.clamp(progress - scaledDelay, 0.0, 1.0);
                    localT = localT * localT * (3 - 2 * localT);
                    color.copy(colPrev).lerp(colA, localT);
                } else if (landingLightEffA === 'linear-rl') {
                    const relX = centerA.x - dummy.position.x;
                    const delay = relX * 0.03 * landingLightFreq;
                    const scaledDelay = THREE.MathUtils.clamp(delay, -0.4, 0.4);
                    let localT = THREE.MathUtils.clamp(progress - scaledDelay, 0.0, 1.0);
                    localT = localT * localT * (3 - 2 * localT);
                    color.copy(colPrev).lerp(colA, localT);
                } else {
                    color.copy(colA);
                }
            }

            // Apply transition light effect if active (Flight Light Eff)
            // Rule: Only active for 95% of flight transition time, remaining 5% is blackout
            if (t > 0.0 && t < 1.0) {
                const isTransLight = ['strobe', 'shimmer', 'pulse-color', 'rainbow', 'wave-light', 'sparkle-spark', 'patch-spark', 'blackout'].includes(transLightEff);
                if (isTransLight) {
                    if (t >= 0.95) {
                        color.setRGB(0, 0, 0);
                    } else {
                        const normT = t / 0.95;
                        const fadeTrans = Math.sin(normT * Math.PI);
                        const transSparkleColor = new THREE.Color(configA.transitionSparkleColor || '#ffffff');
                        const transCol = getLightEffectColor(transLightEff, color, currentTransLightSpeed, currentTransLightFreq, dummy.position, currentCenter, fadeTrans, i, transSparkleColor);
                        color.copy(transCol);

                        // Smoothly fade out the entire color to black as it approaches t = 0.95 (end of transition light)
                        if (transLightEff !== 'blackout') {
                            const fadeToBlack = Math.cos(normT * Math.PI * 0.5);
                            color.multiplyScalar(Math.max(0, fadeToBlack));
                        }
                    }
                }
            }

            this.droneSystem.droneMesh.mesh.setColorAt(i, color);
        }

        this.droneSystem.droneMesh.updateBuffers();
    }
}
