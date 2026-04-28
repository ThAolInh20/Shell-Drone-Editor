import * as THREE from 'three';

export class DroneFormationFactory {
    static circle(count, params = {}) {
        const radius = params.radius || 10;
        const y = params.y || 20;
        const positions = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                y,
                Math.sin(angle) * radius
            ));
        }
        return positions;
    }

    static grid(count, params = {}) {
        const rows = params.rows || Math.ceil(Math.sqrt(count));
        const spacing = params.spacing || 2;
        const y = params.y || 15;
        const positions = [];
        
        const cols = Math.ceil(count / rows);
        const offsetX = ((cols - 1) * spacing) / 2;
        const offsetZ = ((rows - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            positions.push(new THREE.Vector3(
                col * spacing - offsetX,
                y,
                row * spacing - offsetZ
            ));
        }
        return positions;
    }

    static line(count, params = {}) {
        const spacing = params.spacing || 2;
        const y = params.y || 10;
        const positions = [];
        
        const offset = ((count - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            positions.push(new THREE.Vector3(
                i * spacing - offset,
                y,
                0
            ));
        }
        return positions;
    }

    static wave(count, params = {}) {
        const spacing = params.spacing || 1.5;
        const amplitude = params.amplitude || 5;
        const frequency = params.frequency || 0.5;
        const y = params.y || 20;
        const positions = [];
        
        const offset = ((count - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            const x = i * spacing - offset;
            positions.push(new THREE.Vector3(
                x,
                y + Math.sin(x * frequency) * amplitude,
                0
            ));
        }
        return positions;
    }

    static createFormation(type, count, params) {
        switch (type) {
            case 'circle': return this.circle(count, params);
            case 'grid': return this.grid(count, params);
            case 'line': return this.line(count, params);
            case 'wave': return this.wave(count, params);
            default: return this.grid(count, params);
        }
    }
}
