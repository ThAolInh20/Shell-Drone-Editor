import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';
import { AUDIO_CONFIG } from '../config/audio.js';
import { LAUNCH_ZONE_CONFIG } from '../config/launchZone.js';

export class AudioSystem {
  constructor(cameraManager, audioContext = null, eventBus = null) {
    this.cameraManager = cameraManager;
    this.baseURL = AUDIO_CONFIG.baseURL;
    this.eventBus = eventBus || globalEventBus;

    if (audioContext) {
      this.ctx = audioContext;
    } else {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      this.ctx = AudioContextClass ? new AudioContextClass() : null;
    }

    this.speedOfSound = AUDIO_CONFIG.physics.speedOfSound; // units/second, assuming 1 unit = 1 meter

    this.sources = {
      lift: {
        volume: AUDIO_CONFIG.volumes.lift,
        playbackRateMin: 0.85,
        playbackRateMax: 0.95,
        fileNames: ['lift1.mp3', 'lift2.mp3', 'lift3.mp3']
      },
      burst: {
        volume: AUDIO_CONFIG.volumes.burst,
        playbackRateMin: 0.8,
        playbackRateMax: 0.9,
        fileNames: [
          'burst1.mp3',
          'burst2.mp3',
          'burst4.mp3',
          'burst5.mp3'
        ]
      },
      burstSmall: {
        volume: AUDIO_CONFIG.volumes.burstSmall,
        playbackRateMin: 0.8,
        playbackRateMax: 1,
        fileNames: ['burst-sm-1.mp3', 'burst-sm-2.mp3']
      },
      crackle: {
        volume: AUDIO_CONFIG.volumes.crackle,
        playbackRateMin: 1,
        playbackRateMax: 1,
        fileNames: ['crackle1.mp3']
      },
      crackleSmall: {
        volume: AUDIO_CONFIG.volumes.crackleSmall,
        playbackRateMin: 1,
        playbackRateMax: 1,
        fileNames: ['crackle-sm-1.mp3']
      }
    };

    this.stages = AUDIO_CONFIG.stages || {};
    this.bufferCache = new Map();

    this._lastSmallBurstTime = 0;
    this._lastCrackleTime = 0;
    this.eventSubscriptions = [];

    this.bindEvents();
  }

  bindEvents() {
    this.eventSubscriptions.push(
      this.eventBus.on('firework:launch', (detail) => this.handleLaunch(detail)),
      this.eventBus.on('firework:burst', (detail) => this.handleBurst(detail)),
      this.eventBus.on('firework:crackle', (detail) => this.handleCrackle(detail)),
      this.eventBus.on('audio:preview', (detail) => this.handlePreview(detail))
    );
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }

  async preload() {
    if (!this.ctx) return Promise.resolve();

    const checkStatus = (response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      throw new Error(response.statusText);
    };

    const uniqueFiles = new Set();
    Object.values(this.sources).forEach(s => s.fileNames?.forEach(f => uniqueFiles.add(f)));
    Object.values(this.stages).forEach(stage => {
      Object.values(stage).forEach(profile => profile.fileNames?.forEach(f => uniqueFiles.add(f)));
    });

    const filePromises = Array.from(uniqueFiles).map(fileName => {
      const fileURL = this.baseURL + fileName;
      return fetch(fileURL)
        .then(checkStatus)
        .then(response => response.arrayBuffer())
        .then(data => new Promise((resolve, reject) => {
          this.ctx.decodeAudioData(data, resolve, reject);
        }))
        .then(buffer => {
          this.bufferCache.set(fileName, buffer);
          return buffer;
        });
    });

    try {
      await Promise.all(filePromises);

      // Link buffers to sources
      for (const source of Object.values(this.sources)) {
        source.buffers = (source.fileNames || [])
          .map(name => this.bufferCache.get(name))
          .filter(Boolean);
      }

      // Link buffers to stages
      for (const stage of Object.values(this.stages)) {
        for (const profile of Object.values(stage)) {
          profile.buffers = (profile.fileNames || [])
            .map(name => this.bufferCache.get(name))
            .filter(Boolean);
        }
      }
    } catch (err) {
      console.error('AudioSystem: Failed to preload sounds', err);
    }
  }

  resume() {
    if (!this.ctx) return;
    // Play a silent sound to unlock AudioContext
    this.playSoundBase('lift', 0, 1, 0);
    setTimeout(() => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }, 250);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  calculatePositionalAudioParams(eventPosition, baseVolumeMultiplier = 1) {
    // User requested to remove distance calculation and play sound immediately
    return { delay: 0, scale: baseVolumeMultiplier };
  }

