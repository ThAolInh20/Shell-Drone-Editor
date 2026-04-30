import * as THREE from 'three';

export class DroneFormationFactory {
    static circle(count, params = {}) {
        const radius = params.radius || 10;
        const y = params.y || 20;
        const fill = params.fill || 'solid';
        const positions = [];
        
        if (fill === 'solid') {
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            for (let i = 0; i < count; i++) {
                const r = radius * Math.sqrt(i / count);
                const theta = i * goldenAngle;
                positions.push(new THREE.Vector3(
                    Math.cos(theta) * r,
                    y,
                    Math.sin(theta) * r
                ));
            }
        } else {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                positions.push(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    y,
                    Math.sin(angle) * radius
                ));
            }
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

    static sphere(count, params = {}) {
        const radius = params.radius || 20;
        const yOffset = params.y || 25;
        const fill = params.fill || 'solid';
        const positions = [];
        
        if (fill === 'solid') {
            for (let i = 0; i < count; i++) {
                const u = Math.random();
                const v = Math.random();
                const w = Math.random();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);
                const r = Math.cbrt(w) * radius;
                positions.push(new THREE.Vector3(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.cos(phi) + yOffset,
                    r * Math.sin(phi) * Math.sin(theta)
                ));
            }
        } else {
            const phi = Math.PI * (3 - Math.sqrt(5));
            for (let i = 0; i < count; i++) {
                const y = 1 - (i / (count - 1)) * 2;
                const r = Math.sqrt(1 - y * y);
                const theta = phi * i;
                positions.push(new THREE.Vector3(
                    Math.cos(theta) * r * radius,
                    y * radius + yOffset,
                    Math.sin(theta) * r * radius
                ));
            }
        }
        return positions;
    }

    static cube(count, params = {}) {
        const spacing = params.spacing || 5;
        const yOffset = params.y || 15;
        const fill = params.fill || 'solid';
        const positions = [];
        
        if (fill === 'solid') {
            const side = Math.ceil(Math.pow(count, 1/3));
            const offset = ((side - 1) * spacing) / 2;
            for (let i = 0; i < count; i++) {
                const x = i % side;
                const y = Math.floor(i / side) % side;
                const z = Math.floor(i / (side * side));
                positions.push(new THREE.Vector3(
                    x * spacing - offset,
                    y * spacing + yOffset,
                    z * spacing - offset
                ));
            }
        } else {
            const side = Math.ceil(Math.sqrt(count / 6));
            const size = side * spacing;
            const offset = size / 2;
            
            for (let i = 0; i < count; i++) {
                const face = i % 6;
                const u = (Math.random() - 0.5) * size;
                const v = (Math.random() - 0.5) * size;
                let x = 0, y = 0, z = 0;
                if (face === 0) { x = offset; y = u; z = v; }
                else if (face === 1) { x = -offset; y = u; z = v; }
                else if (face === 2) { y = offset; x = u; z = v; }
                else if (face === 3) { y = -offset; x = u; z = v; }
                else if (face === 4) { z = offset; x = u; y = v; }
                else if (face === 5) { z = -offset; x = u; y = v; }
                positions.push(new THREE.Vector3(x, y + yOffset, z));
            }
        }
        return positions;
    }

    static cylinder(count, params = {}) {
        const radius = params.radius || 15;
        const height = params.height || 30;
        const yOffset = params.y || 15;
        const fill = params.fill || 'solid';
        const positions = [];
        
        if (fill === 'solid') {
            for (let i = 0; i < count; i++) {
                const r = radius * Math.sqrt(Math.random());
                const theta = Math.random() * 2 * Math.PI;
                const y = Math.random() * height;
                positions.push(new THREE.Vector3(
                    Math.cos(theta) * r,
                    y + yOffset,
                    Math.sin(theta) * r
                ));
            }
        } else {
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const angle = t * Math.PI * 2 * 10;
                const y = t * height;
                positions.push(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    y + yOffset,
                    Math.sin(angle) * radius
                ));
            }
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

    static star(count, params = {}) {
        const radius = params.radius || 20;
        const innerRadius = radius * 0.4;
        const y = params.y || 20;
        const fill = params.fill || 'solid';
        const positions = [];
        
        const vertices = [];
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? radius : innerRadius;
            vertices.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
        }

        if (fill === 'solid') {
            for (let i = 0; i < count; i++) {
                const triIndex = i % 10;
                const v1 = vertices[triIndex];
                const v2 = vertices[(triIndex + 1) % 10];
                
                let r1 = Math.random();
                let r2 = Math.random();
                if (r1 + r2 > 1) {
                    r1 = 1 - r1;
                    r2 = 1 - r2;
                }
                const px = v1.x * r1 + v2.x * r2;
                const pz = v1.y * r1 + v2.y * r2;
                positions.push(new THREE.Vector3(px, y, pz));
            }
        } else {
            let perimeter = 0;
            for (let i = 0; i < 10; i++) {
                const next = (i + 1) % 10;
                perimeter += vertices[i].distanceTo(vertices[next]);
            }

            let currentDist = 0;
            let vIndex = 0;
            let nextVIndex = 1;
            let segmentLength = vertices[0].distanceTo(vertices[1]);
            
            for (let i = 0; i < count; i++) {
                const targetDist = (i / count) * perimeter;
                
                while (targetDist > currentDist + segmentLength) {
                    currentDist += segmentLength;
                    vIndex = (vIndex + 1) % 10;
                    nextVIndex = (vIndex + 1) % 10;
                    segmentLength = vertices[vIndex].distanceTo(vertices[nextVIndex]);
                }
                
                const t = (targetDist - currentDist) / segmentLength;
                const x = THREE.MathUtils.lerp(vertices[vIndex].x, vertices[nextVIndex].x, t);
                const z = THREE.MathUtils.lerp(vertices[vIndex].y, vertices[nextVIndex].y, t);
                
                positions.push(new THREE.Vector3(x, y, z));
            }
        }
        return positions;
    }

    static text(count, params = {}) {
        const text = params.text || "DRONE";
        const spacing = params.spacing || 15;
        const yOffset = params.y || 20;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 200;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const filledPixels = [];
        
        for (let py = 0; py < canvas.height; py += 3) {
            for (let px = 0; px < canvas.width; px += 3) {
                const index = (py * canvas.width + px) * 4;
                if (imageData[index] > 128) {
                    filledPixels.push({x: px, y: py});
                }
            }
        }
        
        const positions = [];
        if (filledPixels.length === 0) return this.grid(count, params);
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of filledPixels) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        for (let i = 0; i < count; i++) {
            const pixelIndex = Math.floor((i / count) * filledPixels.length);
            const px = filledPixels[pixelIndex];
            
            const worldX = (px.x - centerX) * spacing * 0.05;
            const worldY = (centerY - px.y) * spacing * 0.05 + yOffset;
            const worldZ = 0;
            
            const jitter = (count > filledPixels.length) ? (Math.random() - 0.5) * spacing * 0.02 : 0;
            positions.push(new THREE.Vector3(worldX + jitter, worldY + jitter, worldZ + jitter));
        }
        
        return positions;
    }

    static createFormation(type, count, params) {
        let positions;
        switch (type) {
            case 'circle': positions = this.circle(count, params); break;
            case 'grid': positions = this.grid(count, params); break;
            case 'line': positions = this.line(count, params); break;
            case 'wave': positions = this.wave(count, params); break;
            case 'sphere': positions = this.sphere(count, params); break;
            case 'cube': positions = this.cube(count, params); break;
            case 'cylinder': positions = this.cylinder(count, params); break;
            case 'star': positions = this.star(count, params); break;
            case 'text': positions = this.text(count, params); break;
            default: positions = this.grid(count, params); break;
        }
        
        if (params && params.variation) {
            positions = this.addVariation(positions, params.variation);
        }
        
        return positions;
    }
}
