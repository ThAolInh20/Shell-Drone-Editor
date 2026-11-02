import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as THREE from 'three';
import { ShellPresetFactory } from '../../src/factories/ShellPresetFactory.js';
import { FireworkSystem } from '../../src/systems/FireworkSystem.js';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('Multi Nested Shell Stage Particle Multiplier', () => {
  let PropertyInspector;

  beforeAll(async () => {
    const mod = await import('../../src/ui/PropertyInspector.js');
    PropertyInspector = mod.PropertyInspector;
  });

  const createMockElement = (tag = 'div') => {
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      innerHTML: '',
      textContent: '',
      children: [],
      parentElement: null,
      dataset: {},
      className: '',
      value: '',
      type: tag === 'input' ? 'text' : '',
      appendChild: (child) => {
        el.children.push(child);
        child.parentElement = el;
        return child;
      },
      removeChild: (child) => {
        el.children = el.children.filter((c) => c !== child);
        child.parentElement = null;
      },
      contains: () => false,
      getBoundingClientRect: () => ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 100,
        height: 30
      }),
      setAttribute: vi.fn((attr, val) => {
        el[attr] = val;
      }),
      getAttribute: vi.fn((attr) => el[attr] || null),
      addEventListener: (event, cb) => {
        if (!el._listeners) el._listeners = {};
        if (!el._listeners[event]) el._listeners[event] = [];
        el._listeners[event].push(cb);
      },
      dispatchEvent: (evt) => {
        const type = typeof evt === 'string' ? evt : evt.type;
        if (el._listeners && el._listeners[type]) {
          el._listeners[type].forEach((cb) => cb(evt));
        }
      },
      querySelector: (selector) => {
        const queue = [...el.children];
        while (queue.length > 0) {
          const curr = queue.shift();
          if (selector.startsWith('.') && curr.className?.includes(selector.slice(1))) {
            return curr;
          }
          if (curr.children) queue.push(...curr.children);
        }
        return null;
      },
      querySelectorAll: (selector) => {
        const matches = [];
        const queue = [...el.children];
        while (queue.length > 0) {
          const curr = queue.shift();
          if (selector.startsWith('.') && curr.className?.includes(selector.slice(1))) {
            matches.push(curr);
          }
          if (selector === 'button' && curr.tagName === 'BUTTON') {
            matches.push(curr);
          }
          if (selector === 'input' && curr.tagName === 'INPUT') {
            matches.push(curr);
          }
          if (curr.children) queue.push(...curr.children);
        }
        return matches;
      }
    };
    return el;
  };

  it('should initialize default stages with particleCountMultiplier = 1.0 in ShellPresetFactory', () => {
    const factory = new ShellPresetFactory();
    const preset = factory.createPresetByKey('multiNested');
    expect(preset).toBeDefined();
    expect(preset.multiNested).toBe(true);
    expect(Array.isArray(preset.stages)).toBe(true);

    preset.stages.forEach((stage) => {
      expect(stage.particleCountMultiplier).toBe(1.0);
    });
  });

  it('should scale and clamp resolveBurstParticleCount with multiplier between 0.25 and 3.0', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);

    const baseCount = system.resolveBurstParticleCount(
      'sphere',
      'standard',
      { particleCountMultiplier: 1.0, shellSize: 1.0 }
    );

    const lowCount = system.resolveBurstParticleCount(
      'sphere',
      'standard',
      { particleCountMultiplier: 0.25, shellSize: 1.0 }
    );

    const highCount = system.resolveBurstParticleCount(
      'sphere',
      'standard',
      { particleCountMultiplier: 3.0, shellSize: 1.0 }
    );

    expect(lowCount).toBeLessThan(baseCount);
    expect(highCount).toBeGreaterThan(baseCount);

    // Clamping checks
    const clampedBelow = system.resolveBurstParticleCount(
      'sphere',
      'standard',
      { particleCountMultiplier: 0.05, shellSize: 1.0 }
    );
    expect(clampedBelow).toBe(lowCount);

    const clampedAbove = system.resolveBurstParticleCount(
      'sphere',
      'standard',
      { particleCountMultiplier: 10.0, shellSize: 1.0 }
    );
    expect(clampedAbove).toBe(highCount);
  });

  it('should forward stage particleCountMultiplier to each sub-burst in triggerMultiNestedBurst', () => {
    const scene = new THREE.Scene();
    const system = new FireworkSystem(scene);

    const spyCreateBurst = vi.spyOn(system, 'createBurst');

    const multiPreset = {
      multiNested: true,
      nestingMode: 'concentric',
      shellSize: 1.0,
      stages: [
        {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          delay: 0.0,
          scale: 1.0,
          particleCountMultiplier: 2.5
        },
        {
          shapeType: 'ring',
          dynamicsType: 'flow',
          delay: 0.0,
          scale: 0.8,
          particleCountMultiplier: 0.5
        }
      ]
    };

    system.triggerMultiNestedBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(1, 0, 0),
      multiPreset,
      'test-shell'
    );

    expect(spyCreateBurst).toHaveBeenCalledTimes(2);

    const firstCallPreset = spyCreateBurst.mock.calls[0][3];
    expect(firstCallPreset.particleCountMultiplier).toBe(2.5);

    const secondCallPreset = spyCreateBurst.mock.calls[1][3];
    expect(secondCallPreset.particleCountMultiplier).toBe(0.5);
  });

  it('should render particle density slider and update stage particleCountMultiplier in PropertyInspector', () => {
    const origDoc = global.document;
    const origWin = global.window;

    global.document = {
      createElement: (tag) => createMockElement(tag),
      body: createMockElement('body'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    if (!global.window) {
      global.window = {};
    }
    if (!global.window.addEventListener) {
      global.window.addEventListener = vi.fn();
      global.window.removeEventListener = vi.fn();
    }

    const container = createMockElement('div');
    const inspector = new PropertyInspector(
      container,
      () => {},
      ['multi_nested', 'random']
    );

    const testEvent = {
      id: 'event-1',
      type: 'sequence',
      preset: 'multi_nested',
      multiNested: true,
      stages: [
        {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          color: '#ff4400',
          delay: 0.0,
          scale: 1.0,
          particleCountMultiplier: 1.0,
          effects: []
        }
      ]
    };

    inspector.show(testEvent);

    // Find the particle density slider and number input
    const inputs = container.querySelectorAll('input');
    const rangeSliders = inputs.filter((inp) => inp.type === 'range');
    const numberInputs = inputs.filter((inp) => inp.type === 'number');

    // The stage particle slider has min = 0.25, max = 3.0, step = 0.25
    const stageParticleSlider = rangeSliders.find(
      (inp) => inp.min === '0.25' && inp.max === '3.0' && inp.step === '0.25' && !inp.className?.includes('inspector-slider')
    );
    expect(stageParticleSlider).toBeDefined();
    expect(Number(stageParticleSlider.value)).toBe(1.0);

    const particleNum = numberInputs.find(
      (inp) => inp.min === '0.25' && inp.max === '3.0' && inp.step === '0.25'
    );
    expect(particleNum).toBeDefined();
    expect(Number(particleNum.value)).toBe(1.0);

    // Test slider input event: changing value to 2.25
    stageParticleSlider.dispatchEvent({
      type: 'input',
      target: { value: '2.25' }
    });
    expect(testEvent.stages[0].particleCountMultiplier).toBe(2.25);
    expect(particleNum.value).toBe(2.25);

    // Test number input change event: changing value to 0.75
    particleNum.dispatchEvent({
      type: 'change',
      target: { value: '0.75' }
    });
    expect(testEvent.stages[0].particleCountMultiplier).toBe(0.75);
    expect(stageParticleSlider.value).toBe(0.75);

    global.document = origDoc;
    global.window = origWin;
  });

  it('should render particleCountMultiplier slider in Visual Effects accordion and update event', () => {
    const origDoc = global.document;
    const origWin = global.window;

    global.document = {
      createElement: (tag) => createMockElement(tag),
      body: createMockElement('body'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    if (!global.window) {
      global.window = {};
    }
    if (!global.window.addEventListener) {
      global.window.addEventListener = vi.fn();
      global.window.removeEventListener = vi.fn();
    }

    const container = createMockElement('div');
    const inspector = new PropertyInspector(
      container,
      () => {},
      ['crysanthemum', 'random']
    );

    const testEvent = {
      id: 'event-standard',
      type: 'sequence',
      preset: 'crysanthemum',
      shellSize: 1.5,
      particleCountMultiplier: 1.0,
      starLifeMultiplier: 1.0
    };

    inspector.show(testEvent);

    const inputs = container.querySelectorAll('input');
    const rangeSliders = inputs.filter((inp) => inp.type === 'range');

    const particleSlider = rangeSliders.find(
      (inp) => inp.min === '0.25' && inp.max === '3.0' && inp.step === '0.25' && inp.className?.includes('inspector-slider')
    );
    expect(particleSlider).toBeDefined();
    expect(Number(particleSlider.value)).toBe(1.0);

    particleSlider.dispatchEvent({
      type: 'input',
      target: { value: '2.5' }
    });
    expect(testEvent.particleCountMultiplier).toBe(2.5);

    global.document = origDoc;
    global.window = origWin;
  });

  it('should forward particleCountMultiplier in FireworkSequencer playPattern overrides', async () => {
    const { FireworkSequencer } = await import('../../src/directors/FireworkSequencer.js');
    const mockSystem = {
      launchRandom: vi.fn()
    };
    const sequencer = new FireworkSequencer(mockSystem);

    const config = {
      count: 1,
      duration: 1.0,
      preset: 'crysanthemum',
      particleCountMultiplier: 2.25,
      shellSize: 2.0
    };

    sequencer.playPattern('sweep', config);

    expect(sequencer.activeTasks.length).toBe(1);
    const task = sequencer.activeTasks[0];
    expect(task.options.effectOverrides).toBeDefined();
    expect(task.options.effectOverrides.particleCountMultiplier).toBe(2.25);
    expect(task.options.effectOverrides.shellSize).toBe(2.0);
  });
});
