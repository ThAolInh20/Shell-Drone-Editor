import * as THREE from 'three';

import num0 from '../output/text/numbers/num-0.json';
import num1 from '../output/text/numbers/num-1.json';
import num2 from '../output/text/numbers/num-2.json';
import num3 from '../output/text/numbers/num-3.json';
import num4 from '../output/text/numbers/num-4.json';
import num5 from '../output/text/numbers/num-5.json';
import num6 from '../output/text/numbers/num-6.json';
import num7 from '../output/text/numbers/num-7.json';
import num8 from '../output/text/numbers/num-8.json';
import num9 from '../output/text/numbers/num-9.json';

import charA from '../output/text/texts/char-A.json';
import charB from '../output/text/texts/char-B.json';
import charC from '../output/text/texts/char-C.json';
import charD from '../output/text/texts/char-D.json';
import charE from '../output/text/texts/char-E.json';
import charF from '../output/text/texts/char-F.json';
import charG from '../output/text/texts/char-G.json';
import charH from '../output/text/texts/char-H.json';
import charI from '../output/text/texts/char-I.json';
import charJ from '../output/text/texts/char-J.json';
import charK from '../output/text/texts/char-K.json';
import charL from '../output/text/texts/char-L.json';
import charM from '../output/text/texts/char-M.json';
import charN from '../output/text/texts/char-N.json';
import charO from '../output/text/texts/char-O.json';
import charP from '../output/text/texts/char-P.json';
import charQ from '../output/text/texts/char-Q.json';
import charR from '../output/text/texts/char-R.json';
import charS from '../output/text/texts/char-S.json';
import charT from '../output/text/texts/char-T.json';
import charU from '../output/text/texts/char-U.json';
import charV from '../output/text/texts/char-V.json';
import charW from '../output/text/texts/char-W.json';
import charX from '../output/text/texts/char-X.json';
import charY from '../output/text/texts/char-Y.json';
import charZ from '../output/text/texts/char-Z.json';

