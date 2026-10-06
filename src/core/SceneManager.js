import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { globalEventBus } from './EventBus.js';
import { SkyDome } from '../environment/SkyDome.js';
import { DistantMountains } from '../environment/DistantMountains.js';
import { PlanarReflector } from '../environment/PlanarReflector.js';
import { WaterSurface } from '../environment/WaterSurface.js';
import { LaunchBarge } from '../environment/LaunchBarge.js';
import { RiverPropsManager } from '../environment/RiverPropsManager.js';

export class SceneManager {
  constructor(eventBus = null) {
    this.instance = new THREE.Scene();
    this.baseSkyColor = new THREE.Color(0x02020a);
    this.baseFogDensity = 0.0015;
    this.baseAmbientIntensity = 0.12;
    this.baseHemisphereIntensity = 0.08;
    this.eventSubscriptions = [];
    this.eventBus = eventBus || globalEventBus;

    // Set background and subtle atmospheric fog
    this.instance.background = this.baseSkyColor.clone();
    this.instance.fog = new THREE.FogExp2(
      new THREE.Color(0x060c1d),
      this.baseFogDensity
    );

    // Initialize 3D Sky Dome with twinkling starfield
    this.skyDome = new SkyDome({
      radius: 1400,
      topColor: 0x02020a,
      bottomColor: 0x070e24,
      starCount: 2200
    });
    this.instance.add(this.skyDome.group);

    // Initialize Distant Mountains Silhouette
    this.distantMountains = new DistantMountains({
      radius: 850,
      segments: 128,
      baseY: -20,
      maxHeight: 160
    });
    this.instance.add(this.distantMountains.group);

    // Initialize Floating Launch Barges on the lake
    this.launchBarge = new LaunchBarge({
      eventBus: this.eventBus
    });
    this.instance.add(this.launchBarge.group);

    // Initialize River Props (Floating lanterns and boats)
    this.riverProps = new RiverPropsManager();
    this.instance.add(this.riverProps.group);

    // Initialize Planar Reflector for water surface
    this.planarReflector = new PlanarReflector({
      waterY: 0.0,
      resolutionScale: 0.5
    });

    // Initialize Water Surface (Lake Plane with dynamic wave reflection shader)
    this.waterSurface = new WaterSurface({
      planarReflector: this.planarReflector,
      size: 3500,
      waterY: 0.0
    });
    this.instance.add(this.waterSurface.mesh);

    // Subtle ambient light
    this.ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.baseAmbientIntensity
    );
    this.instance.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(
      0x5d6ea8,
      0x080c18,
      this.baseHemisphereIntensity
    );
    this.instance.add(this.hemisphereLight);

    // Add launch pad for fireworks
    this.launchPadGroup = new THREE.Group();
    this.launchPadGroup.visible = false; // Hidden by default, synced with TimelineEditor
    this.instance.add(this.launchPadGroup);
    // this.addLaunchPad();

    this.eventSubscriptions.push(
      this.eventBus.on('timeline:toggle', (visible) => {
        this.launchPadGroup.visible = visible;
      })
    );

