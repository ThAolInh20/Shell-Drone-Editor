import * as THREE from 'three';

export class DroneEntity {
    constructor(id) {
        this.id = id;
        this.position = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        
        // Visual properties
        this.color = new THREE.Color(0xffffff);
        this.baseColor = new THREE.Color(0xffffff);
        this.intensity = 1.0;
        this.size = 1.0;
        
        // Motion parameters
        this.damping = 2.0; // The higher the faster it arrives
        this.hasArrived = false;
    }

    setTarget(targetVector) {
        this.targetPosition.copy(targetVector);
    }

    setColor(colorHex) {
        this.color.setHex(colorHex);
    }

    update(deltaTime) {
        // Realistic Drone Motion: Steering "Arrival" behavior
        const desiredVelocity = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        const distance = desiredVelocity.length();
        
        const maxSpeed = 18.0; // units per sec
        const maxForce = 12.0; // acceleration
        const slowingRadius = 30.0; // start slowing down when within 30 units
        
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
        } else {
            this.hasArrived = true;
            this.position.copy(this.targetPosition);
            this.velocity.set(0, 0, 0);
        }
        
        // Add a pulsing glow effect similar to firework particles
        const pulse = 1.0 + 0.3 * Math.sin(performance.now() * 0.005 + this.id);
        
        // Clone baseColor to prevent modifying the original color, multiply by intensity and pulse
        this.color.copy(this.baseColor).multiplyScalar(this.intensity * pulse);
    }
}
