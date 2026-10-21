global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActiveEffectsTimeline, createSvgIcon } from '../../src/ui/ActiveEffectsTimeline.js';
import { BurstEffectProcessor } from '../../src/factories/BurstEffectProcessor.js';

describe('ActiveEffectsTimeline and Effect Timings', () => {
  let listeners = {};
  let mockContainer;
  let effectsList;
  let onChangeMock;

  const createMockElement = (tag = 'div') => {
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      innerHTML: '',
      textContent: '',
      children: [],
      parentElement: null,
      dataset: {},
      appendChild: vi.fn((child) => {
        el.children.push(child);
        child.parentElement = el;
        return child;
      }),
      removeChild: vi.fn((child) => {
        el.children = el.children.filter((c) => c !== child);
        child.parentElement = null;
      }),
      remove: vi.fn(() => {
        if (el.parentElement) {
          el.parentElement.removeChild(el);
        }
      }),
      setAttribute: vi.fn((attr, val) => {
        el[attr] = val;
      }),
      getAttribute: vi.fn((attr) => el[attr] || null),
      addEventListener: vi.fn((event, cb) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event, cb) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(fn => fn !== cb);
        }
      }),
      contains: vi.fn((target) => el === target || el.children.includes(target)),
      querySelectorAll: vi.fn((selector) => {
        return el.children.filter((c) => c.className && c.className.includes(selector.replace('.', '')));
      }),
      querySelector: vi.fn((selector) => {
        return el.children.find((c) => c.className && c.className.includes(selector.replace('.', ''))) || null;
      }),
      getBoundingClientRect: vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 50,
        right: 250,
        width: 200,
        height: 30
      }))
    };
    return el;
  };

  beforeEach(() => {
    listeners = {};
    const mockBody = createMockElement('body');

    vi.stubGlobal('document', {
      createElement: vi.fn((tag) => createMockElement(tag)),
      createElementNS: vi.fn((ns, tag) => createMockElement(tag)),
      body: mockBody,
      addEventListener: vi.fn((event, cb) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => null)
    });

    vi.stubGlobal('window', {
      addEventListener: vi.fn((event, cb) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn(),
      innerWidth: 1024,
      innerHeight: 768
    });

    mockContainer = createMockElement('div');
    effectsList = [
      { type: 'strobe', start: 0.2, end: 1.2 }
    ];
    onChangeMock = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('createSvgIcon', () => {
    it('should generate svg icons for expand, collapse, plus, and close', () => {
      const expandIcon = createSvgIcon('expand', 14);
      expect(expandIcon).toBeDefined();

      const collapseIcon = createSvgIcon('collapse', 14);
      expect(collapseIcon).toBeDefined();

      const plusIcon = createSvgIcon('plus', 14);
      expect(plusIcon).toBeDefined();

      const closeIcon = createSvgIcon('close', 14);
      expect(closeIcon).toBeDefined();
    });
  });

  describe('ActiveEffectsTimeline Component', () => {
    it('should initialize and render compact track with effect blocks', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => effectsList,
        onChange: onChangeMock,
        availableEffectTags: [
          { key: 'strobe', labelKey: 'strobe' },
          { key: 'crackle', labelKey: 'crackle' }
        ]
      });

      expect(mockContainer.appendChild).toHaveBeenCalled();
      timeline.destroy();
    });

    it('should support adding an effect with automatic start and end bounds', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => effectsList,
        onChange: onChangeMock,
        availableEffectTags: [
          { key: 'strobe', labelKey: 'strobe' },
          { key: 'crackle', labelKey: 'crackle' }
        ]
      });

      timeline.addEffect('crackle');
      expect(onChangeMock).toHaveBeenCalled();
      const lastCallArg = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      const crackleEntry = lastCallArg.find((e) => e.type === 'crackle');
      expect(crackleEntry).toBeDefined();
      expect(crackleEntry.start).toBeGreaterThanOrEqual(0);
      expect(crackleEntry.end).toBeLessThanOrEqual(2.0);
      timeline.destroy();
    });

    it('should support removing an effect block', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => effectsList,
        onChange: onChangeMock
      });

      timeline.removeEffect({ type: 'strobe' });
      expect(onChangeMock).toHaveBeenCalledWith([]);
      timeline.destroy();
    });

    it('should open and close expanded timeline modal without errors', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => effectsList,
        onChange: onChangeMock
      });

      timeline.openExpandedModal();
      expect(timeline.expandedModal).toBeDefined();

      timeline.closeExpandedModal();
      expect(timeline.expandedModal).toBeNull();
      timeline.destroy();
    });

    it('should update start time when dragging resize-start handle and commit on mouseup', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => [{ type: 'strobe', start: 0.2, end: 1.2 }],
        onChange: onChangeMock
      });

      const eff = timeline.effects[0];
      const containerEl = { getBoundingClientRect: () => ({ width: 200, left: 0 }) };
      const blockEl = { style: {} };
      const textSpanEl = { textContent: '' };

      // Simulate mouse down on left handle
      timeline.startDrag({ clientX: 20 }, 'resize-start', eff, containerEl, 2.0, blockEl, textSpanEl);
      expect(timeline.activeDrag).toBeDefined();

      // Drag +50px (50 / 200 * 2.0 = +0.5s => start moves from 0.2 to 0.7)
      timeline.onMouseMove({ clientX: 70 });
      expect(eff.start).toBeCloseTo(0.7, 2);
      expect(blockEl.style.left).toBeDefined();

      // Mouse up commits changes
      timeline.onMouseUp();
      expect(timeline.activeDrag).toBeNull();
      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      expect(lastCall[0].start).toBeCloseTo(0.7, 2);

      timeline.destroy();
    });

    it('should update end time when dragging resize-end handle and commit on mouseup', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => [{ type: 'strobe', start: 0.2, end: 1.2 }],
        onChange: onChangeMock
      });

      const eff = timeline.effects[0];
      const containerEl = { getBoundingClientRect: () => ({ width: 200, left: 0 }) };
      const blockEl = { style: {} };
      const textSpanEl = { textContent: '' };

      timeline.startDrag({ clientX: 120 }, 'resize-end', eff, containerEl, 2.0, blockEl, textSpanEl);
      // Drag +40px (40 / 200 * 2.0 = +0.4s => end moves from 1.2 to 1.6)
      timeline.onMouseMove({ clientX: 160 });
      expect(eff.end).toBeCloseTo(1.6, 2);

      timeline.onMouseUp();
      expect(onChangeMock).toHaveBeenCalled();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      expect(lastCall[0].end).toBeCloseTo(1.6, 2);

      timeline.destroy();
    });

    it('should shift entire block while preserving duration', () => {
      const timeline = new ActiveEffectsTimeline(mockContainer, {
        getDuration: () => 2.0,
        getEffects: () => [{ type: 'strobe', start: 0.2, end: 0.8 }],
        onChange: onChangeMock
      });

      const eff = timeline.effects[0];
      const containerEl = { getBoundingClientRect: () => ({ width: 200, left: 0 }) };
      const blockEl = { style: {} };
      const textSpanEl = { textContent: '' };

      timeline.startDrag({ clientX: 50 }, 'shift', eff, containerEl, 2.0, blockEl, textSpanEl);
      // Drag +50px (+0.5s => start moves from 0.2 to 0.7, end from 0.8 to 1.3)
      timeline.onMouseMove({ clientX: 100 });
      expect(eff.start).toBeCloseTo(0.7, 2);
      expect(eff.end).toBeCloseTo(1.3, 2);

      timeline.onMouseUp();
      const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1][0];
      expect(lastCall[0].start).toBeCloseTo(0.7, 2);
      expect(lastCall[0].end).toBeCloseTo(1.3, 2);

      timeline.destroy();
    });
  });

  describe('BurstEffectProcessor.isEffectActive with Timing Window', () => {
    it('should return true only when particle age is inside the effect timing window', () => {
      const particle = {
        age: 0.1,
        maxLife: 2.0,
        effects: [
          { type: 'strobe', start: 0.5, end: 1.5 }
        ]
      };

      // Before start time (age = 0.1, window = [0.5, 1.5])
      expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);

      // Inside window (age = 0.8)
      particle.age = 0.8;
      expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(true);

      // Boundary condition (age = 1.5)
      particle.age = 1.5;
      expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(true);

      // After end time (age = 1.8)
      particle.age = 1.8;
      expect(BurstEffectProcessor.isEffectActive(particle, 'strobe')).toBe(false);
    });

    it('should support legacy string effect tags as active across entire lifetime', () => {
      const legacyParticle = {
        age: 0.1,
        maxLife: 2.0,
        effects: ['crackle']
      };

      expect(BurstEffectProcessor.isEffectActive(legacyParticle, 'crackle')).toBe(true);

      legacyParticle.age = 1.9;
      expect(BurstEffectProcessor.isEffectActive(legacyParticle, 'crackle')).toBe(true);
    });
  });
});
