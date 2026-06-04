import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus.js';

export class AudioSystem {
  constructor(cameraManager) {
    this.cameraManager = cameraManager;
    this.baseURLLegacy = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/329180/';
    this.baseURLNew = 'https://shellsound.s3.ap-southeast-2.amazonaws.com/effect/';

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.speedOfSound = 343; // units/second, assuming 1 unit = 1 meter

    this.sources = {
      lift: {
        volume: 0.8,
        playbackRateMin: 0.85,
        playbackRateMax: 0.95,
        fileNames: ['lift1.mp3', 'lift2.mp3', 'lift3.mp3']
      },
      burst: {
        volume: 0.9,
        playbackRateMin: 0.8,
        playbackRateMax: 0.9,
        // fileNames: ['burst1.mp3', 'burst2.mp3', 'burst4.mp3', 'burst5.mp3']
        fileNames: ['burst1.mp3', 'burst2.mp3']
      },
      burstSmall: {
        volume: 0.4,
        playbackRateMin: 0.8,
        playbackRateMax: 1,
        fileNames: ['burst-sm-1.mp3', 'burst-sm-2.mp3']
      },
      crackle: {
        volume: 0.3,
        playbackRateMin: 1,
        playbackRateMax: 1,
        fileNames: ['crackle1.mp3']
      },
      crackleSmall: {
        volume: 0.4,
        playbackRateMin: 1,
        playbackRateMax: 1,
        fileNames: ['crackle-sm-1.mp3']
      }
    };

    this._lastSmallBurstTime = 0;
    this._lastCrackleTime = 0;
    this.eventSubscriptions = [];

    this.bindEvents();
  }

  bindEvents() {
    this.eventSubscriptions.push(
      globalEventBus.on('firework:launch', (detail) => this.handleLaunch(detail)),
      globalEventBus.on('firework:burst', (detail) => this.handleBurst(detail)),
      globalEventBus.on('firework:crackle', (detail) => this.handleCrackle(detail))
    );
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }

  async preload() {
    const allFilePromises = [];

    const checkStatus = (response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      throw new Error(response.statusText);
    };

    const types = Object.keys(this.sources);
    for (const type of types) {
      const source = this.sources[type];
      const filePromises = source.fileNames.map(fileName => {
        const numMatch = fileName.match(/\d+/);
        const num = numMatch ? parseInt(numMatch[0], 10) : 1;
        const fileURL = (num >= 4) ? (this.baseURLNew + fileName) : (this.baseURLLegacy + fileName);
        const promise = fetch(fileURL)
          .then(checkStatus)
          .then(response => response.arrayBuffer())
          .then(data => new Promise((resolve, reject) => {
            this.ctx.decodeAudioData(data, resolve, reject);
          }));
        return promise;
      });

      allFilePromises.push(...filePromises);

      Promise.all(filePromises).then(buffers => {
        source.buffers = buffers;
      });
    }

    return Promise.all(allFilePromises).catch(err => {
      console.error('AudioSystem: Failed to preload sounds', err);
    });
  }

  resume() {
    // Play a silent sound to unlock AudioContext
    this.playSoundBase('lift', 0, 1, 0);
    setTimeout(() => {
      if (this.ctx.state === 'suspended') {
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
    if (!position || position.x === undefined || !this.cameraManager || !this.cameraManager.instance) {
      return 0;
    }

    try {
      const camera = this.cameraManager.instance;
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

  playSoundBase(type, volumeScale = 1, playbackRateScale = 1, delay = 0, position = null) {
    const source = this.sources[type];
    if (!source || !source.buffers || source.buffers.length === 0) return;

    const initialVolume = source.volume;
    const initialPlaybackRate = this.random(source.playbackRateMin, source.playbackRateMax);

    const scaledVolume = initialVolume * volumeScale;
    const scaledPlaybackRate = initialPlaybackRate * playbackRateScale;

    // Don't play if volume is extremely low (except when unlocking context with 0 volume)
    if (volumeScale > 0 && scaledVolume < 0.01) return;

    const buffer = this.randomChoice(source.buffers);

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

  handleLaunch(detail) {
    const { position } = detail;
    const { delay, scale } = this.calculatePositionalAudioParams(position, 1);
    this.playSoundBase('lift', scale, 1, delay, position);
  }

  handleBurst(detail) {
    const { position, intensity } = detail;
    const { delay, scale } = this.calculatePositionalAudioParams(position, intensity * 2);

    // Scale down volume for smaller intensity, but speed up playback
    const playbackRateScale = this.clamp(2 - scale, 1, 1.5);

    this.playSoundBase('burst', scale, playbackRateScale, delay, position);
  }

  handleCrackle(detail) {
    const { position } = detail;

    const now = Date.now();
    // Throttle crackles: only allow 1 per 50ms globally to avoid destroying eardrums
    if (now - this._lastCrackleTime < 50) {
      return;
    }
    this._lastCrackleTime = now;

    const { delay, scale } = this.calculatePositionalAudioParams(position, 0.8);
    this.playSoundBase('crackle', scale, 1, delay, position);
  }
}