  calculatePan(position) {
    if (!position || position.x === undefined || !this.cameraManager) {
      return 0;
    }

    try {
      const camera = this.cameraManager.instance || this.cameraManager;
      if (!camera || typeof camera.applyMatrix4 !== 'function') {
        return 0;
      }
      // Chuyển vị trí nổ sang không gian của camera (View Space)
      const viewPos = new THREE.Vector3(position.x, position.y, position.z);
      viewPos.applyMatrix4(camera.matrixWorldInverse);

      const depth = -viewPos.z;
      if (depth <= 0) {
        // Đối tượng nổ ở phía sau camera, hạn chế pan lớn để giữ tự nhiên
        return this.clamp(viewPos.x / 100, -0.5, 0.5);
      }

      // Tính góc lệch ngang so với hướng nhìn trực diện
      const angle = Math.atan2(viewPos.x, depth);

      // Camera Perspective mặc định có FOV là 75 độ, nửa góc nhìn ngang khoảng 37.5 độ (0.65 radian)
      // Chia cho 0.65 để pan đạt tối đa ở rìa màn hình, giới hạn ở mức [-0.85, 0.85]
      const pan = this.clamp(angle / 0.65, -0.85, 0.85);
      return pan;
    } catch (e) {
      console.warn('AudioSystem: Failed to calculate pan', e);
      return 0;
    }
  }

  playSoundBase(
    type,
    volumeScale = 1,
    playbackRateScale = 1,
    delay = 0,
    position = null,
    bufferIndex = null
  ) {
    if (!this.ctx) return;
    const source = this.sources[type];
    if (!source || !source.buffers || source.buffers.length === 0) return;

    const masterVolume = AUDIO_CONFIG.volumes.master ?? 1.0;
    const initialVolume = source.volume;
    const initialPlaybackRate = this.random(source.playbackRateMin, source.playbackRateMax);

    const scaledVolume = initialVolume * volumeScale * masterVolume;
    const scaledPlaybackRate = initialPlaybackRate * playbackRateScale;

    // Don't play if volume is extremely low (except when unlocking context with 0 volume)
    if (volumeScale > 0 && scaledVolume < 0.01) return;

    let buffer = null;
    if (bufferIndex !== null && bufferIndex >= 0 && bufferIndex < source.buffers.length) {
      buffer = source.buffers[bufferIndex];
    } else {
      buffer = this.randomChoice(source.buffers);
    }

    const playLogic = () => {
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = scaledVolume;

      const bufferSource = this.ctx.createBufferSource();
      bufferSource.playbackRate.value = scaledPlaybackRate;
      bufferSource.buffer = buffer;

      if (this.ctx.createStereoPanner && position) {
        const pannerNode = this.ctx.createStereoPanner();
        pannerNode.pan.value = this.calculatePan(position);
        bufferSource.connect(pannerNode);
        pannerNode.connect(gainNode);
      } else {
        bufferSource.connect(gainNode);
      }

      gainNode.connect(this.ctx.destination);
      bufferSource.start(0);
    };

    if (delay > 0) {
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = scaledVolume;

      const bufferSource = this.ctx.createBufferSource();
      bufferSource.playbackRate.value = scaledPlaybackRate;
      bufferSource.buffer = buffer;

      if (this.ctx.createStereoPanner && position) {
        const pannerNode = this.ctx.createStereoPanner();
        pannerNode.pan.value = this.calculatePan(position);
        bufferSource.connect(pannerNode);
        pannerNode.connect(gainNode);
      } else {
        bufferSource.connect(gainNode);
      }

      gainNode.connect(this.ctx.destination);

      // Start scheduling
      bufferSource.start(this.ctx.currentTime + delay);
    } else {
      playLogic();
    }
  }

  playSoundProfile(
    stage,
    profileName,
    volumeScale = 1,
    playbackRateScale = 1,
    delay = 0,
    position = null,
    bufferIndex = null
  ) {
    if (!this.ctx) return;
    const profile = this.stages?.[stage]?.[profileName];
    if (!profile) return;
    if (profileName === 'silent' || profile.volume <= 0) return;
    if (!profile.buffers || profile.buffers.length === 0) return;

    const masterVolume = AUDIO_CONFIG.volumes.master ?? 1.0;
    const initialVolume = profile.volume ?? 1.0;
    const minRate = profile.playbackRateMin ?? 1.0;
    const maxRate = profile.playbackRateMax ?? 1.0;
    const initialPlaybackRate = this.random(minRate, maxRate);

    const scaledVolume = initialVolume * volumeScale * masterVolume;
    const scaledPlaybackRate = initialPlaybackRate * playbackRateScale;

    if (volumeScale > 0 && scaledVolume < 0.01) return;

    let buffer = null;
    if (bufferIndex !== null && bufferIndex >= 0 && bufferIndex < profile.buffers.length) {
      buffer = profile.buffers[bufferIndex];
    } else {
      buffer = this.randomChoice(profile.buffers);
    }
    if (!buffer) return;

    const playLogic = () => {
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = scaledVolume;

      const bufferSource = this.ctx.createBufferSource();
      bufferSource.playbackRate.value = scaledPlaybackRate;
      bufferSource.buffer = buffer;

      if (this.ctx.createStereoPanner && position) {
        const pannerNode = this.ctx.createStereoPanner();
        pannerNode.pan.value = this.calculatePan(position);
        bufferSource.connect(pannerNode);
        pannerNode.connect(gainNode);
      } else {
        bufferSource.connect(gainNode);
      }

      gainNode.connect(this.ctx.destination);
      bufferSource.start(0);
    };

    if (delay > 0) {
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = scaledVolume;

      const bufferSource = this.ctx.createBufferSource();
      bufferSource.playbackRate.value = scaledPlaybackRate;
      bufferSource.buffer = buffer;

      if (this.ctx.createStereoPanner && position) {
        const pannerNode = this.ctx.createStereoPanner();
        pannerNode.pan.value = this.calculatePan(position);
        bufferSource.connect(pannerNode);
        pannerNode.connect(gainNode);
      } else {
        bufferSource.connect(gainNode);
      }

      gainNode.connect(this.ctx.destination);
      bufferSource.start(this.ctx.currentTime + delay);
    } else {
      playLogic();
    }
  }

