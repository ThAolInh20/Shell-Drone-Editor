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

    static addVariation(positions, variation) {
        if (!variation || variation <= 0) return positions;
        
        return positions.map(pos => {
            return new THREE.Vector3(
                pos.x + (Math.random() - 0.5) * variation,
                pos.y + (Math.random() - 0.5) * variation,
                pos.z + (Math.random() - 0.5) * variation
            );
        });
    }

    static createFormation(type, count, params) {
        let positions;
        switch (type) {
            case 'circle': positions = this.circle(count, params); break;
            case 'grid': positions = this.grid(count, params); break;
            case 'line': positions = this.line(count, params); break;
            case 'wave': positions = this.wave(count, params); break;
            default: positions = this.grid(count, params); break;
        }
        
        if (params && params.variation) {
            positions = this.addVariation(positions, params.variation);
        }
        
        return positions;
    }
}
