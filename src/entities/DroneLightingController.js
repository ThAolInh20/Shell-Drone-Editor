export class DroneLightingController {
    static update(drone, deltaTime, transitionSystem, arrivalSystem) {
        // Color and Animation Logic
        if (!drone.hasArrived) {
            transitionSystem.apply(drone, drone.transitionColorConfig, performance.now() * 0.001);
            drone.timeSinceArrival = 0;
            drone.wasArrived = false;
        } else {
            drone.timeSinceArrival += deltaTime;
            
            const isLit = arrivalSystem.apply(drone, drone.arrivalColorConfig, drone.timeSinceArrival);
            
            if (isLit && !drone.wasArrived) {
                drone.wasArrived = true;
                if (drone.arrivalAnimationConfig) {
                    drone.animationLayer.applyAnimation(
                        drone.arrivalAnimationConfig.type, 
                        drone.arrivalAnimationConfig.params
                    );
                }
            }
        }
        
        // Add a pulsing glow effect similar to firework particles
        let pulse = 1.0 + 0.3 * Math.sin(performance.now() * 0.005 + drone.phaseOffset);
        
        if (drone.motionProfile.blink) {
            const blinkState = Math.sin(performance.now() * 0.001 * drone.motionProfile.blink.rate + drone.phaseOffset);
            if (blinkState < 0) {
                pulse = drone.motionProfile.blink.minOpacity;
            }
        }
        
        drone.animationLayer.update(deltaTime);
        pulse *= drone.animationIntensityMultiplier;
        
        // Clone baseColor to prevent modifying the original color, multiply by intensity and pulse
        drone.color.copy(drone.baseColor).multiplyScalar(drone.intensity * pulse);
    }
}