  handlePreview(detail) {
    if (!detail) return;
    const { stage, profile } = detail;
    this.previewSound(stage, profile);
  }

  previewSound(stage, profile) {
    if (!this.ctx || !stage || !profile || profile === 'silent' || profile === 'default') {
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.stages?.[stage]?.[profile]) {
      this.playSoundProfile(
        stage,
        profile,
        1,
        1,
        0,
        null
      );
    } else if (this.sources[profile]) {
      this.playSoundBase(
        profile,
        1,
        1,
        0,
        null
      );
    }
  }

  handleLaunch(detail) {
    const soundConfig = detail?.sound || {};
    const profile = soundConfig.launch || detail?.launchSound || 'standard';
    if (profile === 'silent' || soundConfig.noLaunchSound) {
      return;
    }

    const { position } = detail || {};
    const volMult = soundConfig.volumeMultiplier ?? 1;
    const pitchMult = soundConfig.pitchMultiplier ?? 1;
    const { delay, scale } = this.calculatePositionalAudioParams(
      position,
      volMult
    );

    if (profile !== 'standard' && this.stages?.launch?.[profile]) {
      this.playSoundProfile(
        'launch',
        profile,
        scale,
        pitchMult,
        delay,
        position
      );
    } else {
      this.playSoundBase(
        'lift',
        scale,
        pitchMult,
        delay,
        position
      );
    }
  }

  handleBurst(detail) {
    if (
      !detail ||
      detail.noBurstSound ||
      detail.noBurst ||
      (Array.isArray(detail.effects) && detail.effects.includes('no-burst'))
    ) {
      return;
    }

    const soundConfig = detail.sound || {};
    const profile = soundConfig.burst || detail.burstSound || 'standard';
    if (profile === 'silent' || soundConfig.noBurstSound) {
      return;
    }

    const { position, intensity = 0.5 } = detail;
    const volMult = soundConfig.volumeMultiplier ?? 1;
    const pitchMult = soundConfig.pitchMultiplier ?? 1;
    const { delay, scale } = this.calculatePositionalAudioParams(
      position,
      intensity * 2 * volMult
    );

    const playbackRateScale = this.clamp(
      2 - (scale / Math.max(volMult, 0.01)),
      1,
      1.5
    ) * pitchMult;

    if (profile !== 'standard' && this.stages?.burst?.[profile]) {
      this.playSoundProfile(
        'burst',
        profile,
        scale,
        playbackRateScale,
        delay,
        position
      );
      return;
    }

    const minBurstY = LAUNCH_ZONE_CONFIG.minBurstY;
    const maxBurstY = LAUNCH_ZONE_CONFIG.maxBurstY;
    const height = position && typeof position.y === 'number' ? position.y : 0;
    const heightRatio = this.clamp(
      (height - minBurstY) / Math.max(maxBurstY - minBurstY, 1),
      0,
      1
    );

    let bufferIndex = null;
    if (heightRatio < 0.3) {
      bufferIndex = 2; // burst4.mp3
    } else if (heightRatio > 0.8) {
      bufferIndex = 3; // burst5.mp3
    } else {
      bufferIndex = Math.floor(Math.random() * 2); // burst1.mp3 or burst2.mp3
    }

    this.playSoundBase(
      'burst',
      scale,
      playbackRateScale,
      delay,
      position,
      bufferIndex
    );
  }

  handleCrackle(detail) {
    const soundConfig = detail?.sound || {};
    const profile = soundConfig.crackle || detail?.crackleSound || 'standard';
    if (profile === 'silent' || soundConfig.noCrackleSound) {
      return;
    }

    const { position } = detail || {};
    const now = Date.now();
    // Throttle crackles: only allow 1 per 50ms globally to avoid destroying eardrums
    if (now - this._lastCrackleTime < 50) {
      return;
    }
    this._lastCrackleTime = now;

    const volMult = soundConfig.volumeMultiplier ?? 1;
    const pitchMult = soundConfig.pitchMultiplier ?? 1;
    const { delay, scale } = this.calculatePositionalAudioParams(
      position,
      0.8 * volMult
    );

    if (profile !== 'standard' && this.stages?.crackle?.[profile]) {
      this.playSoundProfile(
        'crackle',
        profile,
        scale,
        pitchMult,
        delay,
        position
      );
    } else {
      this.playSoundBase(
        'crackle',
        scale,
        pitchMult,
        delay,
        position
      );
    }
  }
}
