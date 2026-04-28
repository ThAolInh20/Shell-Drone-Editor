import * as THREE from 'three';

export class TransitionColorSystem {
    static apply(drone, config, time) {
        if (!config) return;
        
        const type = config.type || "solid";
        const baseColor = new THREE.Color(config.color || "#ffffff");
        
        if (type === "solid") {
            drone.baseColor.copy(baseColor);
        } else if (type === "strobe") {
            const freq = config.params?.frequency || 10;
            const isVisible = Math.sin(time * freq + drone.phaseOffset) > 0;
            if (isVisible) {
                drone.baseColor.copy(baseColor);
            } else {
                drone.baseColor.setHex(0x000000);
            }
        } else {
            drone.baseColor.copy(baseColor);
        }
    }
}