const characterMap = {
    '0': num0, '1': num1, '2': num2, '3': num3, '4': num4,
    '5': num5, '6': num6, '7': num7, '8': num8, '9': num9,
    'A': charA, 'B': charB, 'C': charC, 'D': charD, 'E': charE,
    'F': charF, 'G': charG, 'H': charH, 'I': charI, 'J': charJ,
    'K': charK, 'L': charL, 'M': charM, 'N': charN, 'O': charO,
    'P': charP, 'Q': charQ, 'R': charR, 'S': charS, 'T': charT,
    'U': charU, 'V': charV, 'W': charW, 'X': charX, 'Y': charY,
    'Z': charZ
};

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

    static triangle(count, params = {}) {
        const radius = params.radius || 20;
        const y = params.y || 20;
        const fill = params.fill || 'solid';
        const positions = [];
        
        // 3 Vertices of equilateral triangle in XZ plane
        const v0 = new THREE.Vector2(0, radius);
        const v1 = new THREE.Vector2(-radius * Math.sqrt(3) / 2, -radius / 2);
        const v2 = new THREE.Vector2(radius * Math.sqrt(3) / 2, -radius / 2);
        const vertices = [v0, v1, v2];

        if (fill === 'solid') {
            const u_phi = 0.6180339887;
            const v_phi = 0.7548776662;
            for (let i = 0; i < count; i++) {
                let r1 = (i * u_phi) % 1;
                let r2 = (i * v_phi) % 1;
                if (r1 + r2 > 1) {
                    r1 = 1 - r1;
                    r2 = 1 - r2;
                }
                const px = v0.x * (1 - r1 - r2) + v1.x * r1 + v2.x * r2;
                const pz = v0.y * (1 - r1 - r2) + v1.y * r1 + v2.y * r2;
                positions.push(new THREE.Vector3(px, y, pz));
            }
        } else {
            const edgeLength = v0.distanceTo(v1);
            const perimeter = edgeLength * 3;
            
            for (let i = 0; i < count; i++) {
                const targetDist = (i / count) * perimeter;
                const segment = Math.floor(targetDist / edgeLength) % 3;
                const t = (targetDist % edgeLength) / edgeLength;
                
                const start = vertices[segment];
                const end = vertices[(segment + 1) % 3];
                
                const x = start.x + (end.x - start.x) * t;
                const z = start.y + (end.y - start.y) * t;
                
                positions.push(new THREE.Vector3(x, y, z));
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
            const u_phi = 0.6180339887;
            const v_phi = 0.7548776662;
            const w_phi = 0.5698402910;
            for (let i = 0; i < count; i++) {
                const u = (i * u_phi) % 1;
                const v = (i * v_phi) % 1;
                const w = (i * w_phi) % 1;
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
            const sideLength = Math.ceil(Math.sqrt(count / 6));
            const size = sideLength * spacing;
            const offset = size / 2;
            const perFace = Math.ceil(count / 6);
            const gridSide = Math.ceil(Math.sqrt(perFace));
            const step = size / gridSide;
            
            for (let i = 0; i < count; i++) {
                const face = Math.floor(i / perFace);
                if (face >= 6) continue;
                const faceIndex = i % perFace;
                const gx = faceIndex % gridSide;
                const gy = Math.floor(faceIndex / gridSide);
                
                // Center the grid
                const u = (gx * step) - (size / 2) + (step / 2);
                const v = (gy * step) - (size / 2) + (step / 2);
                
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
            const u_phi = 0.6180339887;
            const v_phi = 0.7548776662;
            const w_phi = 0.5698402910;
            for (let i = 0; i < count; i++) {
                const r = radius * Math.sqrt((i * u_phi) % 1);
                const theta = ((i * v_phi) % 1) * 2 * Math.PI;
                const y = ((i * w_phi) % 1) * height;
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
        const starPoints = params.starPoints || 5;
        const innerRadius = radius * 0.4;
        const y = params.y || 20;
        const fill = params.fill || 'solid';
        const positions = [];
        
        const numVertices = starPoints * 2;
        const vertices = [];
        for (let i = 0; i < numVertices; i++) {
            const angle = (i * Math.PI) / starPoints - Math.PI / 2;
            const r = i % 2 === 0 ? radius : innerRadius;
            vertices.push(new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r));
        }

        if (fill === 'solid') {
            const u_phi = 0.6180339887;
            const v_phi = 0.7548776662;
            for (let i = 0; i < count; i++) {
                const triIndex = i % numVertices;
                const v1 = vertices[triIndex];
                const v2 = vertices[(triIndex + 1) % numVertices];
                
                let r1 = (i * u_phi) % 1;
                let r2 = (i * v_phi) % 1;
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
            for (let i = 0; i < numVertices; i++) {
                const next = (i + 1) % numVertices;
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
                    vIndex = (vIndex + 1) % numVertices;
                    nextVIndex = (vIndex + 1) % numVertices;
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
        
        const chars = text.split('');
        const charGap = 2; // spacing between chars in local units
        const spaceWidth = 6; // width of space char
        
        let currentX = 0;
        const allPoints = [];
        
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const upperChar = char.toUpperCase();
            
            if (char === ' ' || !characterMap[upperChar]) {
                currentX += spaceWidth + charGap;
                continue;
            }
            
            const data = characterMap[upperChar];
            let minX = Infinity;
            let maxX = -Infinity;
            for (const pt of data) {
                if (pt.x !== undefined) {
                    if (pt.x < minX) minX = pt.x;
                    if (pt.x > maxX) maxX = pt.x;
                }
            }
            
            if (minX === Infinity) {
                currentX += spaceWidth + charGap;
                continue;
            }
            
            const charWidth = maxX - minX;
            
            for (const pt of data) {
                if (pt.x !== undefined && pt.y !== undefined) {
                    allPoints.push({
                        x: pt.x - minX + currentX,
                        y: pt.y,
                        r: pt.r !== undefined ? pt.r : 255,
                        g: pt.g !== undefined ? pt.g : 255,
                        b: pt.b !== undefined ? pt.b : 0
                    });
                }
            }
            
            currentX += charWidth + charGap;
        }
        
        if (allPoints.length === 0) {
            return this.grid(count, params);
        }
        
        let minTotalX = Infinity, maxTotalX = -Infinity;
        let minTotalY = Infinity, maxTotalY = -Infinity;
        
        for (const pt of allPoints) {
            if (pt.x < minTotalX) minTotalX = pt.x;
            if (pt.x > maxTotalX) maxTotalX = pt.x;
            if (pt.y < minTotalY) minTotalY = pt.y;
            if (pt.y > maxTotalY) maxTotalY = pt.y;
        }
        
        const centerTotalX = (minTotalX + maxTotalX) / 2;
        const centerTotalY = (minTotalY + maxTotalY) / 2;
        
        const positions = [];
        
        for (let i = 0; i < count; i++) {
            const pointIndex = Math.floor((i / count) * allPoints.length);
            const pt = allPoints[pointIndex];
            
            const worldX = (pt.x - centerTotalX) * spacing * 0.05;
            const worldY = (pt.y - centerTotalY) * spacing * 0.05 + yOffset;
            const worldZ = 0;
            
            const jitterX = (count > allPoints.length) ? (((i * 0.618033) % 1) - 0.5) * spacing * 0.04 : 0;
            const jitterY = (count > allPoints.length) ? (((i * 0.754877) % 1) - 0.5) * spacing * 0.04 : 0;
            const jitterZ = (count > allPoints.length) ? (((i * 0.569840) % 1) - 0.5) * spacing * 0.04 : 0;
            
            const pos = new THREE.Vector3(worldX + jitterX, worldY + jitterY, worldZ + jitterZ);
            pos.color = new THREE.Color(`rgb(${pt.r}, ${pt.g}, ${pt.b})`);
            positions.push(pos);
        }
        
        return positions;
    }

    static bezier(count, params = {}) {
        const p0 = params.p0 || new THREE.Vector3(-30, 20, 0);
        const p1 = params.p1 || new THREE.Vector3(0, 35, 0);
        const p2 = params.p2 || new THREE.Vector3(30, 20, 0);
        
        if (count <= 0) return [];
        if (count === 1) return [p0.clone()];
        
        const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
        return curve.getSpacedPoints(count - 1);
    }

    static generateLineBetweenPoints(posA, posB, colorA, colorB, count) {
        const positions = [];
        const colors = [];
        
        const cA = new THREE.Color(colorA);
        const cB = new THREE.Color(colorB);

        for (let i = 0; i < count; i++) {
            // Mathematically perfect even spacing: divides the segment into (count + 1) equal intervals
            const t = (i + 1) / (count + 1);
            const pos = new THREE.Vector3().lerpVectors(posA, posB, t);

            positions.push(pos);
            colors.push(new THREE.Color().lerpColors(cA, cB, t));
        }

        return { positions, colors };
    }

    static generateBoxBetweenPoints(posA, posB, colorA, colorB, count, isSolid) {
        const positions = [];
        const colors = [];
        
        const cA = new THREE.Color(colorA);
        const cB = new THREE.Color(colorB);

        // Opposite diagonal corners
        const x1 = posA.x, y1 = posA.y, z1 = posA.z;
        const x2 = posB.x, y2 = posB.y, z2 = posB.z;

        // Bounding box bounds
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);

        if (isSolid) {
            // Distribute drones evenly using a solid distribution
            // Low-discrepancy Weyl sequence for solid uniform filling inside the volume
            const u_phi = 0.6180339887;
            const v_phi = 0.7548776662;
            const w_phi = 0.5698402910;

            for (let i = 0; i < count; i++) {
                // Clamp fractions to keep coordinates strictly away from anchor corners/edges
                const u = 0.1 + ((i * u_phi) % 1) * 0.8;
                const v = 0.1 + ((i * v_phi) % 1) * 0.8;
                const w = 0.1 + ((i * w_phi) % 1) * 0.8;

                const x = minX + u * (maxX - minX);
                const y = minY + v * (maxY - minY);
                const z = minZ + w * (maxZ - minZ);

                const pos = new THREE.Vector3(x, y, z);
                positions.push(pos);

                // Color interpolation based on projection along vector AB
                const ab = new THREE.Vector3().subVectors(posB, posA);
                const ap = new THREE.Vector3().subVectors(pos, posA);
                const abLenSq = ab.lengthSq();
                const t = abLenSq > 0.001 ? THREE.MathUtils.clamp(ap.dot(ab) / abLenSq, 0, 1) : 0.5;

                colors.push(new THREE.Color().lerpColors(cA, cB, t));
            }
        } else {
            // Wireframe Mode: distribute particles along the 12 edges of the bounding box
            // 8 corners
            const corners = [
                new THREE.Vector3(minX, minY, minZ), // 0
                new THREE.Vector3(maxX, minY, minZ), // 1
                new THREE.Vector3(maxX, maxY, minZ), // 2
                new THREE.Vector3(minX, maxY, minZ), // 3
                new THREE.Vector3(minX, minY, maxZ), // 4
                new THREE.Vector3(maxX, minY, maxZ), // 5
                new THREE.Vector3(maxX, maxY, maxZ), // 6
                new THREE.Vector3(minX, maxY, maxZ)  // 7
            ];

            // 12 edges linking corners
            const edges = [
                [0, 1], [1, 2], [2, 3], [3, 0], // front face
                [4, 5], [5, 6], [6, 7], [7, 4], // back face
                [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
            ];

            const edgeLengths = edges.map(([idx1, idx2]) => corners[idx1].distanceTo(corners[idx2]));
            
            // Filter non-degenerate active edges
            const activeEdges = [];
            for (let i = 0; i < edges.length; i++) {
                if (edgeLengths[i] >= 0.01) {
                    activeEdges.push({
                        start: corners[edges[i][0]],
                        end: corners[edges[i][1]],
                        length: edgeLengths[i]
                    });
                }
            }

            if (activeEdges.length === 0) {
                // Degenerate box: falls back to simple line spawner
                const lineData = this.generateLineBetweenPoints(posA, posB, colorA, colorB, count);
                return lineData;
            }

            // Distribute count proportionally among active edges
            const totalLength = activeEdges.reduce((sum, e) => sum + e.length, 0);
            let allocatedCount = 0;
            const edgeCounts = activeEdges.map(e => {
                const fraction = (e.length / totalLength) * count;
                const base = Math.floor(fraction);
                allocatedCount += base;
                return {
                    edge: e,
                    base: base,
                    remainder: fraction - base,
                    finalCount: base
                };
            });

            // Distribute remaining count to largest remainders
            let remaining = count - allocatedCount;
            if (remaining > 0) {
                edgeCounts.sort((a, b) => b.remainder - a.remainder);
                for (let i = 0; i < remaining; i++) {
                    edgeCounts[i].finalCount += 1;
                }
            }

            // Spawning strictly inside each edge with perfect even spacing
            for (const item of edgeCounts) {
                const finalCount = item.finalCount;
                if (finalCount <= 0) continue;

                const start = item.edge.start;
                const end = item.edge.end;

                for (let j = 0; j < finalCount; j++) {
                    // Mathematically perfect even spacing along the edge segment: (j + 1) / (finalCount + 1)
                    const t = (j + 1) / (finalCount + 1);
                    const pos = new THREE.Vector3().lerpVectors(start, end, t);

                    positions.push(pos);

                    // Color interpolation based on projection along line AB
                    const ab = new THREE.Vector3().subVectors(posB, posA);
                    const ap = new THREE.Vector3().subVectors(pos, posA);
                    const abLenSq = ab.lengthSq();
                    const cT = abLenSq > 0.001 ? THREE.MathUtils.clamp(ap.dot(ab) / abLenSq, 0, 1) : 0.5;

                    colors.push(new THREE.Color().lerpColors(cA, cB, cT));
                }
            }
        }

        return { positions, colors };
    }

    static generateVolumeFromGroup(srcPositions, srcColors, volumeType, copiesCount, params) {
        const positions = [];
        const colors = [];

        if (srcPositions.length === 0 || copiesCount <= 0) {
            return { positions, colors };
        }

        // Calculate centroid of the original group
        const centroid = new THREE.Vector3();
        for (const p of srcPositions) {
            centroid.add(p);
        }
        centroid.divideScalar(srcPositions.length);

        if (volumeType === 'cylinder') {
            const maxAngle = params.maxAngle || 360;
            const spiralOffset = params.spiralOffset || 0;

            for (let c = 1; c <= copiesCount; c++) {
                // Perfect even spacing angle distribution around Y axis of centroid
                const angleRad = THREE.MathUtils.degToRad((c / (copiesCount + 1)) * maxAngle);
                
                for (let i = 0; i < srcPositions.length; i++) {
                    const originalPos = srcPositions[i];
                    
                    // Relative coordinates to the center of rotation
                    const relPos = new THREE.Vector3().subVectors(originalPos, centroid);
                    
                    // Rotation matrix around Y axis
                    const rotatedX = relPos.x * Math.cos(angleRad) - relPos.z * Math.sin(angleRad);
                    const rotatedZ = relPos.x * Math.sin(angleRad) + relPos.z * Math.cos(angleRad);
                    
                    const finalPos = new THREE.Vector3(
                        centroid.x + rotatedX,
                        originalPos.y + c * spiralOffset,
                        centroid.z + rotatedZ
                    );

                    positions.push(finalPos);
                    colors.push(srcColors[i].clone());
                }
            }
        } else if (volumeType === 'radial') {
            // Radial Circle Layout: copies arranged along a circle centered at (0, y, 0), keeping shape perfectly rigid
            const rotCenter = new THREE.Vector3(0, centroid.y, 0);
            const distToCenter = centroid.distanceTo(rotCenter);

            // Automatically use distance to center if params.radius is 0, undefined, null or empty
            let radius = params.radius;
            if (radius === undefined || radius === null || radius === 0 || isNaN(radius)) {
                radius = distToCenter;
            }

            // Fallback for groups already at the center of the workspace
            if (radius < 0.5) {
                radius = 10;
            }

            const rotateOutward = params.rotateOutward !== false;
            const maxAngle = params.maxAngle || 360;
            const originalAngle = Math.atan2(centroid.z - rotCenter.z, centroid.x - rotCenter.x);

            for (let c = 1; c <= copiesCount; c++) {
                const angleDiffDeg = (c / (copiesCount + 1)) * maxAngle;
                const angleDiffRad = THREE.MathUtils.degToRad(angleDiffDeg);
                const angleRad = originalAngle + angleDiffRad;

                for (let i = 0; i < srcPositions.length; i++) {
                    const originalPos = srcPositions[i];
                    const relPos = new THREE.Vector3().subVectors(originalPos, centroid);

                    let finalPos;
                    if (rotateOutward) {
                        // Rigid rotation around the workspace center (0, y, 0)
                        const relToRotCenter = new THREE.Vector3().subVectors(originalPos, rotCenter);
                        const rotatedX = relToRotCenter.x * Math.cos(angleDiffRad) - relToRotCenter.z * Math.sin(angleDiffRad);
                        const rotatedZ = relToRotCenter.x * Math.sin(angleDiffRad) + relToRotCenter.z * Math.cos(angleDiffRad);
                        
                        finalPos = new THREE.Vector3(
                            rotCenter.x + rotatedX,
                            originalPos.y,
                            rotCenter.z + rotatedZ
                        );
                    } else {
                        // Pure translation along the circle centered at rotCenter with calculated radius
                        const copyCentroid = new THREE.Vector3(
                            rotCenter.x + radius * Math.cos(angleRad),
                            centroid.y,
                            rotCenter.z + radius * Math.sin(angleRad)
                        );
                        finalPos = new THREE.Vector3().addVectors(relPos, copyCentroid);
                        finalPos.y = originalPos.y; // Keep Y height
                    }

                    positions.push(finalPos);
                    colors.push(srcColors[i].clone());
                }
            }
        } else {
            // Cube / Linear Grid Stack offsets
            const offsetX = params.offsetX || 0;
            const offsetY = params.offsetY || 5;
            const offsetZ = params.offsetZ || 0;

            for (let c = 1; c <= copiesCount; c++) {
                for (let i = 0; i < srcPositions.length; i++) {
                    const originalPos = srcPositions[i];
                    const finalPos = new THREE.Vector3(
                        originalPos.x + c * offsetX,
                        originalPos.y + c * offsetY,
                        originalPos.z + c * offsetZ
                    );

                    positions.push(finalPos);
                    colors.push(srcColors[i].clone());
                }
            }
        }

        return { positions, colors };
    }

    static createFormation(type, count, params) {
        let positions;
        switch (type) {
            case 'circle': positions = this.circle(count, params); break;
            case 'triangle': positions = this.triangle(count, params); break;
            case 'grid': positions = this.grid(count, params); break;
            case 'line': positions = this.line(count, params); break;
            case 'bezier': positions = this.bezier(count, params); break;
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
