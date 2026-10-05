import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getEffectPreview,
  PREVIEW_CATEGORIES,
  EFFECT_PREVIEW_METADATA
} from '../../src/config/effectPreviews.js';

describe('effectPreviews config', () => {
  it('should return valid metadata for known dynamic effects', () => {
    const willow = getEffectPreview('willow', PREVIEW_CATEGORIES.DYNAMICS);
    expect(willow).toBeDefined();
    expect(willow.name).toBe('Willow');
    expect(willow.videoUrl).toBe('previews/dynamics/willow.mp4');
    expect(willow.tags.length).toBeGreaterThan(0);
  });

  it('should return valid metadata for known shapes', () => {
    const heart = getEffectPreview('heart', PREVIEW_CATEGORIES.SHAPE);
    expect(heart).toBeDefined();
    expect(heart.name).toBe('Heart');
    expect(heart.videoUrl).toBe('previews/shapes/heart.mp4');
  });

  it('should return fallback object for unregistered keys without throwing', () => {
    const custom = getEffectPreview('custom-effect-xyz', PREVIEW_CATEGORIES.DYNAMICS);
    expect(custom).toBeDefined();
    expect(custom.name).toBe('Custom-effect-xyz');
    expect(custom.videoUrl).toBe('previews/dynamicss/custom-effect-xyz.mp4');
  });

  it('should resolve camelCase preset keys to correct video URLs', () => {
    const spiral = getEffectPreview('crysanthemumSpiral', PREVIEW_CATEGORIES.DYNAMICS);
    expect(spiral).toBeDefined();
    expect(spiral.videoUrl).toBe('previews/dynamics/crysanthemum-spiral.mp4');

    const smoke = getEffectPreview('crysanthemumSmoke', PREVIEW_CATEGORIES.DYNAMICS);
    expect(smoke).toBeDefined();
    expect(smoke.videoUrl).toBe('previews/dynamics/crysanthemum-smoke.mp4');
  });

  it('should return null if key is null or empty', () => {
    expect(getEffectPreview(null)).toBeNull();
    expect(getEffectPreview('')).toBeNull();
  });
});

describe('EffectPreviewTooltip Component', () => {
  let EffectPreviewTooltip;
  let tooltip;
  let listeners = {};

  beforeEach(async () => {
    listeners = {};
    const createMockElement = (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        innerHTML: '',
        textContent: '',
        children: [],
        parentElement: null,
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
        dispatchEvent: (event) => {
          const cbs = listeners[event.type] || [];
          cbs.forEach((cb) => cb(event));
        },
        play: vi.fn().mockResolvedValue(),
        pause: vi.fn(),
        load: vi.fn()
      };
      return el;
    };

    const mockBody = createMockElement('body');

    vi.stubGlobal('document', {
      createElement: (tag) => createMockElement(tag),
      body: mockBody,
      getElementById: () => createMockElement('div'),
      addEventListener: vi.fn()
    });

    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    const mod = await import('../../src/ui/EffectPreviewTooltip.js');
    EffectPreviewTooltip = mod.EffectPreviewTooltip;
    if (EffectPreviewTooltip.instance) {
      EffectPreviewTooltip.instance.destroy();
    }
    tooltip = new EffectPreviewTooltip();
  });

  afterEach(() => {
    if (tooltip) {
      tooltip.destroy();
    }
  });

  it('should initialize as a singleton with proper DOM structure', () => {
    const instance2 = EffectPreviewTooltip.getInstance();
    expect(instance2).toBe(tooltip);
    expect(tooltip.container).toBeDefined();
    expect(tooltip.container.id).toBe('effect-preview-tooltip');
  });

  it('should populate content and show tooltip when show() is called', () => {
    tooltip.show('willow', PREVIEW_CATEGORIES.DYNAMICS, 100, 100);

    expect(tooltip.isVisible).toBe(true);
    expect(tooltip.titleEl.textContent).toBe('Willow');
    expect(tooltip.container.style.opacity).toBe('1');
  });

  it('should handle video error gracefully without throwing exceptions', () => {
    tooltip.show('willow', PREVIEW_CATEGORIES.DYNAMICS, 100, 100);

    // Trigger video error listener across candidates
    for (let i = 0; i < 5; i++) {
      const errorListeners = [...(listeners['error'] || [])];
      errorListeners.forEach((fn) => fn({ type: 'error' }));
    }

    expect(tooltip.hasVideoError).toBe(true);
    expect(tooltip.videoEl.style.display).toBe('none');
    expect(tooltip.fallbackEl.style.display).toBe('flex');
    expect(tooltip.fallbackText.textContent).toContain('Video sample');
  });

  it('should hide smoothly when hide() is called', () => {
    tooltip.show('crossette', PREVIEW_CATEGORIES.DYNAMICS, 50, 50);
    expect(tooltip.isVisible).toBe(true);

    tooltip.hide();
    expect(tooltip.isVisible).toBe(false);
    expect(tooltip.container.style.opacity).toBe('0');
  });

  it('should clamp position within viewport bounds', () => {
    tooltip.updatePosition(window.innerWidth + 200, window.innerHeight + 200);

    const left = parseFloat(tooltip.container.style.left);
    const top = parseFloat(tooltip.container.style.top);

    expect(left).toBeLessThan(window.innerWidth);
    expect(top).toBeLessThan(window.innerHeight);
  });
});
