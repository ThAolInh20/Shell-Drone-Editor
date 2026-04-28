import * as THREE from 'three';
import { DronePropertyFactory } from '../factories/DronePropertyFactory.js';
import { DroneAnimationLayer } from './DroneAnimationLayer.js';
import { TransitionColorSystem } from '../effects/transition/TransitionColorSystem.js';
import { ArrivalColorSystem } from '../effects/arrival/ArrivalColorSystem.js';

export class DroneEntity {
    constructor(id) {
        this.id = id;
        this.position = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        
        this.rotation = new THREE.Euler();
        this.scale = new THREE.Vector3(1, 1, 1);
        
        // Visual properties
        this.color = new THREE.Color(0xffffff);
        this.baseColor = new THREE.Color(0xffffff);
        this.intensity = 1.0;
        this.size = 1.0;
        this.animationIntensityMultiplier = 1.0;
        
        // Motion parameters
        this.damping = 2.0; // The higher the faster it arrives
        this.hasArrived = false;
        this.wasArrived = false;
        this.timeSinceArrival = 0;
        this.arrivalDelay = 0;
        
        this.transitionColorConfig = null;
        this.arrivalColorConfig = null;
        this.arrivalAnimationConfig = null;
        
        this.phaseOffset = Math.random() * Math.PI * 2;
        this.motionProfile = DronePropertyFactory.getProfileData('smooth');
        
        this.animationLayer = new DroneAnimationLayer(this);
    }

    setFormat(formatConfig, delay) {
        this.transitionColorConfig = formatConfig.transitionColor;
        this.arrivalColorConfig = formatConfig.arrivalColor;
        this.arrivalAnimationConfig = formatConfig.arrivalAnimation;
        this.arrivalDelay = delay || 0;
        
        this.timeSinceArrival = 0;
        this.hasArrived = false;
        this.wasArrived = false;
        
        // Reset base color
        this.baseColor.setHex(0x000000);
        // We do not strictly clear animations here because some animations might persist through transitions.
        // Actually, let's clear them so formats start fresh.
        this.animationLayer.clearAnimations();
    }

    setMotionProfile(profileName) {
        this.motionProfile = DronePropertyFactory.getProfileData(profileName);
    }

    setTarget(targetVector) {
        this.targetPosition.copy(targetVector);
    }

    update(deltaTime) {
        // Realistic Drone Motion: Steering "Arrival" behavior
        const desiredVelocity = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = desiredVelocity.length();
        
        const maxSpeed = this.motionProfile.maxSpeed || 18.0;
        const maxForce = this.motionProfile.maxForce || 12.0;
        const slowingRadius = this.motionProfile.slowingRadius || 30.0;
        
        if (distance > 0.05 || this.velocity.length() > 0.05) {
            this.hasArrived = false;
            let speed = maxSpeed;
            if (distance < slowingRadius) {
                speed = maxSpeed * (distance / slowingRadius);
            }
            if (distance > 0) {
                desiredVelocity.normalize().multiplyScalar(speed);
            } else {
                desiredVelocity.set(0, 0, 0);
            }
            
            const steering = new THREE.Vector3().subVectors(desiredVelocity, this.velocity);
            
            if (steering.length() > maxForce) {
                steering.normalize().multiplyScalar(maxForce);
            }
            
            this.velocity.add(steering.multiplyScalar(deltaTime));
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            
            // Add oscillation if moving
            if (this.motionProfile.oscillation) {
                const osc = this.motionProfile.oscillation;
                const time = performance.now() * 0.001;
                const offset = Math.sin(time * osc.frequency + this.phaseOffset) * osc.amplitude * deltaTime;
                
                if (osc.type === 'vertical') {
                    this.position.y += offset;
                } else if (osc.type === 'horizontal') {
                    this.position.x += offset;
                    this.position.z += offset;
                }
            }
        } else {
            this.hasArrived = true;
            this.position.copy(this.targetPosition);
            this.velocity.set(0, 0, 0);
        }
        
        // Color and Animation Logic
        if (!this.hasArrived) {
            TransitionColorSystem.apply(this, this.transitionColorConfig, performance.now() * 0.001);
            this.timeSinceArrival = 0;
            this.wasArrived = false;
        } else {
            this.timeSinceArrival += deltaTime;
            
            const isLit = ArrivalColorSystem.apply(this, this.arrivalColorConfig, this.timeSinceArrival);
            
            if (isLit && !this.wasArrived) {
                this.wasArrived = true;
                if (this.arrivalAnimationConfig) {
                    this.animationLayer.applyAnimation(
                        this.arrivalAnimationConfig.type, 
                        this.arrivalAnimationConfig.params
                    );
                }
            }
        }
        
        // Add a pulsing glow effect similar to firework particles
        let pulse = 1.0 + 0.3 * Math.sin(performance.now() * 0.005 + this.phaseOffset);
        
        if (this.motionProfile.blink) {
            const blinkState = Math.sin(performance.now() * 0.001 * this.motionProfile.blink.rate + this.phaseOffset);
            if (blinkState < 0) {
                pulse = this.motionProfile.blink.minOpacity;
            }
        }
        
        this.animationLayer.update(deltaTime);
        pulse *= this.animationIntensityMultiplier;
        
        // Clone baseColor to prevent modifying the original color, multiply by intensity and pulse
        this.color.copy(this.baseColor).multiplyScalar(this.intensity * pulse);
    }
}
