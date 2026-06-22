export class ShowEventDispatcher {
  constructor() {
    this.handlers = new Map();
    this.initializeDefaultHandlers();
  }

  register(eventType, handlerFn) {
    this.handlers.set(eventType, handlerFn);
  }

  dispatch(evt, context) {
    const handler = this.handlers.get(evt.type);
    if (handler) {
      handler(evt, context);
    } else {
      console.warn(`[ShowEventDispatcher] Unknown event type: ${evt.type}`);
    }
  }

  initializeDefaultHandlers() {
    // Single event handler
    this.register('single', (evt, context) => {
      let overrides = evt.effectOverrides;
      if (evt.instantBurst !== undefined || evt.shellSize !== undefined || evt.strobe !== undefined || evt.crackle !== undefined || evt.pistil !== undefined) {
        overrides = { ...(overrides || {}) };
        if (evt.instantBurst !== undefined) overrides.instantBurst = evt.instantBurst;
        if (evt.shellSize !== undefined) overrides.shellSize = evt.shellSize;
        if (evt.strobe !== undefined) overrides.strobe = evt.strobe;
        if (evt.crackle !== undefined) overrides.crackle = evt.crackle;
        if (evt.pistil !== undefined) overrides.pistil = evt.pistil;
      }

      const isComet = (evt.preset && (evt.preset.type === 'comet_cluster' || evt.preset.type === 'comet')) 
                    || (typeof evt.preset === 'string' && (evt.preset.startsWith('comet_cluster') || evt.preset.includes('comet')));

      if (isComet && context.sequencer && context.sequencer.cometSystem) {
        context.sequencer.cometSystem.launchRandom(evt.preset, { 
          ratioX: evt.ratioX, 
          ratioY: evt.ratioY, 
          ratioZ: evt.ratioZ,
          sectorId: evt.sectorId,
          color: evt.color,
          effectOverrides: overrides
        });
      } else if (context.fireworkSystem) {
        context.fireworkSystem.launchRandom(evt.preset, { 
          ratioX: evt.ratioX, 
          ratioY: evt.ratioY, 
          ratioZ: evt.ratioZ,
          sectorId: evt.sectorId,
          color: evt.color,
          effectOverrides: overrides
        });
      }
    });

    // Sequence event handler
    this.register('sequence', (evt, context) => {
      if (context.sequencer) {
        context.sequencer.playPattern(evt.pattern, evt);
      }
    });

    // Comet sequence event handler
    this.register('cometsequence', (evt, context) => {
      if (context.sequencer) {
        context.sequencer.playCometSequence(evt.pattern, evt);
      }
    });

    // Finale event handler
    this.register('finale', (evt, context) => {
      if (context.sequencer) {
        context.sequencer.playFinale(evt.totalShells, evt.duration);
      }
    });

    // Audio and droneshow events are handled elsewhere/noop in dispatcher
    this.register('audio', () => {});
    this.register('droneshow', () => {});
  }
}
