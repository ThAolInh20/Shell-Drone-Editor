import * as THREE from 'three';
import { DroneEntity } from '../entities/DroneEntity.js';
import { InstancedDroneMesh } from '../render/InstancedDroneMesh.js';
import { ArrivalColorSystem } from '../effects/arrival/ArrivalColorSystem.js';
import { DRONE_ZONE_CONFIG } from '../config/droneZone.js';

export class DroneSystem {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.drones = [];
        this.maxDrones = 10000;
        this.droneMesh = new InstancedDroneMesh(this.maxDrones);
        
        // Create Performance Zone (Local Space)
        this.performanceZone = new THREE.Group();
        this.performanceZone.name = "DronePerformanceZone";
        this.performanceZone.position.copy(DRONE_ZONE_CONFIG.position);
        this.performanceZone.rotation.copy(DRONE_ZONE_CONFIG.rotation);
        this.performanceZone.scale.copy(DRONE_ZONE_CONFIG.scale);
        
        // Add drones mesh to the zone
        this.performanceZone.add(this.droneMesh.mesh);
        
        // Add Visual Helpers
        if (DRONE_ZONE_CONFIG.showHelpers) {
            const { width, height, depth } = DRONE_ZONE_CONFIG;
            
            // Ground grid for the zone
            const gridHelper = new THREE.GridHelper(width, 20, 0x00ffff, 0x00ffff);
            gridHelper.material.opacity = 0.2;
            gridHelper.material.transparent = true;
            this.performanceZone.add(gridHelper);
            
            // Bounding box for the zone
            const boxGeo = new THREE.BoxGeometry(width, height, depth);
            // Translate the box so its bottom rests on the zone's local origin (y=0)
            boxGeo.translate(0, height / 2, 0); 
            const edges = new THREE.EdgesGeometry(boxGeo);
            const boxHelper = new THREE.LineSegments(
                edges, 
                new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.15 })
            );
            this.performanceZone.add(boxHelper);
        }
        
        // Add Zone to World Scene
        if (this.sceneManager && this.sceneManager.instance) {
            this.sceneManager.instance.add(this.performanceZone);
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
