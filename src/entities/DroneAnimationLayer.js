import * as THREE from 'three';

export class DroneAnimationLayer {
    constructor(entity) {
        this.entity = entity;
        this.activeAnimations = new Map();
    }

    applyAnimation(type, params = {}, duration = 0) {
        const id = `${type}_${Date.now()}`;
        this.activeAnimations.set(id, {
            type,
            speed: params.speed || 1.0,
            amplitude: params.amplitude || 1.0,
            frequency: params.frequency || 1.0,
            intensity: params.intensity || 1.0,
            duration: duration,
            age: 0,
            id: id
        });
    }

    clearAnimations() {
        this.activeAnimations.clear();
        // Reset base scale and rotation
        this.entity.scale.set(1, 1, 1);
        this.entity.rotation.set(0, 0, 0);
        this.entity.animationIntensityMultiplier = 1.0;
    }

    update(deltaTime) {
        // Reset accumulators
        let scaleMult = 1.0;
        let shimmerMult = 1.0;
        
        // We accumulate rotation directly, but scale/shimmer are multipliers
        const toRemove = [];

        for (const [id, anim] of this.activeAnimations.entries()) {
            anim.age += deltaTime;

            // Handle duration
            if (anim.duration > 0 && anim.age >= anim.duration) {
                toRemove.push(id);
                continue;
            }

            // Apply specific animations
            switch (anim.type) {
                case 'spin':
                    // Spin around Y axis
                    this.entity.rotation.y += anim.speed * deltaTime;
                    // Spin around X/Z a bit for more 3D feel if requested, but Y is good for drones
                    break;
                case 'pulse':
                    // Scale pulsing
                    const pulse = 1.0 + Math.sin(anim.age * anim.frequency * Math.PI * 2 + this.entity.phaseOffset) * anim.amplitude * 0.5;
                    scaleMult *= pulse;
                    break;
                case 'shimmer':
                    // Quick opacity/intensity flickering
                    const flicker = 1.0 + (Math.random() - 0.5) * anim.intensity;
                    shimmerMult *= flicker;
                    break;
            }
        }

        // Clean up finished animations
        for (const id of toRemove) {
            this.activeAnimations.delete(id);
        }

        // Apply final multipliers
        this.entity.scale.set(scaleMult, scaleMult, scaleMult);
        this.entity.animationIntensityMultiplier = shimmerMult;
    }
}
