import * as THREE from 'three';
import { DroneEntity } from '../entities/DroneEntity.js';
import { InstancedDroneMesh } from '../render/InstancedDroneMesh.js';
import { ArrivalColorSystem } from '../effects/arrival/ArrivalColorSystem.js';

export class DroneSystem {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.drones = [];
        this.maxDrones = 2000;
        this.droneMesh = new InstancedDroneMesh(this.maxDrones);
        
        if (this.sceneManager && this.sceneManager.instance) {
            this.sceneManager.instance.add(this.droneMesh.mesh);
        }
    }

    createDrones(count) {
        this.drones = [];
        const actualCount = Math.min(count, this.maxDrones);
        
        // Default formation: grid on the ground
        const gridCols = Math.ceil(Math.sqrt(actualCount));
        const spacing = 15;
        const offsetX = (gridCols * spacing) / 2;
        const offsetZ = (Math.ceil(actualCount / gridCols) * spacing) / 2;

        for (let i = 0; i < actualCount; i++) {
            const drone = new DroneEntity(i);
            
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            
            // Set initial start position
            const startPos = new THREE.Vector3(
                col * spacing - offsetX,
                0, // on ground
                row * spacing - offsetZ
            );
            
            drone.position.copy(startPos);
            drone.targetPosition.copy(startPos);
            
            this.drones.push(drone);
        }
        
        this.droneMesh.setCount(actualCount);
    }

    applyFormat(positions, formatConfig) {
        const count = Math.min(this.drones.length, positions.length);
        
        // Set target positions first so ArrivalColorSystem can compute distances
        for (let i = 0; i < count; i++) {
            this.drones[i].setTarget(positions[i]);
            this.drones[i].setMotionProfile(formatConfig.motion || 'smooth');
        }
        
        // Compute arrival delays based on the new target positions
        const delays = ArrivalColorSystem.computeDelays(this.drones.slice(0, count), formatConfig.arrivalColor);
        
        // Apply the format to all drones with their specific delay
        for (let i = 0; i < count; i++) {
            this.drones[i].setFormat(formatConfig, delays[i]);
        }
    }

    triggerAnimation(animationType, params = {}, duration = 0) {
        for (let i = 0; i < this.drones.length; i++) {
            this.drones[i].animationLayer.applyAnimation(animationType, params, duration);
        }
    }

    update(deltaTime) {
        if (this.drones.length === 0) return;

        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            drone.update(deltaTime);
            
            this.droneMesh.updateInstance(
                i, 
                drone.position, 
                drone.rotation,
                drone.scale,
                drone.color
            );
        }
        
        this.droneMesh.updateBuffers();
    }

    isFormationComplete() {
        if (this.drones.length === 0) return true;
        // Require 70% of drones to arrive to consider formation complete
        let arrivedCount = 0;
        for (let i = 0; i < this.drones.length; i++) {
            if (this.drones[i].hasArrived) arrivedCount++;
        }
        return arrivedCount / this.drones.length >= 0.70;
    }
}
