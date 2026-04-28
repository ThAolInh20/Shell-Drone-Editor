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
    }

    setTarget(targetVector) {
        this.targetPosition.copy(targetVector);
    }

    setColor(colorHex) {
        this.color.setHex(colorHex);
    }

    update(deltaTime) {
        // Smooth arrival using exponential smoothing
        this.position.lerp(this.targetPosition, this.damping * deltaTime);
        
        // Add a pulsing glow effect similar to firework particles
        const pulse = 1.0 + 0.3 * Math.sin(performance.now() * 0.005 + this.id);
        
        // Clone baseColor to prevent modifying the original color, multiply by intensity and pulse
        this.color.copy(this.baseColor).multiplyScalar(this.intensity * pulse);
    }
}
