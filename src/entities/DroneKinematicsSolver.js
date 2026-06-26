import * as THREE from 'three';

export class DroneKinematicsSolver {
    static solve(drone, deltaTime) {
        // Realistic Drone Motion: Steering "Arrival" behavior
        const desiredVelocity = new THREE.Vector3().subVectors(drone.targetPosition, drone.position);
        const distance = desiredVelocity.length();
        
        const maxSpeed = drone.motionProfile.maxSpeed || 18.0;
        const maxForce = drone.motionProfile.maxForce || 12.0;
        const slowingRadius = drone.motionProfile.slowingRadius || 30.0;
        
        if (distance > 0.05 || drone.velocity.length() > 0.05) {
            drone.hasArrived = false;
            let speed = maxSpeed;
            if (distance < slowingRadius) {
                speed = maxSpeed * (distance / slowingRadius);
            }
            if (distance > 0) {
                desiredVelocity.normalize().multiplyScalar(speed);
            } else {
                desiredVelocity.set(0, 0, 0);
            }
            
            const steering = new THREE.Vector3().subVectors(desiredVelocity, drone.velocity);
            
            if (steering.length() > maxForce) {
                steering.normalize().multiplyScalar(maxForce);
            }
            
            drone.velocity.add(steering.multiplyScalar(deltaTime));
            drone.position.add(drone.velocity.clone().multiplyScalar(deltaTime));
            
            // Add oscillation if moving
            if (drone.motionProfile.oscillation) {
                const osc = drone.motionProfile.oscillation;
                const time = performance.now() * 0.001;
                const offset = Math.sin(time * osc.frequency + drone.phaseOffset) * osc.amplitude * deltaTime;
                
                if (osc.type === 'vertical') {
                    drone.position.y += offset;
                } else if (osc.type === 'horizontal') {
                    drone.position.x += offset;
                    drone.position.z += offset;
                }
            }
        } else {
            drone.hasArrived = true;
            drone.position.copy(drone.targetPosition);
            drone.velocity.set(0, 0, 0);
        }
    }
}
