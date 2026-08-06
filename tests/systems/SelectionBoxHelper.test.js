import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectionBoxHelper } from '../../src/formation/ui/SelectionBoxHelper.js';

describe('SelectionBoxHelper', () => {
  let mockElement;
  let mockBody;

  beforeEach(() => {
    mockElement = {
      style: {},
      parentNode: {
        removeChild: vi.fn()
      }
    };
    mockBody = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    };

    vi.stubGlobal(
      'document',
      {
        createElement: vi.fn().mockReturnValue(mockElement),
        body: mockBody
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create and append a div to document.body on initialization', () => {
    const helper = new SelectionBoxHelper();
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(mockBody.appendChild).toHaveBeenCalledWith(mockElement);
    expect(mockElement.style.position).toBe('absolute');
    expect(mockElement.style.display).toBe('none');
  });

  it('should show the element with coordinates', () => {
    const helper = new SelectionBoxHelper();
    helper.show(
      100,
      200
    );
    expect(mockElement.style.left).toBe('100px');
    expect(mockElement.style.top).toBe('200px');
    expect(mockElement.style.width).toBe('0px');
    expect(mockElement.style.height).toBe('0px');
    expect(mockElement.style.display).toBe('block');
  });

  it('should update element coordinates', () => {
    const helper = new SelectionBoxHelper();
    helper.update(
      100,
      200,
      150,
      250
    );
    expect(mockElement.style.left).toBe('100px');
    expect(mockElement.style.top).toBe('200px');
    expect(mockElement.style.width).toBe('50px');
    expect(mockElement.style.height).toBe('50px');

    // Drag opposite way
    helper.update(
      100,
      200,
      50,
      150
    );
    expect(mockElement.style.left).toBe('50px');
    expect(mockElement.style.top).toBe('150px');
    expect(mockElement.style.width).toBe('50px');
    expect(mockElement.style.height).toBe('50px');
  });

  it('should hide the element', () => {
    const helper = new SelectionBoxHelper();
    helper.hide();
    expect(mockElement.style.display).toBe('none');
  });

  it('should remove the element from body when destroyed', () => {
    const helper = new SelectionBoxHelper();
    mockElement.parentNode.removeChild = vi.fn();
    helper.destroy();
    expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(mockElement);
  });
});
