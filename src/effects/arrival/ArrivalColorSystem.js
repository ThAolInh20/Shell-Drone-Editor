import * as THREE from 'three';

export class ArrivalColorSystem {
    // Computes the delay (in seconds) for each drone to light up when it arrives.
    static computeDelays(drones, config) {
        const delays = new Float32Array(drones.length);
        if (!config || config.type === "instant") {
            return delays; // All 0
        }
        
        if (config.type === "sequential") {
            const delayPerDrone = config.params?.delayPerDrone || 0.05;
            for (let i = 0; i < drones.length; i++) {
                delays[i] = i * delayPerDrone;
            }
        } else if (config.type === "radialSpread") {
            const speed = config.params?.speed || 50.0; // units per second
            // Calculate center of formation
            const center = new THREE.Vector3();
            for (let i = 0; i < drones.length; i++) {
                center.add(drones[i].targetPosition);
            }
            center.divideScalar(drones.length);
            
            for (let i = 0; i < drones.length; i++) {
                const dist = drones[i].targetPosition.distanceTo(center);
                delays[i] = dist / Math.max(speed, 1.0);
            }
        }
        
        return delays;
    }
    
    // Evaluates if the drone should light up and applies color.
    // Returns true if the drone is fully lit (delay passed).
    static apply(drone, config, timeSinceArrival) {
        if (!config) return false;
        
        // If the drone hasn't waited its specific delay, it's not lit yet
        if (timeSinceArrival < drone.arrivalDelay) {
            return false;
        }
        
        // Drone is fully arrived and lit up
        const targetColor = new THREE.Color(config.color || "#ffffff");
        
        // Optional: fade-in over a short duration
        const fadeInDuration = 0.2;
        const timeLit = timeSinceArrival - drone.arrivalDelay;
        
        if (timeLit < fadeInDuration) {
            const t = timeLit / fadeInDuration;
            // Interpolate from black to target color
            drone.baseColor.setHex(0x000000).lerp(targetColor, t);
        } else {
            drone.baseColor.copy(targetColor);
        }
        
        return true; // Indicates it is lit
    }
}
