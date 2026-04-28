import { DroneMotionProfile } from '../entities/DroneMotionProfile.js';

export class DronePropertyFactory {
    static getProfileFromEffect(effectType) {
        if (!effectType) return 'smooth';
        
        switch (effectType.toLowerCase()) {
            case 'flow':
            case 'wave':
                return 'wave';
            case 'strobe':
            case 'white-strobe':
            case 'glitter-strobe':
                return 'strobe';
            case 'falling-leaves':
            case 'ghost':
                return 'swing';
            case 'crackle':
            case 'falling-comets':
                return 'fast';
            default:
                return 'smooth';
        }
    }
    
    static getProfileData(profileName) {
        if (!profileName) return DroneMotionProfile.smooth;
        return DroneMotionProfile[profileName] || DroneMotionProfile.smooth;
    }
}
