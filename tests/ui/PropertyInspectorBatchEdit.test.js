import { describe, it, expect, vi, beforeAll } from 'vitest';

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

describe('PropertyInspector Batch Property Editing', () => {
  let PropertyInspector;

  const createMockElement = (tag = 'div') => {
    let _innerHTML = '';
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      textContent: '',
      children: [],
      parentElement: null,
      dataset: {},
      className: '',
      value: '',
      disabled: false,
      placeholder: '',
      indeterminate: false,
      checked: false,
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
        const eventObj = typeof evt === 'string' ? { type: evt, target: el } : { target: el, ...evt };
        if (el._listeners && el._listeners[type]) {
          el._listeners[type].forEach((cb) => cb(eventObj));
        }
      },
      querySelector: (selector) => {
        const isClass = selector.startsWith('.');
        const target = isClass ? selector.slice(1) : selector.toLowerCase();
        const findRecursive = (node) => {
          if (isClass && node.className && node.className.split(' ').includes(target)) {
            return node;
          }
          if (!isClass && node.tagName && node.tagName.toLowerCase() === target) {
            return node;
          }
          for (const child of node.children) {
            const found = findRecursive(child);
            if (found) return found;
          }
          return null;
        };
        return findRecursive(el);
      },
      querySelectorAll: (selector) => {
        const results = [];
        const isClass = selector.startsWith('.');
        const target = isClass ? selector.slice(1) : selector.toLowerCase();
        const search = (node) => {
          for (const child of node.children) {
            if (isClass && child.className && child.className.split(' ').includes(target)) {
              results.push(child);
            } else if (!isClass && child.tagName && child.tagName.toLowerCase() === target) {
              results.push(child);
            }
            search(child);
          }
        };
        search(el);
        return results;
      },
      closest: (selector) => {
        const isClass = selector.startsWith('.');
        const target = isClass ? selector.slice(1) : selector.toLowerCase();
        let current = el.parentElement;
        while (current) {
          if (isClass && current.className && current.className.split(' ').includes(target)) {
            return current;
          }
          if (!isClass && current.tagName && current.tagName.toLowerCase() === target) {
            return current;
          }
          current = current.parentElement;
        }
        return null;
      }
    };

    Object.defineProperty(el, 'innerHTML', {
      get: () => _innerHTML,
      set: (val) => {
        _innerHTML = val;
        if (val === '') {
          el.children = [];
        }
      }
    });

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
  });

  it('should correctly detect batch mode and batch targets', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', time: 1.0, duration: 2.0, count: 5 };
    const event2 = { id: 'evt-2', time: 3.5, duration: 2.0, count: 10 };

    // Single mode: only selectedEvent is set
    inspector.show(event1, null);
    expect(inspector.isBatchMode()).toBe(false);
    expect(inspector.getBatchTargets()).toEqual([event1]);

    // Batch mode: multiple selected events passed
    inspector.show(event1, [event1, event2]);
    expect(inspector.isBatchMode()).toBe(true);
    expect(inspector.getBatchTargets()).toEqual([event1, event2]);

    // When hidden: clears batch state
    inspector.hide();
    expect(inspector.isBatchMode()).toBe(false);
    expect(inspector.getBatchTargets()).toEqual([]);
  });

  it('should determine common and mixed values across selected events', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = {
      id: 'evt-1',
      duration: 3.0,
      count: 20,
      color: '#ff0000',
      useAngle: true
    };
    const event2 = {
      id: 'evt-2',
      duration: 3.0,
      count: 40,
      color: '#ff0000',
      useAngle: false
    };

    inspector.show(event1, [event1, event2]);

    // Duration is identical -> common value exists, not mixed
    expect(inspector.isMixedValue('duration')).toBe(false);
    expect(inspector.getCommonValue('duration')).toBe(3.0);

    // Color is identical -> not mixed
    expect(inspector.isMixedValue('color')).toBe(false);
    expect(inspector.getCommonValue('color')).toBe('#ff0000');

    // Count is different -> mixed
    expect(inspector.isMixedValue('count')).toBe(true);
    expect(inspector.getCommonValue('count')).toBeUndefined();

    // Checkbox useAngle is different -> mixed
    expect(inspector.isMixedValue('useAngle')).toBe(true);
    expect(inspector.getCommonValue('useAngle')).toBeUndefined();
  });

  it('should render batch header with block count and batch banner in batch mode', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', time: 1.0, type: 'shell' };
    const event2 = { id: 'evt-2', time: 2.0, type: 'shell' };
    const event3 = { id: 'evt-3', time: 3.0, type: 'shell' };

    inspector.show(event1, [event1, event2, event3]);

    const titleEl = inspector.container.querySelector('.inspector-title');
    expect(titleEl).toBeDefined();
    // Header should contain batch count "3"
    expect(titleEl.textContent).toContain('3');

    // Batch banner should be displayed
    const batchBanner = inspector.container.querySelector('.inspector-batch-banner');
    expect(batchBanner).toBeDefined();
    expect(batchBanner.children[0].textContent).toContain('3');
  });

  it('should disable time input in batch mode and preserve individual timestamps', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', time: 1.25, duration: 2.0 };
    const event2 = { id: 'evt-2', time: 4.80, duration: 2.0 };

    inspector.show(event1, [event1, event2]);

    const parentDiv = createMockElement('div');
    inspector.renderStandardInput(
      parentDiv,
      { name: 'time', labelKey: 'time', type: 'number' },
      event1
    );

    const timeInput = parentDiv.querySelector('.inspector-input');
    expect(timeInput).toBeDefined();
    expect(timeInput.disabled).toBe(true);
    expect(timeInput.value).toBe('');
    expect(timeInput.placeholder).toContain('Time');

    // Timestamps must remain unmodified
    expect(event1.time).toBe(1.25);
    expect(event2.time).toBe(4.80);
  });

  it('should batch update standard numeric inputs across all selected events', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', duration: 1.5, count: 10 };
    const event2 = { id: 'evt-2', duration: 2.5, count: 20 };
    const event3 = { id: 'evt-3', duration: 3.5, count: 30 };

    inspector.show(event1, [event1, event2, event3]);

    const parentDiv = createMockElement('div');
    inspector.renderStandardInput(
      parentDiv,
      { name: 'duration', labelKey: 'duration', type: 'number', step: '0.1' },
      event1
    );

    const durationInput = parentDiv.querySelector('.inspector-input');
    expect(durationInput).toBeDefined();
    // Initially mixed duration
    expect(durationInput.placeholder).toBe('Mixed Values');

    // User inputs new duration for all blocks
    durationInput.value = '4.2';
    durationInput.dispatchEvent({ type: 'change' });

    // All events should now have the updated duration
    expect(event1.duration).toBe(4.2);
    expect(event2.duration).toBe(4.2);
    expect(event3.duration).toBe(4.2);

    expect(onUpdate).toHaveBeenCalledWith('beforeChange');
  });

  it('should batch update sliders across all selected events', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', shellSize: 1.0, starLifeMultiplier: 1.0 };
    const event2 = { id: 'evt-2', shellSize: 1.5, starLifeMultiplier: 1.2 };

    inspector.show(event1, [event1, event2]);

    const parentDiv = createMockElement('div');
    inspector.renderSlider(
      parentDiv,
      {
        name: 'shellSize',
        labelKey: 'shellSize',
        min: '0.2',
        max: '3.0',
        step: '0.1',
        defaultValue: 1.0
      },
      event1
    );

    const slider = parentDiv.querySelector('.inspector-slider');
    expect(slider).toBeDefined();

    // User updates slider value
    slider.value = '2.4';
    slider.dispatchEvent({ type: 'input' });

    expect(event1.shellSize).toBe(2.4);
    expect(event2.shellSize).toBe(2.4);
  });

  it('should batch update color badges across all selected events', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', color: 'red' };
    const event2 = { id: 'evt-2', color: 'blue' };
    const event3 = { id: 'evt-3' };

    inspector.show(event1, [event1, event2, event3]);

    const parentDiv = createMockElement('div');
    inspector.renderColorBadges(parentDiv);

    const badgesContainer = parentDiv.querySelector('.color-badge-container');
    expect(badgesContainer).toBeDefined();
    expect(badgesContainer.children.length).toBeGreaterThan(0);

    // Click the first color badge (e.g. red)
    const firstBadge = badgesContainer.children[0];
    firstBadge.dispatchEvent({ type: 'click' });

    // All events should now share the selected color
    expect(event1.color).toBeDefined();
    expect(event2.color).toBe(event1.color);
    expect(event3.color).toBe(event1.color);
  });

  it('should batch update toggle modifier chips across all selected events', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', burstSmoke: true, 'burst-smoke': true };
    const event2 = { id: 'evt-2' };

    inspector.show(event1, [event1, event2]);

    const parentDiv = createMockElement('div');
    inspector.renderToggleModifiers(parentDiv, event1);

    const wrapper = parentDiv.children[0];
    const chips = wrapper.children[1].children;
    const burstSmokeChip = chips.find((c) => c.dataset.key === 'burst-smoke');
    expect(burstSmokeChip).toBeDefined();

    // Initially mixed (event1 has burst-smoke, event2 does not)
    // First click should activate for ALL events (since not all are active)
    burstSmokeChip.dispatchEvent({ type: 'click' });
    expect(event1.burstSmoke).toBe(true);
    expect(event2.burstSmoke).toBe(true);

    // Second click should deactivate for ALL events
    burstSmokeChip.dispatchEvent({ type: 'click' });
    expect(event1.burstSmoke).toBeUndefined();
    expect(event2.burstSmoke).toBeUndefined();
  });

  it('should handle checkboxes with indeterminate state and batch toggle across all selected events', () => {
    const mockContainer = createMockElement('div');
    const onUpdate = vi.fn();
    const inspector = new PropertyInspector(mockContainer, onUpdate);

    const event1 = { id: 'evt-1', secondBurstEnabled: true };
    const event2 = { id: 'evt-2', secondBurstEnabled: false };

    inspector.show(event1, [event1, event2]);

    const parentDiv = createMockElement('div');
    inspector.renderCheckbox(
      parentDiv,
      { name: 'secondBurstEnabled', labelKey: 'secondBurstEnabled' },
      event1
    );

    const checkbox = parentDiv.querySelector('.inspector-checkbox');
    expect(checkbox).toBeDefined();
    expect(checkbox.indeterminate).toBe(true);

    // User checks the checkbox
    checkbox.checked = true;
    checkbox.dispatchEvent({ type: 'change' });

    expect(event1.secondBurstEnabled).toBe(true);
    expect(event2.secondBurstEnabled).toBe(true);
  });
});
