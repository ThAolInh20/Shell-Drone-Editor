export class ShowDirector {
  constructor(sequencer, fireworkSystem) {
    this.sequencer = sequencer;
    this.fireworkSystem = fireworkSystem;
    this.elapsedTime = 0;
    this.events = [];
    this.isPlaying = false;
  }

  loadScript(scriptConfig) {
    this.scriptConfig = [...scriptConfig].sort((a, b) => a.time - b.time);
    this.events = [...this.scriptConfig];
    this.elapsedTime = 0;
    this.isPlaying = false;
    this.sequencer.clear();
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
        this.sequencer.playPattern(evt.pattern, evt);
        break;
      case 'cometsequence':
        this.sequencer.playCometSequence(evt.pattern, evt);
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