    // // Add burst height guide lines
    // this.addBurstHeightGuides();
  }

  update(deltaTime) {
    if (this.skyDome) {
      this.skyDome.update(deltaTime);
    }
    if (this.launchBarge) {
      this.launchBarge.update(deltaTime);
    }
    if (this.riverProps) {
      this.riverProps.update(deltaTime);
    }
    if (this.waterSurface) {
      this.waterSurface.update(deltaTime);
    }
  }

  renderReflection(renderer, mainCamera) {
    if (this.planarReflector) {
      this.planarReflector.update(
        renderer,
        this.instance,
        mainCamera
      );
    }
  }

  onResize(width, height) {
    if (this.planarReflector) {
      this.planarReflector.setSize(width, height);
    }
    if (this.waterSurface) {
      this.waterSurface.setResolution(width, height);
    }
  }

  setMoonDay(day) {
    const d = Math.max(1, Math.min(30, parseInt(day, 10) || 15));
    this.moonDay = d;

    if (this.skyDome) {
      this.skyDome.setMoonDay(d);
    }

    const phi = ((d - 1) / 29.0) * (Math.PI * 2.0);
    const phaseValue = (1.0 - Math.cos(phi)) * 0.5;

    // Dynamic environmental space lighting scaled to soft 70% level
    if (this.ambientLight) {
      this.ambientLight.intensity = this.baseAmbientIntensity + phaseValue * 0.07;
    }
    if (this.hemisphereLight) {
      this.hemisphereLight.intensity = this.baseHemisphereIntensity + phaseValue * 0.05;
    }
    if (this.instance.fog) {
      const darkFog = new THREE.Color(0x050a17);
      const moonFog = new THREE.Color(0x081326);
      this.instance.fog.color.copy(darkFog).lerp(moonFog, phaseValue * 0.5);
    }
    if (this.waterSurface) {
      this.waterSurface.setMoonIntensity(phaseValue * 0.60);
      if (this.skyDome) {
        this.waterSurface.setMoonDirection(this.skyDome.getMoonWorldPosition());
      }
    }
  }

  setMoonPhase(phase) {
    if (typeof phase === 'number') {
      this.setMoonDay(phase);
      return;
    }

    let targetDay = 15;
    switch (phase) {
      case 'off':
        targetDay = 1;
        break;
      case 'crescent':
        targetDay = 5;
        break;
      case 'half':
        targetDay = 8;
        break;
      case 'gibbous':
        targetDay = 12;
        break;
      case 'full':
      default:
        targetDay = 15;
        break;
    }

    this.setMoonDay(targetDay);
  }

  setMoonPosition(pos) {
    if (this.skyDome) {
      this.skyDome.setMoonPosition(pos);
      if (this.waterSurface) {
        this.waterSurface.setMoonDirection(this.skyDome.getMoonWorldPosition());
      }
    }
  }

  setMoonAltitude(alt) {
    if (this.skyDome) {
      this.skyDome.setMoonAltitude(alt);
      if (this.waterSurface) {
        this.waterSurface.setMoonDirection(this.skyDome.getMoonWorldPosition());
      }
    }
  }

  destroy() {
    if (this.skyDome) {
      this.skyDome.dispose();
    }
    if (this.distantMountains) {
      this.distantMountains.dispose();
    }
    if (this.launchBarge) {
      this.launchBarge.dispose();
    }
    if (this.riverProps) {
      this.riverProps.dispose();
    }
    if (this.waterSurface) {
      this.waterSurface.dispose();
    }
    if (this.planarReflector) {
      this.planarReflector.dispose();
    }
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }

  addLaunchPad() {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2, opacity: 0.9, transparent: true });

    const arcRadius = LAUNCH_ZONE_CONFIG.arcRadius || 360;
    const thickness = LAUNCH_ZONE_CONFIG.depth;
    const innerRadius = arcRadius - thickness / 2;
    const outerRadius = arcRadius + thickness / 2;

    const createRing = (thetaStart, thetaLength) => {
      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64, 1, thetaStart, thetaLength);
      const geometry = new THREE.EdgesGeometry(ringGeo);

      const padBorder = new THREE.LineSegments(geometry, material);
      // Rotate so local Y becomes world -Z
      padBorder.rotation.x = -Math.PI / 2;

      padBorder.position.set(
        LAUNCH_ZONE_CONFIG.center.x,
        LAUNCH_ZONE_CONFIG.center.y + 0.5,
        LAUNCH_ZONE_CONFIG.center.z
      );
      this.launchPadGroup.add(padBorder);
    };

    if (LAUNCH_ZONE_CONFIG.sectors) {
      LAUNCH_ZONE_CONFIG.sectors.forEach(sector => {
        createRing(sector.minAngle, sector.maxAngle - sector.minAngle);
      });
    } else {
      createRing(Math.PI / 4, Math.PI / 2);
    }
  }

  addBurstHeightGuides() {
    const minMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1, opacity: 0.5, transparent: true });
    const maxMaterial = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 1, opacity: 0.3, transparent: true });

    const arcRadius = LAUNCH_ZONE_CONFIG.arcRadius || 360;

    const createGuide = (thetaStart, thetaLength, yPosition, material) => {
      const curve = new THREE.EllipseCurve(
        0, 0,
        arcRadius, arcRadius,
        thetaStart, thetaStart + thetaLength,
        false, 0
      );

      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);

      line.rotation.x = -Math.PI / 2;
      line.position.set(
        LAUNCH_ZONE_CONFIG.center.x,
        yPosition,
        LAUNCH_ZONE_CONFIG.center.z
      );
      this.instance.add(line);
    };

    if (LAUNCH_ZONE_CONFIG.sectors) {
      LAUNCH_ZONE_CONFIG.sectors.forEach(sector => {
        createGuide(sector.minAngle, sector.maxAngle - sector.minAngle, LAUNCH_ZONE_CONFIG.minBurstY, minMaterial);
        createGuide(sector.minAngle, sector.maxAngle - sector.minAngle, LAUNCH_ZONE_CONFIG.maxBurstY, maxMaterial);
      });
    } else {
      createGuide(Math.PI / 4, Math.PI / 2, LAUNCH_ZONE_CONFIG.minBurstY, minMaterial);
      createGuide(Math.PI / 4, Math.PI / 2, LAUNCH_ZONE_CONFIG.maxBurstY, maxMaterial);
    }
  }

  _createCheckerboardTexture() {
    const floorSize = 2000;
    const tileSize = 50;

    if (typeof document === 'undefined') {
      return null;
    }

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
    return texture;
  }

  addCheckerboardFloor() {
    const floorSize = 2000;
    const texture = this._createCheckerboardTexture();

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

  getBoatTransform(localX = 0, localZ = 0) {
    return this.riverProps
      ? this.riverProps.getLeadBoatTransform(localX, localZ)
      : null;
  }

  setBoatPassengerPos(localX = 0, localZ = 0) {
    if (
      this.riverProps &&
      typeof this.riverProps.setPassengerLocalPos === 'function'
    ) {
      this.riverProps.setPassengerLocalPos(localX, localZ);
    }
  }

  steerBoat(
    deltaX,
    deltaZ,
    speedMultiplier = 1.0
  ) {
    if (this.riverProps && typeof this.riverProps.steerLeadBoat === 'function') {
      this.riverProps.steerLeadBoat(deltaX, deltaZ, speedMultiplier);
    }
  }

  resetBoats() {
    if (this.riverProps && typeof this.riverProps.resetBoats === 'function') {
      this.riverProps.resetBoats();
    }
  }
}
