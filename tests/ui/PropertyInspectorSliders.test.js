import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as THREE from 'three';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('PropertyInspector Sliders and Star Lifetime Multiplier', () => {
  let PropertyInspector;
  let ACTIVE_EFFECT_TAGS;
  let TIMED_EFFECT_TAGS;
  let TOGGLE_MODIFIER_TAGS;
  let FireworkSystem;

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
        const className = selector.replace('.', '');
        const findRecursive = (node) => {
          if (node.className && node.className.split(' ').includes(className)) return node;
          for (const child of node.children) {
            const found = findRecursive(child);
            if (found) return found;
          }
          return null;
        };
        return findRecursive(el);
      },
      querySelectorAll: () => []
    };
    return el;
  };

  beforeAll(async () => {
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

    const inspectorMod = await import('../../src/ui/PropertyInspector.js');
    PropertyInspector = inspectorMod.PropertyInspector;
    ACTIVE_EFFECT_TAGS = inspectorMod.ACTIVE_EFFECT_TAGS;
    TIMED_EFFECT_TAGS = inspectorMod.TIMED_EFFECT_TAGS;
    TOGGLE_MODIFIER_TAGS = inspectorMod.TOGGLE_MODIFIER_TAGS;

    const fireworkMod = await import('../../src/systems/FireworkSystem.js');
    FireworkSystem = fireworkMod.FireworkSystem;
  });

  it('should remove long-burn from ACTIVE_EFFECT_TAGS', () => {
    const keys = ACTIVE_EFFECT_TAGS.map((tag) => tag.key);
    expect(keys).not.toContain('long-burn');
  });

  it('should include flow and no-trail in TIMED_EFFECT_TAGS, and not burst-smoke', () => {
    const keys = TIMED_EFFECT_TAGS.map((tag) => tag.key);
    expect(keys).toContain('flow');
    expect(keys).toContain('no-trail');
    expect(keys).toContain('strobe');
    expect(keys).not.toContain('burst-smoke');
    expect(keys).not.toContain('no-burst');
    expect(keys).not.toContain('pistil');
    expect(keys).not.toContain('apex-hang');
  });

  it('should include burst-smoke, pistil, apex-hang and slow-burst in TOGGLE_MODIFIER_TAGS', () => {
    const keys = TOGGLE_MODIFIER_TAGS.map((tag) => tag.key);
    expect(keys).toContain('burst-smoke');
    expect(keys).toContain('pistil');
    expect(keys).toContain('apex-hang');
    expect(keys).toContain('slow-burst');
    expect(keys).not.toContain('no-burst');
    expect(keys).not.toContain('flow');
    expect(keys).not.toContain('no-trail');
  });

  it('should render toggle modifier chips and toggle event properties on click', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);
    const targetEvent = {
      preset: 'crysanthemum',
      effects: []
    };
    inspector.selectedEvent = targetEvent;

    const parentDiv = createMockElement('div');
    inspector.renderToggleModifiers(parentDiv, targetEvent);

    const wrapper = parentDiv.children[0];
    const chips = wrapper.children[1].children;
    const burstSmokeChip = chips.find((c) => c.dataset.key === 'burst-smoke');
    const pistilChip = chips.find((c) => c.dataset.key === 'pistil');
    expect(burstSmokeChip).toBeDefined();
    expect(pistilChip).toBeDefined();

    // Click burst-smoke chip
    burstSmokeChip.dispatchEvent({ type: 'click' });
    expect(targetEvent.burstSmoke).toBe(true);
    expect(targetEvent['burst-smoke']).toBe(true);

    // Click again to turn off burst-smoke
    burstSmokeChip.dispatchEvent({ type: 'click' });
    expect(targetEvent.burstSmoke).toBeUndefined();
    expect(targetEvent['burst-smoke']).toBeUndefined();

    // Click pistil chip
    pistilChip.dispatchEvent({ type: 'click' });
    expect(targetEvent.pistil).toBe(true);

    // Click again to turn off
    pistilChip.dispatchEvent({ type: 'click' });
    expect(targetEvent.pistil).toBe(false);
  });

  it('should not contain instantBurst or pistil as standalone fields in compositionSettings', () => {
    const mockContainer = createMockElement('div');
    const inspector = new PropertyInspector(mockContainer, vi.fn());
    const eventGroups = inspector.getSchema().event;
    const compGroup = eventGroups.find((g) => g.groupKey === 'compositionSettings');
    expect(compGroup).toBeDefined();
    const fieldNames = compGroup.fields.map((f) => f.name);
    expect(fieldNames).not.toContain('instantBurst');
    expect(fieldNames).not.toContain('pistil');
    expect(fieldNames).toContain('shapeType');
    expect(fieldNames).toContain('dynamicsType');
    expect(fieldNames).toContain('effects');
  });

  it('should configure shellSize and starLifeMultiplier as sliders in visualEffects group', () => {
    const mockContainer = createMockElement('div');
    const inspector = new PropertyInspector(mockContainer, vi.fn());
    const eventGroups = inspector.getSchema().event;
    const visualGroup = eventGroups.find((g) => g.groupKey === 'visualEffects');

    expect(visualGroup).toBeDefined();

    const colorField = visualGroup.fields.find((f) => f.name === 'color');
    expect(colorField).toBeDefined();
    expect(colorField.span).toBe(2);

    const shellSizeField = visualGroup.fields.find((f) => f.name === 'shellSize');
    expect(shellSizeField).toBeDefined();
    expect(shellSizeField.type).toBe('slider');
    expect(shellSizeField.min).toBe('0.2');
    expect(shellSizeField.max).toBe('5.0');
    expect(shellSizeField.span).toBe(2);

    const starLifeField = visualGroup.fields.find((f) => f.name === 'starLifeMultiplier');
    expect(starLifeField).toBeDefined();
    expect(starLifeField.type).toBe('slider');
    expect(starLifeField.min).toBe('0.4');
    expect(starLifeField.max).toBe('5.0');
    expect(starLifeField.span).toBe(2);

    const cometTrailField = visualGroup.fields.find((f) => f.name === 'cometTrail');
    expect(cometTrailField).toBeDefined();
    expect(cometTrailField.span).toBe(2);
  });

  it('should render slider element with correct values and update event on input', () => {
    vi.useFakeTimers();
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event = {
      shellSize: 1.5,
      starLifeMultiplier: 1.8
    };
    inspector.selectedEvent = event;

    const parentDiv = createMockElement('div');
    inspector.renderSlider(parentDiv, {
      name: 'starLifeMultiplier',
      labelKey: 'starLifeMultiplier',
      type: 'slider',
      min: '0.4',
      max: '2.5',
      step: '0.05',
      defaultValue: 1.0,
      formatValue: (v) => `${Number(v).toFixed(2)}x`
    });

    const label = parentDiv.querySelector('.inspector-label');
    const badge = parentDiv.querySelector('.inspector-slider-value');
    const slider = parentDiv.querySelector('.inspector-slider');

    expect(label).toBeDefined();
    expect(badge.textContent).toBe('1.80x');
    expect(slider.value).toBe('1.8');

    // Simulate pointerdown (undo recording)
    slider.dispatchEvent({ type: 'pointerdown' });
    expect(onUpdate).toHaveBeenCalledWith('beforeChange');

    // Simulate dragging slider to 2.2
    slider.value = '2.2';
    slider.dispatchEvent({ type: 'input', target: { value: '2.2' } });

    expect(badge.textContent).toBe('2.20x');
    expect(event.starLifeMultiplier).toBe(2.2);

    // Fast-forward debounce timer
    vi.advanceTimersByTime(300);
    expect(onUpdate).toHaveBeenCalledWith();
    vi.useRealTimers();
  });

  it('should scale particle lifetime according to starLifeMultiplier in FireworkSystem', () => {
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);

    // Standard burst without multiplier
    fireworkSystem.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      { starLifeMultiplier: 1.0 },
      'test-standard'
    );
    const standardParticle = fireworkSystem.burstParticles.find(p => !p.isDyingEmber) || fireworkSystem.burstParticles[0];
    const standardMaxLife = standardParticle.maxLife;
    fireworkSystem.clear();

    // Burst with 0.5x starLifeMultiplier
    fireworkSystem.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      { starLifeMultiplier: 0.5 },
      'test-short'
    );
    const shortParticle = fireworkSystem.burstParticles.find(p => !p.isDyingEmber) || fireworkSystem.burstParticles[0];
    const shortMaxLife = shortParticle.maxLife;
    fireworkSystem.clear();

    // Burst with 2.0x starLifeMultiplier
    fireworkSystem.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      { starLifeMultiplier: 2.0 },
      'test-long'
    );
    const longParticle = fireworkSystem.burstParticles.find(p => !p.isDyingEmber) || fireworkSystem.burstParticles[0];
    const longMaxLife = longParticle.maxLife;
    fireworkSystem.clear();

    // Burst with 5.0x starLifeMultiplier
    fireworkSystem.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xffaa00),
      'sphere',
      { starLifeMultiplier: 5.0 },
      'test-5x'
    );
    const ultraLongParticle = fireworkSystem.burstParticles.find(p => !p.isDyingEmber) || fireworkSystem.burstParticles[0];
    const ultraLongMaxLife = ultraLongParticle.maxLife;
    fireworkSystem.clear();

    expect(shortMaxLife).toBeLessThan(standardMaxLife * 0.75);
    expect(longMaxLife).toBeGreaterThan(standardMaxLife * 1.35);
    expect(ultraLongMaxLife).toBeGreaterThan(standardMaxLife * 3.2);
    expect(longParticle.isLongBurn).toBe(true);
    expect(ultraLongParticle.isLongBurn).toBe(true);
  });

  it('should gracefully fallback to longBurnMultiplier for legacy events with long-burn', () => {
    const scene = new THREE.Scene();
    const fireworkSystem = new FireworkSystem(scene);

    fireworkSystem.createBurst(
      new THREE.Vector3(0, 100, 0),
      new THREE.Color(0xff4400),
      'sphere',
      {
        effects: ['long-burn']
      },
      'test-legacy'
    );

    const legacyParticle = fireworkSystem.burstParticles[0];
    expect(legacyParticle.isLongBurn).toBe(true);
    expect(legacyParticle.maxLife).toBeGreaterThan(3.0);

    fireworkSystem.clear();
  });

  it('should configure soundVolume as slider before launchSound in soundSettings group', () => {
    const mockContainer = createMockElement('div');
    const inspector = new PropertyInspector(mockContainer, vi.fn());
    const eventGroups = inspector.getSchema().event;
    const soundGroup = eventGroups.find((g) => g.groupKey === 'soundSettings');

    expect(soundGroup).toBeDefined();
    expect(soundGroup.fields.length).toBeGreaterThan(0);

    const firstField = soundGroup.fields[0];
    expect(firstField.name).toBe('soundVolume');
    expect(firstField.type).toBe('slider');
    expect(firstField.min).toBe('0.0');
    expect(firstField.max).toBe('2.0');
    expect(firstField.step).toBe('0.05');
    expect(firstField.span).toBe(2);

    const secondField = soundGroup.fields[1];
    expect(secondField.name).toBe('launchSound');
  });

  it('should update both soundVolume and sound.volumeMultiplier when moving soundVolume slider', () => {
    vi.useFakeTimers();
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event = {
      sound: {
        volumeMultiplier: 0.8
      }
    };
    inspector.selectedEvent = event;

    const parentDiv = createMockElement('div');
    inspector.renderSlider(parentDiv, {
      name: 'soundVolume',
      labelKey: 'soundVolume',
      type: 'slider',
      min: '0.0',
      max: '2.0',
      step: '0.05',
      defaultValue: 1.0,
      formatValue: (v) => `${Number(v).toFixed(2)}x`
    });

    const badge = parentDiv.querySelector('.inspector-slider-value');
    const slider = parentDiv.querySelector('.inspector-slider');

    expect(badge.textContent).toBe('0.80x');
    expect(slider.value).toBe('0.8');

    // Drag slider to 1.5
    slider.value = '1.5';
    slider.dispatchEvent({ type: 'input', target: { value: '1.5' } });

    expect(badge.textContent).toBe('1.50x');
    expect(event.soundVolume).toBe(1.5);
    expect(event.sound.volumeMultiplier).toBe(1.5);

    vi.advanceTimersByTime(300);
    expect(onUpdate).toHaveBeenCalledWith();
    vi.useRealTimers();
  });
});
