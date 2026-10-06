import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CustomSelect } from '../../src/ui/CustomSelect.js';
import { PREVIEW_CATEGORIES } from '../../src/config/effectPreviews.js';
import { EffectPreviewTooltip } from '../../src/ui/EffectPreviewTooltip.js';

describe('CustomSelect Component', () => {
  let listeners = {};
  let showSpy;
  let hideSpy;

  beforeEach(() => {
    listeners = {};
    const createMockElement = (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        innerHTML: '',
        textContent: '',
        children: [],
        parentElement: null,
        dataset: {},
        appendChild: (child) => {
          el.children.push(child);
          child.parentElement = el;
          return child;
        },
        removeChild: (child) => {
          el.children = el.children.filter((c) => c !== child);
          child.parentElement = null;
        },
        setAttribute: vi.fn((attr, val) => {
          el[attr] = val;
        }),
        getAttribute: vi.fn((attr) => el[attr] || null),
        removeAttribute: vi.fn((attr) => {
          delete el[attr];
        }),
        addEventListener: (event, cb) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
        },
        contains: (target) => el === target || el.children.includes(target),
        querySelectorAll: (selector) => {
          return el.children.filter((c) => c.className && c.className.includes(selector.replace('.', '')));
        },
        querySelector: (selector) => {
          return el.children.find((c) => c.className && c.className.includes(selector.replace('.', ''))) || null;
        },
        getBoundingClientRect: () => ({
          top: 100,
          bottom: 130,
          left: 50,
          right: 250,
          width: 200,
          height: 30
        }),
        focus: vi.fn()
      };
      return el;
    };

    const mockBody = createMockElement('body');

    vi.stubGlobal('document', {
      createElement: (tag) => createMockElement(tag),
      body: mockBody,
      addEventListener: (event, cb) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      },
      removeEventListener: vi.fn(),
      querySelectorAll: () => []
    });

    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    showSpy = vi.spyOn(EffectPreviewTooltip.getInstance(), 'show').mockImplementation(() => {});
    hideSpy = vi.spyOn(EffectPreviewTooltip.getInstance(), 'hide').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize trigger and render options list', () => {
    const options = [
      { value: 'sphere', label: 'Sphere' },
      { value: 'heart', label: 'Heart' },
      { value: 'ring', label: 'Ring' }
    ];

    const select = new CustomSelect({
      options,
      value: 'heart',
      category: PREVIEW_CATEGORIES.SHAPE
    });

    expect(select.element).toBeDefined();
    expect(select.value).toBe('heart');
    expect(select.triggerText.textContent).toBe('Heart');
  });

  it('should toggle open/close menu state', () => {
    const select = new CustomSelect({
      options: ['willow', 'crossette'],
      value: 'willow'
    });

    expect(select.isOpen).toBe(false);
    select.open();
    expect(select.isOpen).toBe(true);
    expect(select.menu.style.display).toBe('block');

    select.close();
    expect(select.isOpen).toBe(false);
    expect(select.menu.style.display).toBe('none');
  });

  it('should trigger onChange and update value when an option is selected', () => {
    const onChange = vi.fn();
    const select = new CustomSelect({
      options: [
        { value: 'flow', label: 'Flow' },
        { value: 'wave', label: 'Wave' }
      ],
      value: 'flow',
      onChange
    });

    select.setValue('wave', true);
    expect(select.value).toBe('wave');
    expect(onChange).toHaveBeenCalledWith('wave');
  });

  it('should cleanup event listeners on destroy()', () => {
    const select = new CustomSelect({
      options: ['a', 'b'],
      value: 'a'
    });

    expect(() => select.destroy()).not.toThrow();
  });
});
