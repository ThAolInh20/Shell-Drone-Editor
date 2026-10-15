import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';

let store = {};
global.localStorage = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, val) => {
    store[key] = String(val);
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  })
};

describe('TimelineTourGuide Component', () => {
  let TimelineTourGuide;
  let globalEventBus;
  let mockTimelineEditor;
  let tourGuide;
  let domElements = [];

  beforeAll(async () => {
    const tourMod = await import('../../src/ui/TimelineTourGuide.js');
    TimelineTourGuide = tourMod.TimelineTourGuide;
    const busMod = await import('../../src/core/EventBus.js');
    globalEventBus = busMod.globalEventBus;
  });

  const createMockElement = (tag = 'div') => {
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      className: '',
      textContent: '',
      innerHTML: '',
      children: [],
      parentElement: null,
      offsetHeight: 180,
      offsetWidth: 320,
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
        domElements = domElements.filter((item) => item !== el);
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      querySelector: vi.fn(() => createMockElement('div')),
      getBoundingClientRect: vi.fn(() => ({
        top: 100,
        bottom: 200,
        left: 50,
        right: 450,
        width: 400,
        height: 100
      }))
    };
    return el;
  };

  beforeEach(() => {
    store = {};
    domElements = [];

    const mockBody = {
      appendChild: vi.fn((el) => {
        domElements.push(el);
        el.parentElement = mockBody;
        return el;
      }),
      removeChild: vi.fn((el) => {
        domElements = domElements.filter((item) => item !== el);
        el.parentElement = null;
      })
    };

    global.document = {
      body: mockBody,
      createElement: vi.fn((tag) => createMockElement(tag)),
      querySelector: vi.fn((sel) => {
        const cls = sel.replace('.', '');
        return domElements.find((el) => el.className && el.className.includes(cls)) || null;
      })
    };

    global.window = {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    mockTimelineEditor = {
      visible: false,
      toggle: vi.fn(function () {
        this.visible = !this.visible;
      }),
      toolbar: createMockElement('div'),
      ruler: createMockElement('div'),
      dataActionsGroup: createMockElement('div'),
      trackContainer: createMockElement('div'),
      tracksArea: createMockElement('div'),
      inspectorContainer: createMockElement('div')
    };

    tourGuide = new TimelineTourGuide(mockTimelineEditor);
  });

  afterEach(() => {
    if (tourGuide.isActive) {
      tourGuide.finishTour('dismissed');
    }
  });

  it('should initialize with 6 valid tour steps', () => {
    const steps = tourGuide.getSteps();
    expect(steps.length).toBe(6);
    expect(steps[0].id).toBe('toolbar');
    expect(steps[1].id).toBe('ruler');
    expect(steps[2].id).toBe('dataActions');
    expect(steps[3].id).toBe('tracks');
    expect(steps[4].id).toBe('beat');
    expect(steps[5].id).toBe('block');

    steps.forEach((step) => {
      expect(step.title).toBeDefined();
      expect(step.desc).toBeDefined();
      expect(typeof step.getTarget).toBe('function');
      expect(step.getTarget()).toBeDefined();
    });
  });

  it('should display promptFirstTimeTour when status is unset', () => {
    tourGuide.promptFirstTimeTour();
    expect(tourGuide.promptBanner).not.toBeNull();
    expect(tourGuide.promptBanner.className).toBe('timeline-tour-prompt-banner');
  });

  it('should not display promptFirstTimeTour if status is already set', () => {
    store['timeline_tour_status'] = 'completed';
    tourGuide.promptFirstTimeTour();
    expect(tourGuide.promptBanner).toBeNull();
  });

  it('should start tour, make timeline visible, and initialize DOM elements', () => {
    const emitSpy = vi.spyOn(globalEventBus, 'emit');
    tourGuide.startTour();

    expect(mockTimelineEditor.toggle).toHaveBeenCalled();
    expect(tourGuide.isActive).toBe(true);
    expect(tourGuide.currentStepIndex).toBe(0);

    expect(tourGuide.overlayElement).not.toBeNull();
    expect(tourGuide.highlightBox).not.toBeNull();
    expect(tourGuide.tooltipCard).not.toBeNull();
    expect(emitSpy).toHaveBeenCalledWith('timeline:tour-start');
  });

  it('should navigate through steps and finish tour on last step', () => {
    tourGuide.startTour();

    expect(tourGuide.currentStepIndex).toBe(0);
    tourGuide.showStep(1);
    expect(tourGuide.currentStepIndex).toBe(1);

    tourGuide.showStep(5);
    expect(tourGuide.currentStepIndex).toBe(5);

    tourGuide.finishTour('completed');
    expect(tourGuide.isActive).toBe(false);
    expect(store['timeline_tour_status']).toBe('completed');
    expect(tourGuide.overlayElement).toBeNull();
  });

  it('should handle keyboard navigation correctly', () => {
    tourGuide.startTour();
    expect(tourGuide.currentStepIndex).toBe(0);

    tourGuide.handleKeyDown({ key: 'ArrowRight', stopPropagation: vi.fn(), preventDefault: vi.fn() });
    expect(tourGuide.currentStepIndex).toBe(1);

    tourGuide.handleKeyDown({ key: 'ArrowLeft', stopPropagation: vi.fn(), preventDefault: vi.fn() });
    expect(tourGuide.currentStepIndex).toBe(0);

    tourGuide.handleKeyDown({ key: 'Escape', stopPropagation: vi.fn(), preventDefault: vi.fn() });
    expect(tourGuide.isActive).toBe(false);
    expect(store['timeline_tour_status']).toBe('dismissed');
  });

  it('should react to timeline:request-tour global event', () => {
    const startTourSpy = vi.spyOn(tourGuide, 'startTour');
    globalEventBus.emit('timeline:request-tour');
    expect(startTourSpy).toHaveBeenCalled();
  });
});
