import * as THREE from 'three';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';
import { LAYER_REFLECTION } from '../config/layers.js';
import { globalEventBus } from '../core/EventBus.js';

export class LaunchBarge {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.group.name = 'LaunchBargeGroup';
    this.time = 0;
    this.eventBus = options.eventBus || globalEventBus;
    this.instancedMeshes = [];
    this.beacons = [];
    this.muzzleFlashes = [];

    this.idleColor = new THREE.Color(0x060910);
    this.defaultFlashColor = new THREE.Color(0xffa825);

    this._sharedMaterials = this._createSharedMaterials();
    this._sharedGeometries = this._createSharedGeometries();
    this._createContinuousLaunchPier();
    this._createMuzzleFlashPool();
    this._createLiftSparksSystem();
    this._setupEventListeners();
  }

  _createSharedMaterials() {
    return {
      deckMat: new THREE.MeshStandardMaterial({
        color: 0x101520,
        metalness: 0.86,
        roughness: 0.32
      }),
      deckTrimMat: new THREE.MeshStandardMaterial({
        color: 0x222a3a,
        metalness: 0.65,
        roughness: 0.4
      }),
      floatMat: new THREE.MeshStandardMaterial({
        color: 0x080c14,
        metalness: 0.92,
        roughness: 0.2
      }),
      tubeMat: new THREE.MeshStandardMaterial({
        color: 0x1f2736,
        metalness: 0.88,
        roughness: 0.22
      }),
      fanTubeMat: new THREE.MeshStandardMaterial({
        color: 0x283446,
        metalness: 0.9,
        roughness: 0.18
      }),
      cabinMat: new THREE.MeshStandardMaterial({
        color: 0x18202e,
        metalness: 0.8,
        roughness: 0.28
      }),
      solarMat: new THREE.MeshStandardMaterial({
        color: 0x0a1c38,
        metalness: 0.96,
        roughness: 0.12
      }),
      beaconDynamicMat: new THREE.MeshBasicMaterial({
        color: 0xffffff
      }),
      muzzleFlashMat: new THREE.MeshBasicMaterial({
        color: 0xffb833,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    };
  }

  _createSharedGeometries() {
    return {
      deckGeo: new THREE.BoxGeometry(
        16.0,
        1.0,
        14.0
      ),
      deckTrimGeo: new THREE.BoxGeometry(
        16.2,
        0.12,
        14.2
      ),
      floatGeo: new THREE.CylinderGeometry(
        0.9,
        0.9,
        15.8,
        12
      ),
      tubeGeo: new THREE.CylinderGeometry(
        0.42,
        0.42,
        2.6,
        8
      ),
      fanTubeGeo: new THREE.CylinderGeometry(
        0.35,
        0.35,
        2.2,
        8
      ),
      cabinGeo: new THREE.BoxGeometry(
        3.2,
        2.2,
        2.5
      ),
      solarGeo: new THREE.BoxGeometry(
        2.0,
        0.08,
        1.4
      ),
      beaconGeo: new THREE.SphereGeometry(
        0.46,
        8,
        8
      ),
      muzzleRingGeo: new THREE.RingGeometry(
        0.2,
        4.8,
        24
      )
    };
  }

  _createContinuousLaunchPier() {
    const center = LAUNCH_ZONE_CONFIG.center;
    const arcRadius = LAUNCH_ZONE_CONFIG.arcRadius || 360;

    const startAngle = -42 * Math.PI / 180;
    const endAngle = 222 * Math.PI / 180;
    const moduleCount = 104;

    const tubesPerModule = 18;
    const fanTubesPerModule = 6;
    const beaconsPerModule = 2;

    const totalDecks = moduleCount;
    const totalFloats = moduleCount * 2;
    const totalTubes = moduleCount * tubesPerModule;
    const totalFanTubes = moduleCount * fanTubesPerModule;
    const totalCabins = 8;
    const totalBeacons = moduleCount * beaconsPerModule;

    const {
      deckGeo,
      deckTrimGeo,
      floatGeo,
      tubeGeo,
      fanTubeGeo,
      cabinGeo,
      solarGeo,
      beaconGeo
    } = this._sharedGeometries;

    const {
      deckMat,
      deckTrimMat,
      floatMat,
      tubeMat,
      fanTubeMat,
      cabinMat,
      solarMat,
      beaconDynamicMat
    } = this._sharedMaterials;

    const deckMesh = new THREE.InstancedMesh(
      deckGeo,
      deckMat,
      totalDecks
    );
    const deckTrimMesh = new THREE.InstancedMesh(
      deckTrimGeo,
      deckTrimMat,
      totalDecks
    );
    const floatMesh = new THREE.InstancedMesh(
      floatGeo,
      floatMat,
      totalFloats
    );
    const tubeMesh = new THREE.InstancedMesh(
      tubeGeo,
      tubeMat,
      totalTubes
    );
    const fanTubeMesh = new THREE.InstancedMesh(
      fanTubeGeo,
      fanTubeMat,
      totalFanTubes
    );
    const cabinMesh = new THREE.InstancedMesh(
      cabinGeo,
      cabinMat,
      totalCabins
    );
    const solarMesh = new THREE.InstancedMesh(
      solarGeo,
      solarMat,
      totalCabins
    );

    this.beaconMesh = new THREE.InstancedMesh(
      beaconGeo,
      beaconDynamicMat,
      totalBeacons
    );
    this.beaconMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(totalBeacons * 3),
      3
    );

    const dummy = new THREE.Object3D();
    let floatIdx = 0;
    let tubeIdx = 0;
    let fanTubeIdx = 0;
    let cabinIdx = 0;
    let beaconIdx = 0;

    for (let i = 0; i < moduleCount; i++) {
      const t = moduleCount > 1
        ? i / (moduleCount - 1)
        : 0.5;
      const angle = startAngle + t * (endAngle - startAngle);

      const x = center.x + arcRadius * Math.cos(angle);
      const z = center.z - arcRadius * Math.sin(angle);
      const y = center.y + 0.5;
      const rotY = angle - Math.PI / 2;

      dummy.position.set(
        x,
        y,
        z
      );
      dummy.rotation.set(
        0,
        rotY,
        0
      );
      dummy.scale.set(
        1,
        1,
        1
      );
      dummy.updateMatrix();
      deckMesh.setMatrixAt(
        i,
        dummy.matrix
      );

      dummy.position.set(
        x,
        y + 0.52,
        z
      );
      dummy.updateMatrix();
      deckTrimMesh.setMatrixAt(
        i,
        dummy.matrix
      );

      const moduleMatrix = dummy.matrix.clone();

      const floatOffsets = [
        -6.0,
        6.0
      ];
      for (const fOffset of floatOffsets) {
        dummy.position.set(
          0,
          -0.4,
          fOffset
        );
        dummy.rotation.set(
          0,
          0,
          Math.PI / 2
        );
        dummy.scale.set(
          1,
          1,
          1
        );
        dummy.updateMatrix();

        const floatWorldMatrix = moduleMatrix.clone().multiply(dummy.matrix);
        floatMesh.setMatrixAt(
          floatIdx++,
          floatWorldMatrix
        );
      }

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          const localX = (c - 2.5) * 2.2;
          const localZ = (r - 1.0) * 2.5;
          const tiltZ = (c - 2.5) * 0.04;

          dummy.position.set(
            localX,
            1.8,
            localZ
          );
          dummy.rotation.set(
            0,
            0,
            tiltZ
          );
          dummy.scale.set(
            1,
            1,
            1
          );
          dummy.updateMatrix();

          const tubeWorldMatrix = moduleMatrix.clone().multiply(dummy.matrix);
          tubeMesh.setMatrixAt(
            tubeIdx++,
            tubeWorldMatrix
          );
        }
      }

      const fanAngles = [
        -0.38,
        -0.22,
        -0.08,
        0.08,
        0.22,
        0.38
      ];
      for (let f = 0; f < fanAngles.length; f++) {
        const isLeft = f < 3;
        const localX = isLeft
          ? -6.6 + f * 0.6
          : 5.4 + (f - 3) * 0.6;
        const localZ = -4.2;

        dummy.position.set(
          localX,
          1.6,
          localZ
        );
        dummy.rotation.set(
          0,
          0,
          fanAngles[f]
        );
        dummy.scale.set(
          1,
          1,
          1
        );
        dummy.updateMatrix();

        const fanWorldMatrix = moduleMatrix.clone().multiply(dummy.matrix);
        fanTubeMesh.setMatrixAt(
          fanTubeIdx++,
          fanWorldMatrix
        );
      }

      if (i % 13 === 6 && cabinIdx < totalCabins) {
        dummy.position.set(
          0,
          1.6,
          -4.5
        );
        dummy.rotation.set(
          0,
          0,
          0
        );
        dummy.scale.set(
          1,
          1,
          1
        );
        dummy.updateMatrix();
        const cabinWorldMatrix = moduleMatrix.clone().multiply(dummy.matrix);
        cabinMesh.setMatrixAt(
          cabinIdx,
          cabinWorldMatrix
        );

        dummy.position.set(
          0,
          2.75,
          -4.5
        );
        dummy.rotation.set(
          -0.25,
          0,
          0
        );
        dummy.updateMatrix();
        const solarWorldMatrix = moduleMatrix.clone().multiply(dummy.matrix);
        solarMesh.setMatrixAt(
          cabinIdx,
          solarWorldMatrix
        );

        cabinIdx++;
      }

      const beaconOffsets = [
        [-7.2, 1.2, -6.2],
        [7.2, 1.2, 6.2]
      ];
      for (const bPos of beaconOffsets) {
        dummy.position.set(
          bPos[0],
          bPos[1],
          bPos[2]
        );
        dummy.rotation.set(
          0,
          0,
          0
        );
        dummy.scale.set(
          1,
          1,
          1
        );
        dummy.updateMatrix();
        const beaconWorldMatrix = moduleMatrix.clone().multiply(dummy.matrix);
        this.beaconMesh.setMatrixAt(
          beaconIdx,
          beaconWorldMatrix
        );

        const worldVec = new THREE.Vector3();
        worldVec.setFromMatrixPosition(beaconWorldMatrix);

        this.beaconMesh.setColorAt(
          beaconIdx,
          this.idleColor
        );

        this.beacons.push({
          index: beaconIdx,
          worldX: worldVec.x,
          worldY: worldVec.y,
          worldZ: worldVec.z,
          flashIntensity: 0.0,
          flashColor: this.defaultFlashColor.clone()
        });

        beaconIdx++;
      }
    }

    deckMesh.instanceMatrix.needsUpdate = true;
    deckTrimMesh.instanceMatrix.needsUpdate = true;
    floatMesh.instanceMatrix.needsUpdate = true;
    tubeMesh.instanceMatrix.needsUpdate = true;
    fanTubeMesh.instanceMatrix.needsUpdate = true;
    cabinMesh.instanceMatrix.needsUpdate = true;
    solarMesh.instanceMatrix.needsUpdate = true;
    this.beaconMesh.instanceMatrix.needsUpdate = true;
    if (this.beaconMesh.instanceColor) {
      this.beaconMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(deckMesh);
    this.group.add(deckTrimMesh);
    this.group.add(floatMesh);
    this.group.add(tubeMesh);
    this.group.add(fanTubeMesh);
    this.group.add(cabinMesh);
    this.group.add(solarMesh);
    this.group.add(this.beaconMesh);

    this.instancedMeshes.push(
      deckMesh,
      deckTrimMesh,
      floatMesh,
      tubeMesh,
      fanTubeMesh,
      cabinMesh,
      solarMesh,
      this.beaconMesh
    );
  }

  _createMuzzleFlashPool() {
    this.muzzlePool = [];
    const poolSize = 16;
    const { muzzleRingGeo } = this._sharedGeometries;

    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffaa20,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(
        muzzleRingGeo,
        mat
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.group.add(mesh);

      this.muzzlePool.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.45,
        baseScale: 1.0
      });
    }
  }

  _createLiftSparksSystem() {
    this.maxLiftParticles = 800;
    this.liftParticles = [];

    this.liftPositions = new Float32Array(this.maxLiftParticles * 3);
    this.liftColors = new Float32Array(this.maxLiftParticles * 3);
    this.liftSizes = new Float32Array(this.maxLiftParticles);
    this.liftOpacities = new Float32Array(this.maxLiftParticles);

    this.liftGeometry = new THREE.BufferGeometry();
    this.liftGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        this.liftPositions,
        3
      )
    );
    this.liftGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(
        this.liftColors,
        3
      )
    );
    this.liftGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(
        this.liftSizes,
        1
      )
    );
    this.liftGeometry.setAttribute(
      'aOpacity',
      new THREE.BufferAttribute(
        this.liftOpacities,
        1
      )
    );

    this.liftMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.liftMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
      ` + shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        `
      ).replace(
        'gl_PointSize = size;',
        `
        gl_PointSize = aSize;
        vOpacity = aOpacity;
        `
      );

      shader.fragmentShader = `
        varying float vOpacity;
      ` + shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord) * 2.0;
        if (dist > 1.0) discard;
        float alpha = clamp(1.0 - dist * dist, 0.0, 1.0) * vOpacity;
        diffuseColor = vec4(diffuseColor.rgb, alpha);
        `
      );
    };

    this.liftPoints = new THREE.Points(
      this.liftGeometry,
      this.liftMaterial
    );
    this.liftPoints.frustumCulled = false;
    this.group.add(this.liftPoints);
  }

  _setupEventListeners() {
    this.onLaunch = (detail) => {
      if (!detail || !detail.position) {
        return;
      }
      this.triggerLaunchLight(
        detail.position,
        detail.colorHex,
        detail.direction || detail.velocity
      );
    };

    if (this.eventBus) {
      this.eventBus.on(
        'firework:launch',
        this.onLaunch
      );
    }
  }

  triggerLaunchLight(position, colorHex, launchVector) {
    const pX = position.x;
    const pZ = position.z;
    const flashRadius = 55.0;

    const flashColor = colorHex
      ? new THREE.Color(colorHex)
      : this.defaultFlashColor;

    // 1. Light up adjacent beacons near the launch location
    for (let i = 0; i < this.beacons.length; i++) {
      const b = this.beacons[i];
      const dx = b.worldX - pX;
      const dz = b.worldZ - pZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < flashRadius * flashRadius) {
        const dist = Math.sqrt(distSq);
        const power = (1.0 - (dist / flashRadius)) * 2.8;

        b.flashIntensity = Math.min(3.0, Math.max(b.flashIntensity, power));
        b.flashColor.copy(flashColor);
      }
    }

    // 2. Spawn gunpowder ignition muzzle flash flare ring on the deck
    const flashItem = this.muzzlePool.find((item) => !item.active);
    if (flashItem) {
      flashItem.active = true;
      flashItem.life = 0.45;
      flashItem.maxLife = 0.45;
      flashItem.mat.color.copy(flashColor);
      flashItem.mat.opacity = 0.95;
      flashItem.mesh.position.set(
        pX,
        LAUNCH_ZONE_CONFIG.center.y + 1.2,
        pZ
      );
      flashItem.mesh.scale.set(
        1.0,
        1.0,
        1.0
      );
      flashItem.mesh.visible = true;
    }

    // 3. Eject explosive lift charge sparks out of the mortar tube mouth along launch direction
    this._spawnLiftSparks(
      position,
      flashColor,
      launchVector
    );
  }

  _spawnLiftSparks(position, baseColor, launchVector) {
    const sparkCount = 38 + Math.floor(Math.random() * 16);
    const startY = LAUNCH_ZONE_CONFIG.center.y + 2.2; // Mortar tube muzzle opening

    const forward = new THREE.Vector3(
      0,
      1,
      0
    );
    if (launchVector) {
      const lv = new THREE.Vector3(
        launchVector.x || 0,
        launchVector.y || 0,
        launchVector.z || 0
      );
      if (lv.lengthSq() > 0.001) {
        forward.copy(lv).normalize();
      }
    }

    const upRef = Math.abs(forward.y) > 0.92
      ? new THREE.Vector3(
        0,
        0,
        1
      )
      : new THREE.Vector3(
        0,
        1,
        0
      );
    const tangent1 = new THREE.Vector3().crossVectors(
      forward,
      upRef
    ).normalize();
    const tangent2 = new THREE.Vector3().crossVectors(
      forward,
      tangent1
    ).normalize();

    for (let i = 0; i < sparkCount; i++) {
      if (this.liftParticles.length >= this.maxLiftParticles) {
        // Recycle oldest particle
        this.liftParticles.shift();
      }

      const isUpwardJet = i % 5 < 2; // ~40% shoot along trajectory, ~60% burst outward

      let vx;
      let vy;
      let vz;
      let size;
      let life;
      let drag;
      let gravity;

      if (isUpwardJet) {
        // 1. Upward stream trailing along the firework's flight trajectory
        const speedForward = 18.0 + Math.random() * 20.0;
        const speedLat = 1.0 + Math.random() * 3.5;
        const latAngle = Math.random() * Math.PI * 2;

        vx = forward.x * speedForward +
          (tangent1.x * Math.cos(latAngle) + tangent2.x * Math.sin(latAngle)) * speedLat;
        vy = forward.y * speedForward +
          (tangent1.y * Math.cos(latAngle) + tangent2.y * Math.sin(latAngle)) * speedLat;
        vz = forward.z * speedForward +
          (tangent1.z * Math.cos(latAngle) + tangent2.z * Math.sin(latAngle)) * speedLat;

        size = 3.2 + Math.random() * 3.2;
        life = 0.38 + Math.random() * 0.36;
        drag = 0.95 + Math.random() * 0.03;
        gravity = 14.0;
      } else {
        // 2. Radial muzzle spray bursting outward around the mortar opening
        const radialAngle = Math.random() * Math.PI * 2;
        const blastRadial = 9.0 + Math.random() * 15.0;
        const blastForward = 4.0 + Math.random() * 8.0;

        vx = forward.x * blastForward +
          (tangent1.x * Math.cos(radialAngle) + tangent2.x * Math.sin(radialAngle)) * blastRadial;
        vy = forward.y * blastForward +
          (tangent1.y * Math.cos(radialAngle) + tangent2.y * Math.sin(radialAngle)) * blastRadial;
        vz = forward.z * blastForward +
          (tangent1.z * Math.cos(radialAngle) + tangent2.z * Math.sin(radialAngle)) * blastRadial;

        size = 2.8 + Math.random() * 3.8;
        life = 0.22 + Math.random() * 0.30;
        drag = 0.88 + Math.random() * 0.06;
        gravity = 24.0;
      }

      const pColor = new THREE.Color().copy(baseColor).lerp(
        new THREE.Color(0xfff0a0),
        0.55 + Math.random() * 0.45
      );

      this.liftParticles.push({
        x: position.x + (Math.random() - 0.5) * 0.4,
        y: startY + (Math.random() - 0.5) * 0.2,
        z: position.z + (Math.random() - 0.5) * 0.4,
        vx,
        vy,
        vz,
        color: pColor,
        size,
        life,
        maxLife: life,
        drag,
        gravity
      });
    }
  }

  setLayer(layerIndex) {
    this.group.traverse((obj) => {
      if (obj.layers) {
        obj.layers.enable(layerIndex);
      }
    });
  }

  update(deltaTime) {
    this.time += deltaTime;

    const waveY = Math.sin(this.time * 1.5) * 0.08;
    const rollX = Math.sin(this.time * 1.2) * 0.004;
    const pitchZ = Math.cos(this.time * 1.4) * 0.003;

    this.group.position.y = waveY;
    this.group.rotation.x = rollX;
    this.group.rotation.z = pitchZ;

    // 1. Decay beacon flash lights back to dark standby state
    let colorsNeedUpdate = false;
    const tempColor = new THREE.Color();

    for (let i = 0; i < this.beacons.length; i++) {
      const b = this.beacons[i];

      if (b.flashIntensity > 0.001) {
        b.flashIntensity = Math.max(
          0.0,
          b.flashIntensity - deltaTime * 2.8
        );

        const glowFactor = Math.min(1.0, b.flashIntensity);
        tempColor.copy(this.idleColor).lerp(
          b.flashColor,
          glowFactor
        ).multiplyScalar(1.0 + b.flashIntensity * 1.8);

        this.beaconMesh.setColorAt(
          b.index,
          tempColor
        );
        colorsNeedUpdate = true;
      } else if (b.flashIntensity !== 0.0) {
        b.flashIntensity = 0.0;
        this.beaconMesh.setColorAt(
          b.index,
          this.idleColor
        );
        colorsNeedUpdate = true;
      }
    }

    if (colorsNeedUpdate && this.beaconMesh.instanceColor) {
      this.beaconMesh.instanceColor.needsUpdate = true;
    }

    // 2. Update active muzzle flare rings
    for (let i = 0; i < this.muzzlePool.length; i++) {
      const item = this.muzzlePool[i];
      if (item.active) {
        item.life -= deltaTime;
        if (item.life <= 0) {
          item.active = false;
          item.mesh.visible = false;
          item.mat.opacity = 0.0;
        } else {
          const progress = 1.0 - (item.life / item.maxLife);
          const currentScale = 1.0 + progress * 1.6;
          item.mesh.scale.set(
            currentScale,
            currentScale,
            currentScale
          );
          item.mat.opacity = (1.0 - progress) * 0.9;
        }
      }
    }

    // 3. Update lift ejection sparks
    const activeCount = this.liftParticles.length;
    for (let i = activeCount - 1; i >= 0; i--) {
      const p = this.liftParticles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.liftParticles.splice(
          i,
          1
        );
        continue;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.z += p.vz * deltaTime;

      const dragFactor = Math.pow(p.drag || 0.90, deltaTime * 60);
      p.vx *= dragFactor;
      p.vz *= dragFactor;
      p.vy = (p.vy - p.gravity * deltaTime) * dragFactor;

      // Dissolve rapidly on hitting water / deck surface
      if (p.y <= 0.2) {
        p.y = 0.2;
        p.vy = 0;
        p.vx *= 0.8;
        p.vz *= 0.8;
        p.life -= deltaTime * 3.0;
      }
    }

    // Update GPU buffer arrays for lift sparks
    const currentActive = this.liftParticles.length;
    for (let i = 0; i < currentActive; i++) {
      const p = this.liftParticles[i];
      const i3 = i * 3;
      const progress = 1.0 - (p.life / p.maxLife);

      this.liftPositions[i3] = p.x;
      this.liftPositions[i3 + 1] = p.y;
      this.liftPositions[i3 + 2] = p.z;

      this.liftColors[i3] = p.color.r;
      this.liftColors[i3 + 1] = p.color.g;
      this.liftColors[i3 + 2] = p.color.b;

      this.liftSizes[i] = p.size * (1.0 - progress * 0.5);
      this.liftOpacities[i] = (1.0 - progress) * 0.95;
    }

    this.liftGeometry.setDrawRange(
      0,
      currentActive
    );
    this.liftGeometry.attributes.position.needsUpdate = true;
    this.liftGeometry.attributes.color.needsUpdate = true;
    this.liftGeometry.attributes.aSize.needsUpdate = true;
    this.liftGeometry.attributes.aOpacity.needsUpdate = true;
  }

  dispose() {
    if (this.eventBus && this.onLaunch) {
      this.eventBus.off(
        'firework:launch',
        this.onLaunch
      );
    }

    for (const mesh of this.instancedMeshes) {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }

    for (const item of this.muzzlePool) {
      if (item.mesh.geometry) {
        item.mesh.geometry.dispose();
      }
      if (item.mat) {
        item.mat.dispose();
      }
    }

    if (this.liftGeometry) {
      this.liftGeometry.dispose();
    }
    if (this.liftMaterial) {
      this.liftMaterial.dispose();
    }

    Object.values(this._sharedGeometries).forEach((geo) => geo.dispose());
    Object.values(this._sharedMaterials).forEach((mat) => mat.dispose());
  }
}
