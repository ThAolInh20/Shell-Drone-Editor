import * as THREE from 'three';

const GRAVITY = -30;
const DEFAULT_TRAIL_COLOR = new THREE.Color(0xffd700);
const CRACKLE_SPARK_COLOR = new THREE.Color(0xffd77a);

export class TrailSystem {
  constructor(scene) {
    this.scene = scene;
    this.trailParticles = [];

    // Trail particles geometry
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.PointsMaterial({
      size: 12,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord) * 2.0;
        if (dist > 1.0) discard;
        
        vec4 stop0 = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 stop1 = vec4(diffuseColor.rgb, 0.3);
        vec4 stop2 = vec4(diffuseColor.rgb, 0.13);
        vec4 stop3 = vec4(diffuseColor.rgb, 0.0);
        
        vec4 gradientColor;
        if (dist < 0.024) {
            gradientColor = stop0;
        } else if (dist < 0.125) {
            float t = (dist - 0.024) / (0.125 - 0.024);
            gradientColor = mix(stop0, stop1, t);
        } else if (dist < 0.32) {
            float t = (dist - 0.125) / (0.32 - 0.125);
            gradientColor = mix(stop1, stop2, t);
        } else {
            float t = (dist - 0.32) / (1.0 - 0.32);
            gradientColor = mix(stop2, stop3, t);
        }
        
        diffuseColor = vec4(gradientColor.rgb, gradientColor.a * diffuseColor.a);
        `
      );
    };
    this.trailPoints = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trailPoints.frustumCulled = false;
    this.scene.add(this.trailPoints);
  }

  spawnTrailParticle(position, color, lifeMultiplier = 1.0) {
    const useFireworkColor = Math.random() < 0.75;
    const trailColor = useFireworkColor
      ? color.clone().offsetHSL(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.12
      )
      : DEFAULT_TRAIL_COLOR.clone();

    const particle = {
      position: position.clone(),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
      color: trailColor,
      life: (2 + Math.random() * 3) * lifeMultiplier,
      age: 0
    };
    this.trailParticles.push(particle);
  }

  spawnEffectSpark(position, color) {
    const spark = {
      position: position.clone(),
      // Vận tốc ngẫu nhiên để các hạt tỏa ra xung quanh tạo thành hình nón (mở dần)
      velocity: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6),
      color: color.clone().offsetHSL(0, 0.05, 0.18),
      // Tăng mạnh thời gian sống để hạt kịp tỏa rộng ra trước khi mờ hẳn
      life: 1.5 + Math.random() * 1.2, 
      age: 0
    };
    this.trailParticles.push(spark);
  }

  spawnMicroCrackle(position, baseColor) {
    const crackleCount = 6 + Math.floor(Math.random() * 4); // 6 to 9 particles

    for (let i = 0; i < crackleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );

      const speed = (0.6 + Math.random() * 0.4) * 18;

      const sparkColor = CRACKLE_SPARK_COLOR.clone();

      this.trailParticles.push({
        position: position.clone(),
        velocity: direction.multiplyScalar(speed),
        color: sparkColor,
        life: 1.0 + Math.random() * 0.5,
        age: 0
      });
    }
  }

  update(deltaTime) {
    const finishedTrails = [];
    const positions = [];
    const colors = [];

    for (const particle of this.trailParticles) {
      // Thêm lực cản không khí để hạt hãm phanh lại, không bị bung ra mãi tới lúc chết
      particle.velocity.x *= (1.0 - 4.0 * deltaTime);
      particle.velocity.z *= (1.0 - 4.0 * deltaTime);
      // Rơi xuống từ từ
      particle.velocity.y += GRAVITY * deltaTime * 0.5; 
      particle.position.addScaledVector(particle.velocity, deltaTime);
      particle.age += deltaTime;

      if (particle.age >= particle.life) {
        finishedTrails.push(particle);
      } else {
        // Tính độ mờ đục (alpha) giảm dần theo thời gian sống của hạt
        const alpha = Math.max(0, 1.0 - (particle.age / particle.life));
        positions.push(particle.position.x, particle.position.y, particle.position.z);
        colors.push(particle.color.r, particle.color.g, particle.color.b, alpha);
      }
    }
    this.trailParticles = this.trailParticles.filter(p => !finishedTrails.includes(p));

    // Update geometry
    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }
}
