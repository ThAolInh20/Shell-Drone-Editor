import * as THREE from 'three';
import { DronePropertyFactory } from '../factories/DronePropertyFactory.js';
import { DroneAnimationLayer } from './DroneAnimationLayer.js';
import { DroneKinematicsSolver } from './DroneKinematicsSolver.js';
import { DroneLightingController } from './DroneLightingController.js';

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

    update(deltaTime, transitionSystem, arrivalSystem) {
        DroneKinematicsSolver.solve(this, deltaTime);
        DroneLightingController.update(this, deltaTime, transitionSystem, arrivalSystem);
    }
}

