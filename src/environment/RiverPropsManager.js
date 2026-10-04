import * as THREE from 'three';
import { LAYER_REFLECTION } from '../config/layers.js';

export class RiverPropsManager {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'RiverPropsGroup';

    this.maxLanterns = options.maxLanterns || 200;
    this.lanternCount = options.lanternCount !== undefined ? options.lanternCount : 60;
    this.lanternsEnabled = options.lanternsEnabled !== undefined ? options.lanternsEnabled : true;
    this.boatsEnabled = options.boatsEnabled !== undefined ? options.boatsEnabled : true;
    this.driftSpeed = options.driftSpeed !== undefined ? options.driftSpeed : 1.0;

    this.time = 0;
    this.dummy = new THREE.Object3D();

    this.lanternData = [];
    this.boats = [];
    this.passengerLocalPos = {
      x: 0,
      z: 0
    };

    this._initLanterns();
    this._initBoats();

    this.setLayer(LAYER_REFLECTION);
    this.applyVisibility();
  }

  _initLanterns() {
    // 1. Petal Base Geometry (Lotus shaped 8-pointed star base)
    const baseGeo = new THREE.CylinderGeometry(
      1.1,
      0.6,
      0.35,
      8
    );
    const baseMat = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.1,
      bumpScale: 0.05
    });

    this.petalInstancedMesh = new THREE.InstancedMesh(
      baseGeo,
      baseMat,
      this.maxLanterns
    );
    this.petalInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // 2. Candle Flame Geometry (Glowing core)
    const flameGeo = new THREE.SphereGeometry(
      0.42,
      8,
      8
    );
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44
    });

    this.flameInstancedMesh = new THREE.InstancedMesh(
      flameGeo,
      flameMat,
      this.maxLanterns
    );
    this.flameInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const palette = [
      new THREE.Color(0xff4477), // Lotus Pink
      new THREE.Color(0xffaa22), // Warm Amber
      new THREE.Color(0xff3322), // Crimson Red
      new THREE.Color(0xffcc33), // Golden Yellow
      new THREE.Color(0xff88aa), // Rose
      new THREE.Color(0xffeedd)  // Ivory White
    ];

    for (let i = 0; i < this.maxLanterns; i++) {
      const x = -360 + Math.random() * 720;
      const z = 30 + Math.random() * 320;
      const speedMult = 0.7 + Math.random() * 0.6;
      const phase = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 0.4;
      const scale = 0.85 + Math.random() * 0.45;
      const color = palette[Math.floor(Math.random() * palette.length)];

      this.lanternData.push({
        x,
        z,
        baseY: 0.18,
        speedMult,
        phase,
        rotSpeed,
        rotY: Math.random() * Math.PI * 2,
        scale,
        color
      });

      this.petalInstancedMesh.setColorAt(i, color);
    }

    if (this.petalInstancedMesh.instanceColor) {
      this.petalInstancedMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.petalInstancedMesh);
    this.group.add(this.flameInstancedMesh);
  }

  _createBoatModel() {
    const boatGroup = new THREE.Group();

    // Wood materials tailored to traditional oriental pleasure boat
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x94542a,
      roughness: 0.72,
      metalness: 0.05
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x4f2610,
      roughness: 0.82
    });
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x7c421d,
      roughness: 0.85
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xf2e2c2,
      roughness: 0.45
    });
    const latticeMat = new THREE.MeshStandardMaterial({
      color: 0xd6b784,
      roughness: 0.65
    });
    const lanternMat = new THREE.MeshBasicMaterial({
      color: 0xffaa2e
    });

    // 1. Center Main Hull
    const centerHullGeo = new THREE.BoxGeometry(
      14,
      2.2,
      6.2
    );
    const centerHull = new THREE.Mesh(
      centerHullGeo,
      woodMat
    );
    centerHull.position.set(0, 0.9, 0);
    boatGroup.add(centerHull);

    // 2. Wide Sloping Bow (Front Prow)
    const bowHullGeo = new THREE.BoxGeometry(
      10,
      1.9,
      5.8
    );
    const bowHull = new THREE.Mesh(
      bowHullGeo,
      woodMat
    );
    bowHull.position.set(10.2, 1.45, 0);
    bowHull.rotation.z = -0.11;
    boatGroup.add(bowHull);

    // Bow Flat Deck Planks
    const bowDeckGeo = new THREE.BoxGeometry(
      9.6,
      0.22,
      5.6
    );
    const bowDeck = new THREE.Mesh(
      bowDeckGeo,
      deckMat
    );
    bowDeck.position.set(10.2, 2.45, 0);
    bowDeck.rotation.z = -0.11;
    boatGroup.add(bowDeck);

    // Bow Nose Cap
    const bowNoseGeo = new THREE.BoxGeometry(
      1.2,
      0.6,
      5.8
    );
    const bowNose = new THREE.Mesh(
      bowNoseGeo,
      trimMat
    );
    bowNose.position.set(15.0, 2.0, 0);
    boatGroup.add(bowNose);

    // 3. Sloping Stern & High Swept-up Wingtips (Đuôi vuốt nhọn 2 cánh)
    const sternHullGeo = new THREE.BoxGeometry(
      9,
      2.0,
      5.8
    );
    const sternHull = new THREE.Mesh(
      sternHullGeo,
      woodMat
    );
    sternHull.position.set(-9.8, 1.65, 0);
    sternHull.rotation.z = 0.16;
    boatGroup.add(sternHull);

    // Stern Deck Planks
    const sternDeckGeo = new THREE.BoxGeometry(
      8.6,
      0.22,
      5.4
    );
    const sternDeck = new THREE.Mesh(
      sternDeckGeo,
      deckMat
    );
    sternDeck.position.set(-9.8, 2.65, 0);
    sternDeck.rotation.z = 0.16;
    boatGroup.add(sternDeck);

    // Left and Right Swept-up Stern Wing Fins
    const wingGeo = new THREE.BoxGeometry(
      7.0,
      3.2,
      0.35
    );
    const leftWing = new THREE.Mesh(
      wingGeo,
      woodMat
    );
    leftWing.position.set(-13.6, 3.4, -2.8);
    leftWing.rotation.set(0, -0.08, 0.46);
    boatGroup.add(leftWing);

    const rightWing = new THREE.Mesh(
      wingGeo,
      woodMat
    );
    rightWing.position.set(-13.6, 3.4, 2.8);
    rightWing.rotation.set(0, 0.08, 0.46);
    boatGroup.add(rightWing);

    // Wing Trim Accents
    const wingTrimGeo = new THREE.BoxGeometry(
      7.2,
      0.26,
      0.48
    );
    const leftWingTrim = new THREE.Mesh(
      wingTrimGeo,
      trimMat
    );
    leftWingTrim.position.set(-13.6, 4.95, -2.8);
    leftWingTrim.rotation.set(0, -0.08, 0.46);
    boatGroup.add(leftWingTrim);

    const rightWingTrim = new THREE.Mesh(
      wingTrimGeo,
      trimMat
    );
    rightWingTrim.position.set(-13.6, 4.95, 2.8);
    rightWingTrim.rotation.set(0, 0.08, 0.46);
    boatGroup.add(rightWingTrim);

    // Stern Rear Curved Arch Handle
    const rearArchGeo = new THREE.TorusGeometry(
      2.8,
      0.18,
      6,
      16,
      Math.PI * 0.65
    );
    const rearArch = new THREE.Mesh(
      rearArchGeo,
      darkWoodMat
    );
    rearArch.position.set(-14.2, 3.8, 0);
    rearArch.rotation.set(0, Math.PI / 2, 0);
    boatGroup.add(rearArch);

    // Tiller Oar / Rudder Arm
    const tillerGeo = new THREE.CylinderGeometry(
      0.16,
      0.16,
      6.8,
      6
    );
    const tiller = new THREE.Mesh(
      tillerGeo,
      darkWoodMat
    );
    tiller.position.set(-16.8, 0.9, 0);
    tiller.rotation.set(0, 0, 0.72);
    boatGroup.add(tiller);

    // 4. White / Cream Side Accent Trim Strips along Hull
    const sideTrimGeo = new THREE.BoxGeometry(
      27.5,
      0.30,
      0.22
    );
    const leftTrim = new THREE.Mesh(
      sideTrimGeo,
      trimMat
    );
    leftTrim.position.set(0, 2.0, -3.15);
    boatGroup.add(leftTrim);

    const rightTrim = new THREE.Mesh(
      sideTrimGeo,
      trimMat
    );
    rightTrim.position.set(0, 2.0, 3.15);
    boatGroup.add(rightTrim);

    // Lower accent trim line
    const lowerTrimGeo = new THREE.BoxGeometry(
      16.5,
      0.22,
      0.20
    );
    const leftTrimLower = new THREE.Mesh(
      lowerTrimGeo,
      trimMat
    );
    leftTrimLower.position.set(0, 1.3, -3.18);
    boatGroup.add(leftTrimLower);

    const rightTrimLower = new THREE.Mesh(
      lowerTrimGeo,
      trimMat
    );
    rightTrimLower.position.set(0, 1.3, 3.18);
    boatGroup.add(rightTrimLower);

    // 5. Cabin Interior Flooring & Seating
    const cabinFloorGeo = new THREE.BoxGeometry(
      12.6,
      0.2,
      5.6
    );
    const cabinFloor = new THREE.Mesh(
      cabinFloorGeo,
      deckMat
    );
    cabinFloor.position.set(-0.2, 1.85, 0);
    boatGroup.add(cabinFloor);

    // Bench seats inside cabin
    const benchGeo = new THREE.BoxGeometry(
      2.0,
      0.45,
      4.8
    );
    const frontBench = new THREE.Mesh(
      benchGeo,
      darkWoodMat
    );
    frontBench.position.set(3.2, 2.2, 0);
    boatGroup.add(frontBench);

    const rearBench = new THREE.Mesh(
      benchGeo,
      darkWoodMat
    );
    rearBench.position.set(-3.6, 2.2, 0);
    boatGroup.add(rearBench);

    // 6. Cabin Pillars (4 square posts)
    const pillarGeo = new THREE.BoxGeometry(
      0.28,
      3.4,
      0.28
    );
    const pillarCoords = [
      [4.6, 3.4, -2.65],
      [4.6, 3.4, 2.65],
      [-5.2, 3.4, -2.65],
      [-5.2, 3.4, 2.65]
    ];
    pillarCoords.forEach((coord) => {
      const pillar = new THREE.Mesh(
        pillarGeo,
        darkWoodMat
      );
      pillar.position.set(coord[0], coord[1], coord[2]);
      boatGroup.add(pillar);
    });

    // Crossbeams & Extended Bracket Horns
    const beamGeo = new THREE.BoxGeometry(
      0.30,
      0.26,
      6.2
    );
    const frontBeam = new THREE.Mesh(
      beamGeo,
      darkWoodMat
    );
    frontBeam.position.set(4.6, 4.85, 0);
    boatGroup.add(frontBeam);

    const rearBeam = new THREE.Mesh(
      beamGeo,
      darkWoodMat
    );
    rearBeam.position.set(-5.2, 4.85, 0);
    boatGroup.add(rearBeam);

    // Longitudinal roof support purlins
    const purlinGeo = new THREE.BoxGeometry(
      11.8,
      0.26,
      0.28
    );
    const leftPurlin = new THREE.Mesh(
      purlinGeo,
      darkWoodMat
    );
    leftPurlin.position.set(-0.3, 4.85, -2.65);
    boatGroup.add(leftPurlin);

    const rightPurlin = new THREE.Mesh(
      purlinGeo,
      darkWoodMat
    );
    rightPurlin.position.set(-0.3, 4.85, 2.65);
    boatGroup.add(rightPurlin);

    // Bracket Horn Wings (Đầu kèo cong vươn ra)
    const bracketGeo = new THREE.BoxGeometry(
      1.6,
      0.22,
      0.24
    );
    const fBracketL = new THREE.Mesh(
      bracketGeo,
      darkWoodMat
    );
    fBracketL.position.set(4.6, 4.4, -3.3);
    fBracketL.rotation.y = -0.25;
    boatGroup.add(fBracketL);

    const fBracketR = new THREE.Mesh(
      bracketGeo,
      darkWoodMat
    );
    fBracketR.position.set(4.6, 4.4, 3.3);
    fBracketR.rotation.y = 0.25;
    boatGroup.add(fBracketR);

    // 7. Arched Vaulted Canopy Roof (Mái che vòm cong lợp gỗ)
    const roofRadius = 4.8;
    const roofAngle = Math.PI * 0.46;
    const roofArcStart = (Math.PI - roofAngle) * 0.5;
    const roofGeo = new THREE.CylinderGeometry(
      roofRadius,
      roofRadius,
      12.8,
      28,
      1,
      true,
      roofArcStart,
      roofAngle
    );
    roofGeo.rotateZ(Math.PI / 2);

    const roofMesh = new THREE.Mesh(
      roofGeo,
      woodMat
    );
    roofMesh.position.set(-0.3, 3.45, 0);
    boatGroup.add(roofMesh);

    // Roof Top Rim Overhang
    const roofCapGeo = new THREE.BoxGeometry(
      13.0,
      0.25,
      0.45
    );
    const roofCap = new THREE.Mesh(
      roofCapGeo,
      darkWoodMat
    );
    roofCap.position.set(-0.3, 5.86, 0);
    boatGroup.add(roofCap);

    // 8. Traditional Lattice Railings (Lan can hoa văn hai bên)
    const railingGeo = new THREE.BoxGeometry(
      9.6,
      0.85,
      0.12
    );
    const leftRailing = new THREE.Mesh(
      railingGeo,
      latticeMat
    );
    leftRailing.position.set(-0.3, 2.45, -2.7);
    boatGroup.add(leftRailing);

    const rightRailing = new THREE.Mesh(
      railingGeo,
      latticeMat
    );
    rightRailing.position.set(-0.3, 2.45, 2.7);
    boatGroup.add(rightRailing);

    // Arched Top Rails over Lattice
    const archRailGeo = new THREE.TorusGeometry(
      5.2,
      0.12,
      6,
      20,
      Math.PI * 0.44
    );
    const leftArchRail = new THREE.Mesh(
      archRailGeo,
      darkWoodMat
    );
    leftArchRail.position.set(-0.3, 1.6, -2.7);
    leftArchRail.rotation.set(0, 0, Math.PI * 0.28);
    boatGroup.add(leftArchRail);

    const rightArchRail = new THREE.Mesh(
      archRailGeo,
      darkWoodMat
    );
    rightArchRail.position.set(-0.3, 1.6, 2.7);
    rightArchRail.rotation.set(0, 0, Math.PI * 0.28);
    boatGroup.add(rightArchRail);

    // 9. Warm Night Lanterns (Đèn lồng ấm áp trên thuyền)
    const cabinLanternGeo = new THREE.CylinderGeometry(
      0.45,
      0.35,
      0.9,
      8
    );
    const cabinLantern = new THREE.Mesh(
      cabinLanternGeo,
      lanternMat
    );
    cabinLantern.position.set(-0.3, 4.8, 0);
    boatGroup.add(cabinLantern);

    const bowLanternGeo = new THREE.SphereGeometry(
      0.45,
      8,
      8
    );
    const bowLantern = new THREE.Mesh(
      bowLanternGeo,
      lanternMat
    );
    bowLantern.position.set(13.5, 2.9, 0);
    boatGroup.add(bowLantern);

    // 10. Stylized Character Figures on Boat (Người trên thuyền)
    const conicalHatMat = new THREE.MeshStandardMaterial({
      color: 0xd4b87e,
      roughness: 0.85
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd89d78,
      roughness: 0.7
    });
    const robeIndigoMat = new THREE.MeshStandardMaterial({
      color: 0x24364f,
      roughness: 0.8
    });
    const robeCrimsonMat = new THREE.MeshStandardMaterial({
      color: 0x6e2528,
      roughness: 0.8
    });
    const robeTealMat = new THREE.MeshStandardMaterial({
      color: 0x234947,
      roughness: 0.8
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1a1816,
      roughness: 0.9
    });

    // Helper: Create a stylized standing or seated figure
    const createFigure = (config) => {
      const figureGroup = new THREE.Group();

      // Torso / Robe body
      const torsoGeo = new THREE.CylinderGeometry(
        config.torsoTopRadius || 0.35,
        config.torsoBottomRadius || 0.48,
        config.torsoHeight || 1.35,
        8
      );
      const torso = new THREE.Mesh(
        torsoGeo,
        config.robeMat || robeIndigoMat
      );
      torso.position.set(0, (config.torsoHeight || 1.35) * 0.5, 0);
      figureGroup.add(torso);

      // Head
      const headGeo = new THREE.SphereGeometry(
        0.30,
        8,
        8
      );
      const head = new THREE.Mesh(
        headGeo,
        skinMat
      );
      head.position.set(
        0,
        (config.torsoHeight || 1.35) + 0.22,
        0
      );
      figureGroup.add(head);

      // Conical Straw Hat
      if (config.hasConicalHat) {
        const hatGeo = new THREE.ConeGeometry(
          0.82,
          0.38,
          12
        );
        const hat = new THREE.Mesh(
          hatGeo,
          conicalHatMat
        );
        hat.position.set(
          0,
          (config.torsoHeight || 1.35) + 0.44,
          0
        );
        if (config.hatTilt) {
          hat.rotation.z = config.hatTilt;
        }
        figureGroup.add(hat);
      } else if (config.hasHairBun) {
        // Traditional top hair bun
        const bunGeo = new THREE.SphereGeometry(
          0.16,
          6,
          6
        );
        const bun = new THREE.Mesh(
          bunGeo,
          hairMat
        );
        bun.position.set(
          0,
          (config.torsoHeight || 1.35) + 0.46,
          -0.08
        );
        figureGroup.add(bun);
      }

      figureGroup.position.set(
        config.x,
        config.y,
        config.z
      );
      if (config.rotation) {
        figureGroup.rotation.set(
          config.rotation.x || 0,
          config.rotation.y || 0,
          config.rotation.z || 0
        );
      }
      return figureGroup;
    };

    // 1. Boatman / Helmsman standing at Stern near tiller oar
    const sternHelmsman = createFigure({
      x: -11.2,
      y: 2.7,
      z: 0,
      torsoHeight: 1.45,
      torsoTopRadius: 0.38,
      torsoBottomRadius: 0.50,
      robeMat: robeIndigoMat,
      hasConicalHat: true,
      hatTilt: 0.15,
      rotation: {
        z: 0.16
      }
    });
    boatGroup.add(sternHelmsman);

    // 2. Front Lookout standing at Bow Deck watching the sky
    const bowSightseer = createFigure({
      x: 9.8,
      y: 2.5,
      z: 0,
      torsoHeight: 1.4,
      torsoTopRadius: 0.36,
      torsoBottomRadius: 0.48,
      robeMat: robeTealMat,
      hasConicalHat: true,
      hatTilt: -0.15,
      rotation: {
        z: -0.11
      }
    });
    boatGroup.add(bowSightseer);

    // 3. Passenger 1 seated inside cabin enjoying fireworks
    const cabinPassenger1 = createFigure({
      x: 3.2,
      y: 2.3,
      z: 1.15,
      torsoHeight: 1.15,
      torsoTopRadius: 0.32,
      torsoBottomRadius: 0.46,
      robeMat: robeCrimsonMat,
      hasConicalHat: false,
      hasHairBun: true,
      rotation: {
        y: 0.25
      }
    });
    boatGroup.add(cabinPassenger1);

    // 4. Passenger 2 seated inside cabin companion
    const cabinPassenger2 = createFigure({
      x: 3.2,
      y: 2.3,
      z: -1.15,
      torsoHeight: 1.15,
      torsoTopRadius: 0.32,
      torsoBottomRadius: 0.46,
      robeMat: robeIndigoMat,
      hasConicalHat: false,
      hasHairBun: true,
      rotation: {
        y: -0.25
      }
    });
    boatGroup.add(cabinPassenger2);

    // Scale up whole boat model for enhanced presence
    boatGroup.scale.set(1.28, 1.28, 1.28);
    return boatGroup;
  }

  _initBoats() {
    this.boatConfigs = [
      {
        startZ: 85,
        speed: 3.4,
        direction: 1,
        initialX: -280,
        phase: 0.0
      },
      {
        startZ: 160,
        speed: 2.8,
        direction: -1,
        initialX: 260,
        phase: 1.6
      },
      {
        startZ: 235,
        speed: 3.2,
        direction: 1,
        initialX: -80,
        phase: 3.2
      },
      {
        startZ: 310,
        speed: 2.5,
        direction: -1,
        initialX: 140,
        phase: 4.8
      }
    ];

    this.boatsGroup = new THREE.Group();
    this.boatsGroup.name = 'BoatsGroup';

    this.boatConfigs.forEach((cfg) => {
      const model = this._createBoatModel();
      model.position.set(cfg.initialX, 0, cfg.startZ);
      model.rotation.y = cfg.direction > 0 ? 0 : Math.PI;
      this.boatsGroup.add(model);

      this.boats.push({
        model,
        x: cfg.initialX,
        z: cfg.startZ,
        speed: cfg.speed,
        dir: cfg.direction,
        phase: cfg.phase
      });
    });

    this.group.add(this.boatsGroup);
  }

  setLayer(layerIndex) {
    this.group.traverse((obj) => {
      obj.layers.enable(layerIndex);
    });
  }

  setLanternsEnabled(enabled) {
    this.lanternsEnabled = Boolean(enabled);
    this.applyVisibility();
  }

  setLanternsCount(count) {
    this.lanternCount = Math.max(0, Math.min(this.maxLanterns, parseInt(count, 10) || 0));
    this.applyVisibility();
  }

  setBoatsEnabled(enabled) {
    this.boatsEnabled = Boolean(enabled);
    this.applyVisibility();
  }

  setDriftSpeed(speed) {
    this.driftSpeed = Math.max(0.0, parseFloat(speed) || 1.0);
  }

  applyVisibility() {
    if (this.petalInstancedMesh) {
      this.petalInstancedMesh.visible = this.lanternsEnabled && this.lanternCount > 0;
      this.petalInstancedMesh.count = this.lanternsEnabled ? this.lanternCount : 0;
    }
    if (this.flameInstancedMesh) {
      this.flameInstancedMesh.visible = this.lanternsEnabled && this.lanternCount > 0;
      this.flameInstancedMesh.count = this.lanternsEnabled ? this.lanternCount : 0;
    }
    if (this.boatsGroup) {
      this.boatsGroup.visible = this.boatsEnabled;
    }
  }

  update(deltaTime) {
    this.time += deltaTime;

    // 1. Update Floating Lanterns
    if (this.lanternsEnabled && this.lanternCount > 0) {
      const count = Math.min(this.lanternCount, this.lanternData.length);
      const effectiveSpeed = this.driftSpeed * 3.5;

      for (let i = 0; i < count; i++) {
        const item = this.lanternData[i];

        // Drift downstream along X axis with slight sinusoidal Z wobble
        item.x += effectiveSpeed * item.speedMult * deltaTime;
        item.rotY += item.rotSpeed * deltaTime;

        // Wrap around when reaching right river boundary
        if (item.x > 380) {
          item.x = -380 - Math.random() * 40;
          item.z = 30 + Math.random() * 320;
        }

        const zWobble = item.z + Math.sin(this.time * 0.8 + item.phase) * 1.5;
        const yBob = item.baseY + Math.sin(this.time * 2.2 + item.phase) * 0.12;
        const pitch = Math.sin(this.time * 1.8 + item.phase) * 0.05;
        const roll = Math.cos(this.time * 1.4 + item.phase) * 0.05;

        // Base lotus petal matrix
        this.dummy.position.set(item.x, yBob, zWobble);
        this.dummy.rotation.set(pitch, item.rotY, roll);
        this.dummy.scale.set(item.scale, item.scale, item.scale);
        this.dummy.updateMatrix();
        this.petalInstancedMesh.setMatrixAt(i, this.dummy.matrix);

        // Candle flame matrix (with subtle flicker)
        const flameFlicker = 0.85 + Math.sin(this.time * 12.0 + item.phase * 3.0) * 0.25;
        this.dummy.position.set(item.x, yBob + 0.38 * item.scale, zWobble);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(
          item.scale * flameFlicker,
          item.scale * flameFlicker * 1.25,
          item.scale * flameFlicker
        );
        this.dummy.updateMatrix();
        this.flameInstancedMesh.setMatrixAt(i, this.dummy.matrix);
      }

      this.petalInstancedMesh.instanceMatrix.needsUpdate = true;
      this.flameInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Update Boats
    if (this.boatsEnabled && this.boats.length > 0) {
      const boatSpeedScale = this.driftSpeed;

      for (let b = 0; b < this.boats.length; b++) {
        const boat = this.boats[b];
        boat.x += boat.dir * boat.speed * boatSpeedScale * deltaTime;

        // Turn boat around when reaching river boundary
        if (boat.dir > 0 && boat.x >= 450) {
          boat.x = 450;
          boat.dir = -1;
        } else if (boat.dir < 0 && boat.x <= -450) {
          boat.x = -450;
          boat.dir = 1;
        }

        // Smooth rotation turn around
        const targetRotY = boat.dir > 0 ? 0 : Math.PI;
        if (boat.currentRotY === undefined) {
          boat.currentRotY = targetRotY;
        }
        let rotDiff = targetRotY - boat.currentRotY;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        boat.currentRotY += rotDiff * Math.min(1.0, deltaTime * 2.5);

        // Additional physics list and trim caused by passenger weight
        let passengerPitch = 0;
        let passengerRoll = 0;
        let passengerSink = 0;

        if (b === 0 && this.passengerLocalPos) {
          // Walking towards bow dips bow (trim by bow), towards stern dips stern
          passengerPitch = -this.passengerLocalPos.x * 0.0028;
          // Walking towards port/starboard tilts hull (list to side)
          passengerRoll = this.passengerLocalPos.z * 0.0065;
          passengerSink = -0.04;
        }

        const rockPitch = Math.sin(this.time * 1.5 + boat.phase) * 0.04 + passengerPitch;
        const rockRoll = Math.cos(this.time * 1.2 + boat.phase) * 0.05 + passengerRoll;
        const yHeave = -0.15 + Math.sin(this.time * 1.8 + boat.phase) * 0.12 + passengerSink;

        if (boat.model) {
          boat.model.position.set(
            boat.x,
            yHeave,
            boat.z
          );
          boat.model.rotation.set(
            rockPitch,
            boat.currentRotY,
            rockRoll
          );
          boat.model.updateMatrixWorld(true);
        }
      }
    }
  }

  setPassengerLocalPos(x = 0, z = 0) {
    this.passengerLocalPos.x = Math.max(-13.5, Math.min(13.5, x));
    this.passengerLocalPos.z = Math.max(-2.4, Math.min(2.4, z));
  }

  getLeadBoatDeckHeight(localX = 0, localZ = 0) {
    // Physical deck geometry along boat longitudinal axis
    let deckY = 2.0;

    if (localX > 4.5) {
      // Sloping bow prow
      const bowDist = Math.min(9.5, localX - 4.5);
      deckY = 2.0 + bowDist * 0.082;
    } else if (localX < -4.5) {
      // Sloping stern helm deck
      const sternDist = Math.min(9.0, -localX - 4.5);
      deckY = 2.0 + sternDist * 0.098;
    }

    // Slight elevation increase near outer gunwale edge steps
    const absZ = Math.abs(localZ);
    if (absZ > 1.8) {
      const edgeFactor = Math.min(1.0, (absZ - 1.8) / 0.6);
      deckY += edgeFactor * 0.14;
    }

    // Base standing eye level above physical deck planks
    return deckY + 1.62;
  }

  getLeadBoatTransform(localX = 0, localZ = 0) {
    if (!this.boats || this.boats.length === 0) {
      return null;
    }
    const boat = this.boats[0];
    if (!boat.model) {
      return {
        x: boat.x,
        y: 0,
        z: boat.z,
        dir: boat.dir,
        rotation: null
      };
    }

    const clampedX = Math.max(-13.5, Math.min(13.5, localX));
    const clampedZ = Math.max(-2.4, Math.min(2.4, localZ));
    const localDeckEyeY = this.getLeadBoatDeckHeight(clampedX, clampedZ);

    const worldPoint = new THREE.Vector3(
      clampedX,
      localDeckEyeY,
      clampedZ
    );

    boat.model.updateMatrixWorld(true);
    worldPoint.applyMatrix4(boat.model.matrixWorld);

    return {
      x: worldPoint.x,
      y: worldPoint.y,
      z: worldPoint.z,
      localX: clampedX,
      localY: localDeckEyeY,
      localZ: clampedZ,
      boatX: boat.x,
      boatY: boat.model.position.y,
      boatZ: boat.z,
      dir: boat.dir,
      rotation: boat.model.rotation,
      matrixWorld: boat.model.matrixWorld
    };
  }

  steerLeadBoat(
    deltaX,
    deltaZ,
    speedMultiplier = 1.0
  ) {
    if (!this.boats || this.boats.length === 0) {
      return;
    }
    const boat = this.boats[0];
    const steerSpeed = 40.0 * Math.max(0.2, speedMultiplier);

    boat.x += deltaX * steerSpeed;
    boat.z += deltaZ * steerSpeed;

    // Keep boat within river channel boundaries
    boat.z = Math.max(25.0, Math.min(360.0, boat.z));

    // Update cruise direction based on longitudinal steering
    if (deltaX > 0.001) {
      boat.dir = 1;
    } else if (deltaX < -0.001) {
      boat.dir = -1;
    }

    // Wrap smoothly across boundaries
    if (boat.dir > 0 && boat.x > 450) {
      boat.x = -450;
    } else if (boat.dir < 0 && boat.x < -450) {
      boat.x = 450;
    }
  }

  resetBoats() {
    if (!this.boats || this.boats.length === 0 || !this.boatConfigs) {
      return;
    }
    this.boatConfigs.forEach((cfg, index) => {
      const boat = this.boats[index];
      if (boat) {
        boat.x = cfg.initialX;
        boat.z = cfg.startZ;
        boat.dir = cfg.direction;
        boat.speed = cfg.speed;
        boat.phase = cfg.phase;
        if (boat.model) {
          boat.model.position.set(cfg.initialX, 0, cfg.startZ);
          boat.model.rotation.set(0, cfg.direction > 0 ? 0 : Math.PI, 0);
        }
      }
    });
  }

  dispose() {
    if (this.petalInstancedMesh) {
      this.petalInstancedMesh.geometry.dispose();
      this.petalInstancedMesh.material.dispose();
    }
    if (this.flameInstancedMesh) {
      this.flameInstancedMesh.geometry.dispose();
      this.flameInstancedMesh.material.dispose();
    }
    if (this.boatsGroup) {
      this.boatsGroup.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  }
}
