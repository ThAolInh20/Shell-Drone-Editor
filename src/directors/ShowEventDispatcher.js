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
      if (
        evt.instantBurst !== undefined
        || evt.shellSize !== undefined
        || evt.shapeType !== undefined
        || evt.dynamicsType !== undefined
        || evt.pistil !== undefined
        || evt.effects !== undefined
        || evt.strobe !== undefined
        || evt.crackle !== undefined
        || evt.flow !== undefined
        || evt.noTrail !== undefined
        || evt.cometTrail !== undefined
        || evt.stages !== undefined
        || evt.nestingMode !== undefined
        || evt.multiNested !== undefined
      ) {
        overrides = { ...(overrides || {}) };
        if (evt.instantBurst !== undefined) overrides.instantBurst = evt.instantBurst;
        if (evt.shellSize !== undefined) overrides.shellSize = evt.shellSize;
        if (evt.shapeType !== undefined) overrides.shapeType = evt.shapeType;
        if (evt.dynamicsType !== undefined) overrides.dynamicsType = evt.dynamicsType;
        if (evt.pistil !== undefined) overrides.pistil = evt.pistil;
        if (evt.effects !== undefined) overrides.effects = evt.effects;
        if (evt.strobe !== undefined) overrides.strobe = evt.strobe;
        if (evt.crackle !== undefined) overrides.crackle = evt.crackle;
        if (evt.flow !== undefined) overrides.flow = evt.flow;
        if (evt.noTrail !== undefined) overrides.noTrail = evt.noTrail;
        if (evt.stages !== undefined) overrides.stages = evt.stages;
        if (evt.nestingMode !== undefined) overrides.nestingMode = evt.nestingMode;
        if (evt.multiNested !== undefined) overrides.multiNested = evt.multiNested;
        if (evt.cometTrail !== undefined) {
          if (evt.cometTrail === 'none') {
            overrides.launchTrail = false;
            overrides.thickTrail = false;
            overrides.thinTrail = false;
            overrides.instantBurst = true;
          } else if (evt.cometTrail === 'thick') {
            overrides.launchTrail = true;
            overrides.thickTrail = true;
            overrides.thinTrail = false;
          } else if (evt.cometTrail === 'thin') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = true;
          } else if (evt.cometTrail === 'normal') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = false;
          } else if (evt.cometTrail === 'ascent-bursts') {
            overrides.launchTrail = true;
            overrides.thickTrail = false;
            overrides.thinTrail = false;
            overrides.ascentBursts = true;
            overrides.ascentSubShellType = evt.ascentSubShellType || 'random';
            overrides.ascentBurstCount = evt.ascentBurstCount ? parseInt(evt.ascentBurstCount, 10) : 4;
          }
        }
        if (evt.ascentSubShellType !== undefined) overrides.ascentSubShellType = evt.ascentSubShellType;
        if (evt.ascentBurstCount !== undefined) overrides.ascentBurstCount = parseInt(evt.ascentBurstCount, 10);
      }

      const isComet = (evt.preset && (evt.preset.type === 'comet_cluster' || evt.preset.type === 'comet')) 
                    || (typeof evt.preset === 'string' && (evt.preset === 'comet' || evt.preset.startsWith('comet_cluster')));

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
