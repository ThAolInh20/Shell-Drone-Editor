import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.instance = new THREE.Scene();
    this.baseSkyColor = new THREE.Color(0x050510);
    this.baseFogDensity = 0.002;
    this.baseAmbientIntensity = 0.1;
    this.baseHemisphereIntensity = 0.08;
    
    // Set a very dark blue/black color for night sky void
    this.instance.background = this.baseSkyColor.clone();
    this.instance.fog = new THREE.FogExp2(this.baseSkyColor.clone(), this.baseFogDensity);
    
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
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.baseAmbientIntensity);
    this.instance.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x5d6ea8, 0x080c18, this.baseHemisphereIntensity);
    this.instance.add(this.hemisphereLight);

    // Add checkerboard floor
    this.addCheckerboardFloor();

    // Add launch pad for fireworks
    this.addLaunchPad();
  }

  addLaunchPad() {
    const padSize = 120;
    const padBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(padSize, padSize)),
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, opacity: 0.9, transparent: true })
    );
    padBorder.rotation.x = -Math.PI / 2;
    padBorder.position.set(0, -49.5, 0);
    this.instance.add(padBorder);
  }

  addCheckerboardFloor() {
    const floorSize = 2000;
    const tileSize = 50;
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.5;
    const radial = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width * 0.75);
    radial.addColorStop(0, '#11142a');
    radial.addColorStop(0.5, '#0b0f1f');
    radial.addColorStop(1, '#060910');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add tiny luminance noise so the floor feels alive without stealing focus.
    const noiseDots = 1400;
    for (let i = 0; i < noiseDots; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = 0.015 + Math.random() * 0.025;
      const size = Math.random() < 0.85 ? 1 : 2;
      ctx.fillStyle = `rgba(180, 200, 255, ${alpha})`;
      ctx.fillRect(x, y, size, size);
    }

    // Soft concentric rings keep spatial readability for movement without hard checker lines.
    ctx.strokeStyle = 'rgba(140, 165, 220, 0.06)';
    ctx.lineWidth = 1.2;
    const rings = 6;
    for (let i = 1; i <= rings; i++) {
      const radius = (canvas.width * 0.12) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
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
