import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.instance = new THREE.Scene();
    
    // Set a very dark blue/black color for night sky void
    this.instance.background = new THREE.Color(0x050510);
    this.instance.fog = new THREE.FogExp2(0x050510, 0.002);
    
    // Create subtle background stars to give the void some reference points
    const starGeo = new THREE.BufferGeometry();
    const starCounts = 1500;
    const starPositions = new Float32Array(starCounts * 3);
    const starColors = new Float32Array(starCounts * 3);

    for (let i = 0; i < starCounts; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 900 + Math.random() * 100;
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = Math.sin(phi) * Math.sin(theta) * radius;
      const z = Math.cos(phi) * radius;

      starPositions[i * 3 + 0] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const colorVariation = Math.random() * 0.2;
      const baseColor = new THREE.Color(0xeeeeff).lerp(new THREE.Color(0xfff8e5), colorVariation);
      starColors[i * 3 + 0] = baseColor.r;
      starColors[i * 3 + 1] = baseColor.g;
      starColors[i * 3 + 2] = baseColor.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.instance.add(stars);

    // Moon reference point in the sky
    const moonGeometry = new THREE.SphereGeometry(24, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xececec, emissive: 0xf8f4ff });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(0, 300, -700);
    this.instance.add(moon);

    const moonGlow = new THREE.PointLight(0xececec, 0.35, 1200, 2);
    moonGlow.position.copy(moon.position);
    this.instance.add(moonGlow);

    // Optional: subtle ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.instance.add(ambientLight);

    // Add checkerboard floor
    this.addCheckerboardFloor();

    // Add launch pad for fireworks
    this.addLaunchPad();
  }

  addLaunchPad() {
    const padSize = 120;
    const padGeometry = new THREE.PlaneGeometry(padSize, padSize);
    const padTexture = new THREE.CanvasTexture(this.createLaunchPadCanvas(512, 512));
    padTexture.wrapS = THREE.RepeatWrapping;
    padTexture.wrapT = THREE.RepeatWrapping;
    padTexture.repeat.set(1, 1);

    const padMaterial = new THREE.MeshBasicMaterial({ map: padTexture, side: THREE.DoubleSide });
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -49.5;
    pad.position.z = 0;
    this.instance.add(pad);

    const padBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(padSize, padSize)),
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, opacity: 0.9, transparent: true })
    );
    padBorder.rotation.x = -Math.PI / 2;
    padBorder.position.copy(pad.position);
    this.instance.add(padBorder);
  }

  createLaunchPadCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#222238';
    ctx.fillRect(0, 0, width, height);

    const tileSize = width / 8;
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        ctx.fillStyle = ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) ? '#f5f5f5' : '#1a1a2e';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH', width / 2, height / 2 + 16);

    return canvas;
  }

  addCheckerboardFloor() {
    const floorSize = 2000;
    const tileSize = 50;
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const tilePixels = canvas.width / (floorSize / tileSize);
    for (let x = 0; x < canvas.width; x += tilePixels) {
      for (let y = 0; y < canvas.height; y += tilePixels) {
        const isEven = (Math.floor(x / tilePixels) + Math.floor(y / tilePixels)) % 2 === 0;
        ctx.fillStyle = isEven ? '#1a1a2e' : '#0f0f1e';
        ctx.fillRect(x, y, tilePixels, tilePixels);
        
        // Subtle grid lines
        ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tilePixels, tilePixels);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.repeat.set(floorSize / tileSize, floorSize / tileSize);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -50;
    floor.receiveShadow = true;
    this.instance.add(floor);
  }
}
