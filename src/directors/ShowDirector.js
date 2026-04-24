export class ShowDirector {
  constructor(sequencer, fireworkSystem) {
    this.sequencer = sequencer;
    this.fireworkSystem = fireworkSystem;
    this.elapsedTime = 0;
    this.events = [];
    this.isPlaying = false;
  }

  loadScript(scriptConfig) {
    // Clone and sort events by time
    this.events = [...scriptConfig].sort((a, b) => a.time - b.time);
    this.elapsedTime = 0;
    this.isPlaying = false;
    this.sequencer.clear();
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  stop() {
    this.isPlaying = false;
    this.elapsedTime = 0;
    this.sequencer.clear();
  }

  update(deltaTime) {
    if (!this.isPlaying) return;

    this.elapsedTime += deltaTime;
    
    // Process events that should be triggered
    while (this.events.length > 0 && this.events[0].time <= this.elapsedTime) {
      const currentEvent = this.events.shift();
      this.executeEvent(currentEvent);
    }
  }

  executeEvent(evt) {
    switch(evt.type) {
      case 'single':
        this.fireworkSystem.launchRandom(evt.preset, { 
          ratioX: evt.ratioX, 
          ratioY: evt.ratioY, 
          ratioZ: evt.ratioZ 
        });
        break;
      case 'sequence':
        this.sequencer.playPattern(evt.pattern, {
          count: evt.count,
          duration: evt.duration,
          preset: evt.preset,
          ratioY: evt.ratioY,
          ratioZ: evt.ratioZ,
          sectorId: evt.sectorId,
          color: evt.color,
          x1: evt.x1,
          x2: evt.x2
        });
        break;
      case 'cometsequence':
        this.sequencer.playCometSequence(evt.pattern, {
          count: evt.count,
          duration: evt.duration,
          preset: evt.preset,
          ratioX: evt.ratioX,
          ratioY: evt.ratioY,
          ratioZ: evt.ratioZ,
          sweepCount: evt.sweepCount,
          sectorId: evt.sectorId,
          color: evt.color
        });
        break;
      case 'finale':
        this.sequencer.playFinale(evt.totalShells, evt.duration);
        break;
      default:
        console.warn(`[ShowDirector] Unknown event type: ${evt.type}`);
        break;
    }
  }
}
