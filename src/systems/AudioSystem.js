import * as THREE from 'three';

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
        fileNames: ['burst1.mp3', 'burst2.mp3', 'burst4.mp3', 'burst5.mp3']
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

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('firework:launch', (e) => this.handleLaunch(e.detail));
    window.addEventListener('firework:burst', (e) => this.handleBurst(e.detail));
    window.addEventListener('firework:crackle', (e) => this.handleCrackle(e.detail));
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

  playSoundBase(type, volumeScale = 1, playbackRateScale = 1, delay = 0) {
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

      bufferSource.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      bufferSource.start(0);
    };

    if (delay > 0) {
      // Use AudioContext timing for better precision than setTimeout if possible,
      // but for delayed execution where we just want it to trigger in the future,
      // setTimeout is fine. Using context.currentTime is better for sync.

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = scaledVolume;

      const bufferSource = this.ctx.createBufferSource();
      bufferSource.playbackRate.value = scaledPlaybackRate;
      bufferSource.buffer = buffer;

      bufferSource.connect(gainNode);
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
    // Lift should be played almost immediately, but we can keep 3D delay for realism.
    // However, usually launch is close to player. If we're at launch pad, it will be immediate.
    this.playSoundBase('lift', scale, 1, delay);
  }

  handleBurst(detail) {
    const { position, intensity, effectType } = detail;
    const { delay, scale } = this.calculatePositionalAudioParams(position, intensity * 2);

    // Scale down volume for smaller intensity, but speed up playback
    // (A scale of 0.5 means faster playback rate)
    // 2 - scale to increase playback rate when volume is lower (farther or smaller)
    const playbackRateScale = this.clamp(2 - scale, 1, 1.5);

    this.playSoundBase('burst', scale, playbackRateScale, delay);

    // If it's a crackle effect, crackle sound will only play when crackle cloud actually triggers.
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
    this.playSoundBase('crackle', scale, 1, delay);
  }
}
