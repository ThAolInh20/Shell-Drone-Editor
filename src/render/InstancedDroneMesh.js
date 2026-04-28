import * as THREE from 'three';

export class InstancedDroneMesh {
    constructor(maxDrones = 2000) {
        this.maxDrones = maxDrones;
        this.count = 0;
        
        const positions = new Float32Array(this.maxDrones * 3);
        const colors = new Float32Array(this.maxDrones * 3);
        
        for (let i = 0; i < this.maxDrones; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 15.0, // Base size, similar to firework particle size
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord) * 2.0;
                if (dist > 1.0) discard;
                
                vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
                vec4 stop1 = vec4(diffuseColor.rgb, 0.4);
                vec4 stop2 = vec4(diffuseColor.rgb, 0.1);
                vec4 stop3 = vec4(diffuseColor.rgb, 0.0);
                
                vec4 gradientColor;
                if (dist < 0.05) {
                    gradientColor = stop0;
                } else if (dist < 0.2) {
                    float t = (dist - 0.05) / (0.2 - 0.05);
                    gradientColor = mix(stop0, stop1, t);
                } else if (dist < 0.5) {
                    float t = (dist - 0.2) / (0.5 - 0.2);
                    gradientColor = mix(stop1, stop2, t);
                } else {
                    float t = (dist - 0.5) / (1.0 - 0.5);
                    gradientColor = mix(stop2, stop3, t);
                }
                
                diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a);
                `
            );
        };

        this.mesh = new THREE.Points(geometry, material);
        this.mesh.frustumCulled = false; // Prevent clipping
        
        this.positionsAttribute = geometry.attributes.position;
        this.colorsAttribute = geometry.attributes.color;
    }

    setCount(count) {
        this.count = Math.min(count, this.maxDrones);
        this.mesh.geometry.setDrawRange(0, this.count);
    }

    updateInstance(index, position, color, size = 1.0) {
        // We use size to potentially scale the point, but PointsMaterial has global size.
        // For individual sizes, we'd need a custom shader attribute.
        // For now, we update position and color.
        
        this.positionsAttribute.setXYZ(index, position.x, position.y, position.z);
        this.colorsAttribute.setXYZ(index, color.r, color.g, color.b);
    }

    updateBuffers() {
        this.positionsAttribute.needsUpdate = true;
        this.colorsAttribute.needsUpdate = true;
    }
}
