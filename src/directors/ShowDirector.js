import { ShowEventDispatcher } from './ShowEventDispatcher.js';

export class ShowDirector {
  constructor(sequencer, fireworkSystem, dispatcher = null) {
    this.sequencer = sequencer;
    this.fireworkSystem = fireworkSystem;
    this.elapsedTime = 0;
    this.events = [];
    this.isPlaying = false;
    this.audioPlayers = new Map();
    this.dispatcher = dispatcher || new ShowEventDispatcher();
  }

  loadScript(scriptConfig) {
    this.scriptConfig = [...scriptConfig].sort((a, b) => a.time - b.time);
    this.events = [...this.scriptConfig];
    this.elapsedTime = 0;
    this.sequencer.clear();
    if (this.droneSequencer) {
       this.droneSequencer.stop();
    }

    // Cleanup old audio elements
    this.audioPlayers.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.audioPlayers.clear();

    // Init new audio elements and Drone Show
    this.scriptConfig.forEach(seq => {
      if (seq.type === 'audio') {
        const url = seq._blobUrl || `/${seq.url}`;
        try {
            const audio = new Audio(url);
            audio.volume = seq.volume !== undefined ? seq.volume : 1.0;
            this.audioPlayers.set(seq, audio);
        } catch (e) {
            console.warn("Could not load audio", e);
        }
      } else if (seq.type === 'droneshow') {
        if (this.droneSequencer) {
            this.droneSequencer.loadSequence(seq, seq.time);
        }
      }
    });
  }

  seek(time) {
    this.elapsedTime = time;
    if (this.scriptConfig) {
      this.events = this.scriptConfig.filter(evt => evt.time >= time);
    }
    this.sequencer.clear();
    if (this.fireworkSystem && this.fireworkSystem.clear) {
      this.fireworkSystem.clear();
    }
    if (this.sequencer.cometSystem && this.sequencer.cometSystem.clear) {
      this.sequencer.cometSystem.clear();
    }
    
    if (this.droneSequencer) {
       this.droneSequencer.seek(time);
    }
    
    // Sync audio times
    this.audioPlayers.forEach((audio, seq) => {
      const isTime = this.elapsedTime >= seq.time && this.elapsedTime < seq.time + (seq.duration || 0);
      if (isTime) {
        audio.currentTime = this.elapsedTime - seq.time;
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }

  play() {
    this.isPlaying = true;
    if (this.droneSequencer) this.droneSequencer.play();
  }

  pause() {
    this.isPlaying = false;
    this.audioPlayers.forEach(audio => audio.pause());
    if (this.droneSequencer) this.droneSequencer.pause();
  }

  stop() {
    this.isPlaying = false;
    this.elapsedTime = 0;
    this.sequencer.clear();
    this.audioPlayers.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    if (this.droneSequencer) this.droneSequencer.stop();
  }

  update(deltaTime) {
    if (!this.isPlaying) return;

    this.elapsedTime += deltaTime;
    
    // Continuous sync for audio tracks
    this.audioPlayers.forEach((audio, seq) => {
      const isTime = this.elapsedTime >= seq.time && this.elapsedTime < seq.time + (seq.duration || 0);
      
      // Update volume if changed via inspector
      if (audio.volume !== seq.volume && seq.volume !== undefined) {
        audio.volume = seq.volume;
      }

      if (isTime && audio.paused) {
        const targetTime = this.elapsedTime - seq.time;
        if (Math.abs(audio.currentTime - targetTime) > 0.2) {
          audio.currentTime = targetTime;
        }
        audio.play().catch(e => console.warn('Audio play blocked:', e));
      } else if (!isTime && !audio.paused) {
        audio.pause();
      }
    });

    // Process events that should be triggered
    while (this.events.length > 0 && this.events[0].time <= this.elapsedTime) {
      const currentEvent = this.events.shift();
      this.executeEvent(currentEvent);
    }
  }

  executeEvent(evt) {
    this.dispatcher.dispatch(evt, {
      sequencer: this.sequencer,
      fireworkSystem: this.fireworkSystem
    });
  }
}
