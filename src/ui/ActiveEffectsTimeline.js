import { t } from '../config/lang/i18n.js';
import en from '../config/lang/en.js';
import { EffectPreviewTooltip } from './EffectPreviewTooltip.js';
import { PREVIEW_CATEGORIES } from '../config/effectPreviews.js';

export const EFFECT_COLORS = {
  'strobe': { bg: 'rgba(255, 215, 0, 0.35)', border: '#ffd700', text: '#ffea70' },
  'white-strobe': { bg: 'rgba(240, 248, 255, 0.45)', border: '#ffffff', text: '#ffffff' },
  'glitter-strobe': { bg: 'rgba(0, 230, 255, 0.35)', border: '#00e5ff', text: '#67e8f9' },
  'crackle': { bg: 'rgba(255, 120, 0, 0.38)', border: '#ff8c00', text: '#fdba74' },
  'ghost': { bg: 'rgba(168, 85, 247, 0.38)', border: '#a855f7', text: '#d8b4fe' },
  'ghost-flare': { bg: 'rgba(192, 132, 252, 0.38)', border: '#c084fc', text: '#e9d5ff' },
  'flow': { bg: 'rgba(52, 211, 153, 0.38)', border: '#34d399', text: '#a7f3d0' },
  'crossette': { bg: 'rgba(56, 189, 248, 0.38)', border: '#38bdf8', text: '#7dd3fc' },
  'tadpole-flurry': { bg: 'rgba(244, 63, 94, 0.38)', border: '#f43f5e', text: '#fda4af' },
  'erratic-dart': { bg: 'rgba(163, 230, 53, 0.38)', border: '#a3e635', text: '#bef264' },
  'long-burn': { bg: 'rgba(249, 115, 22, 0.38)', border: '#f97316', text: '#fdba74' },
  'apex-hang': { bg: 'rgba(236, 72, 153, 0.38)', border: '#ec4899', text: '#f472b6' },
  'slow-burst': { bg: 'rgba(186, 230, 253, 0.38)', border: '#38bdf8', text: '#bae6fd' },
  'burst-smoke': { bg: 'rgba(148, 163, 184, 0.38)', border: '#94a3b8', text: '#cbd5e1' },
  'burst_smoke': { bg: 'rgba(148, 163, 184, 0.38)', border: '#94a3b8', text: '#cbd5e1' },
  'burstSmoke': { bg: 'rgba(148, 163, 184, 0.38)', border: '#94a3b8', text: '#cbd5e1' }
};

export function createSvgIcon(type, size = 14) {
  let svg;
  if (typeof document.createElementNS === 'function') {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  } else {
    svg = document.createElement('div');
  }
  if (svg.setAttribute) {
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.style = svg.style || {};
  svg.style.display = 'block';
  svg.style.pointerEvents = 'none';

  if (type === 'expand') {
    svg.innerHTML = '<polyline points="15 3 21 3 21 9"></polyline>' +
      '<polyline points="9 21 3 21 3 15"></polyline>' +
      '<line x1="21" y1="3" x2="14" y2="10"></line>' +
      '<line x1="3" y1="21" x2="10" y2="14"></line>';
  } else if (type === 'collapse') {
    svg.innerHTML = '<polyline points="4 14 10 14 10 20"></polyline>' +
      '<polyline points="20 10 14 10 14 4"></polyline>' +
      '<line x1="14" y1="10" x2="21" y2="3"></line>' +
      '<line x1="3" y1="21" x2="10" y2="14"></line>';
  } else if (type === 'plus') {
    svg.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line>' +
      '<line x1="5" y1="12" x2="19" y2="12"></line>';
  } else if (type === 'close') {
    svg.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line>' +
      '<line x1="6" y1="6" x2="18" y2="18"></line>';
  }
  return svg;
}

export class ActiveEffectsTimeline {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      getDuration: () => 2.3,
      getEffects: () => [],
      onChange: () => {},
      availableEffectTags: [],
      ...options
    };

    this.expandedModal = null;
    this.activeDrag = null;
    this.effects = this.loadEffects();

    this.onWindowMouseMove = this.onMouseMove.bind(this);
    this.onWindowMouseUp = this.onMouseUp.bind(this);

    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);

    this.render();
  }

  destroy() {
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    this.closeExpandedModal();
  }

  loadEffects() {
    const raw = this.options.getEffects?.() || [];
    const duration = Math.max(0.5, Number(this.options.getDuration?.()) || 2.3);

    return raw.map((e) => {
      if (typeof e === 'string') {
        return {
          type: e,
          startRatio: 0.1,
          endRatio: 0.5,
          start: Math.round(duration * 0.1 * 100) / 100,
          end: Math.round(duration * 0.5 * 100) / 100
        };
      }
      const type = e.type || e.key || 'standard';
      let startRatio = e.startRatio !== undefined ? Number(e.startRatio) : undefined;
      let endRatio = e.endRatio !== undefined ? Number(e.endRatio) : undefined;
      let start = e.start !== undefined ? Number(e.start) : undefined;
      let end = e.end !== undefined ? Number(e.end) : undefined;

      if (startRatio === undefined) {
        startRatio = start !== undefined ? Math.max(0, Math.min(1.0, start / duration)) : 0.1;
      }
      if (endRatio === undefined) {
        endRatio = end !== undefined ? Math.max(0, Math.min(1.0, end / duration)) : 0.5;
      }

      startRatio = Math.max(0, Math.min(0.95, startRatio));
      endRatio = Math.min(1.0, Math.max(startRatio + 0.05, endRatio));

      start = Math.round(startRatio * duration * 100) / 100;
      end = Math.round(endRatio * duration * 100) / 100;

      return {
        type,
        startRatio: Math.round(startRatio * 100) / 100,
        endRatio: Math.round(endRatio * 100) / 100,
        start,
        end
      };
    });
  }

  commitChanges() {
    const duration = Math.max(0.5, Number(this.options.getDuration?.()) || 2.3);
    this.effects.forEach((eff) => {
      eff.startRatio = Math.max(0, Math.min(0.95, Math.round(Number(eff.startRatio || 0) * 100) / 100));
      eff.endRatio = Math.min(1.0, Math.max(eff.startRatio + 0.05, Math.round(Number(eff.endRatio || 1.0) * 100) / 100));
      eff.start = Math.round(eff.startRatio * duration * 100) / 100;
      eff.end = Math.round(eff.endRatio * duration * 100) / 100;
    });

    const exportList = this.effects.map((e) => ({
      type: e.type,
      startRatio: e.startRatio,
      endRatio: e.endRatio,
      start: e.start,
      end: e.end
    }));

    if (typeof this.options.onChange === 'function') {
      this.options.onChange(exportList);
    }
  }

  getEffectColor(type) {
    return EFFECT_COLORS[type] || {
      bg: 'rgba(0, 229, 255, 0.35)',
      border: '#00e5ff',
      text: '#67e8f9'
    };
  }

  getEffectLabel(key) {
    const found = this.options.availableEffectTags?.find((e) => e.key === key);
    if (found?.labelKey) {
      return t(`editor.inspector.fields.${found.labelKey}`) ||
        en?.editor?.inspector?.fields?.[found.labelKey] ||
        key;
    }
    return key;
  }

  render() {
    this.container.innerHTML = '';
    if (!this.activeDrag) {
      this.effects = this.loadEffects();
    }
    const duration = Math.max(0.5, Number(this.options.getDuration?.()) || 2.3);

    // 1. Header with Title & Action Icons
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '6px';

    const titleRow = document.createElement('div');
    titleRow.style.display = 'flex';
    titleRow.style.alignItems = 'center';
    titleRow.style.gap = '6px';

    const title = document.createElement('label');
    title.className = 'inspector-label';
    title.style.margin = '0';
    title.style.fontWeight = '600';
    title.style.fontSize = '12px';
    title.style.color = '#e2e8f0';
    const rawTitle = t('editor.inspector.activeEffects');
    title.textContent = (rawTitle && rawTitle !== 'editor.inspector.activeEffects')
      ? rawTitle
      : 'Active Effects';
    titleRow.appendChild(title);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.alignItems = 'center';
    actions.style.gap = '4px';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'inspector-icon-btn';
    addBtn.title = t('editor.inspector.addActiveEffect') || 'Add Active Effect';
    addBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    addBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    addBtn.style.borderRadius = '4px';
    addBtn.style.color = '#fff';
    addBtn.style.cursor = 'pointer';
    addBtn.style.padding = '4px 6px';
    addBtn.style.display = 'flex';
    addBtn.style.alignItems = 'center';
    addBtn.style.justifyContent = 'center';
    addBtn.style.transition = 'all 0.15s ease';
    addBtn.appendChild(createSvgIcon('plus', 13));

    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.background = 'rgba(0, 229, 255, 0.2)';
      addBtn.style.borderColor = '#00e5ff';
      addBtn.style.color = '#00e5ff';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.background = 'rgba(255, 255, 255, 0.08)';
      addBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      addBtn.style.color = '#fff';
    });
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showAddEffectMenu(addBtn);
    });

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'inspector-icon-btn';
    expandBtn.title = t('editor.inspector.expandActiveEffectsTimeline') || 'Expand Timeline';
    expandBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    expandBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    expandBtn.style.borderRadius = '4px';
    expandBtn.style.color = '#fff';
    expandBtn.style.cursor = 'pointer';
    expandBtn.style.padding = '4px 6px';
    expandBtn.style.display = 'flex';
    expandBtn.style.alignItems = 'center';
    expandBtn.style.justifyContent = 'center';
    expandBtn.style.transition = 'all 0.15s ease';
    expandBtn.appendChild(createSvgIcon('expand', 13));

    expandBtn.addEventListener('mouseenter', () => {
      expandBtn.style.background = 'rgba(0, 229, 255, 0.2)';
      expandBtn.style.borderColor = '#00e5ff';
      expandBtn.style.color = '#00e5ff';
    });
    expandBtn.addEventListener('mouseleave', () => {
      expandBtn.style.background = 'rgba(255, 255, 255, 0.08)';
      expandBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      expandBtn.style.color = '#fff';
    });
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openExpandedModal();
    });

    actions.appendChild(addBtn);
    actions.appendChild(expandBtn);
    header.appendChild(titleRow);
    header.appendChild(actions);
    this.container.appendChild(header);

    // 2. Compact Slider Track
    const trackWrapper = document.createElement('div');
    trackWrapper.style.position = 'relative';
    trackWrapper.style.width = '100%';
    trackWrapper.style.background = 'rgba(10, 14, 20, 0.8)';
    trackWrapper.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    trackWrapper.style.borderRadius = '6px';
    trackWrapper.style.padding = '4px 6px';
    trackWrapper.style.boxSizing = 'border-box';

    // Time scale indicators showing both % and seconds
    const timeScale = document.createElement('div');
    timeScale.style.display = 'flex';
    timeScale.style.justifyContent = 'space-between';
    timeScale.style.fontSize = '9px';
    timeScale.style.color = 'rgba(255, 255, 255, 0.55)';
    timeScale.style.marginBottom = '4px';
    timeScale.style.userSelect = 'none';

    const startLabel = document.createElement('span');
    startLabel.textContent = '0% (0.0s)';
    const midLabel = document.createElement('span');
    midLabel.textContent = `50% (${(duration * 0.5).toFixed(1)}s)`;
    const endLabel = document.createElement('span');
    endLabel.textContent = `100% (${duration.toFixed(1)}s)`;

    timeScale.appendChild(startLabel);
    timeScale.appendChild(midLabel);
    timeScale.appendChild(endLabel);
    trackWrapper.appendChild(timeScale);

    // Main Lane Container
    const laneContainer = document.createElement('div');
    laneContainer.style.position = 'relative';
    laneContainer.style.width = '100%';
    laneContainer.style.height = this.effects.length > 0
      ? `${Math.max(26, this.effects.length * 24)}px`
      : '28px';
    laneContainer.style.background = 'rgba(255, 255, 255, 0.03)';
    laneContainer.style.borderRadius = '4px';
    laneContainer.style.overflow = 'hidden';

    if (this.effects.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.style.position = 'absolute';
      emptyNote.style.inset = '0';
      emptyNote.style.display = 'flex';
      emptyNote.style.alignItems = 'center';
      emptyNote.style.justifyContent = 'center';
      emptyNote.style.fontSize = '10px';
      emptyNote.style.color = 'rgba(255, 255, 255, 0.4)';
      emptyNote.style.fontStyle = 'italic';
      emptyNote.style.userSelect = 'none';
      emptyNote.textContent = t('editor.inspector.noActiveEffects') || 'No active effects';
      laneContainer.appendChild(emptyNote);
    } else {
      this.effects.forEach((eff, index) => {
        const block = this.createEffectBlock(eff, index, duration, laneContainer, false);
        laneContainer.appendChild(block);
      });
    }

    trackWrapper.appendChild(laneContainer);
    this.container.appendChild(trackWrapper);
  }

  createEffectBlock(eff, index, duration, containerEl, isExpanded = false, modalInputs = null) {
    const type = eff.type || eff.key;
    const startPct = Math.round(eff.startRatio * 100);
    const endPct = Math.round(eff.endRatio * 100);
    const color = this.getEffectColor(type);
    const label = this.getEffectLabel(type);

    const block = document.createElement('div');
    block.className = 'inspector-effect-block';
    block.style.position = 'absolute';
    block.style.top = isExpanded ? '4px' : `${index * 23 + 2}px`;
    block.style.height = isExpanded ? '26px' : '20px';
    block.style.left = `${eff.startRatio * 100}%`;
    block.style.width = `${Math.max(4, (eff.endRatio - eff.startRatio) * 100)}%`;
    block.style.background = color.bg;
    block.style.border = `1px solid ${color.border}`;
    block.style.borderRadius = '4px';
    block.style.boxSizing = 'border-box';
    block.style.display = 'flex';
    block.style.alignItems = 'center';
    block.style.justifyContent = 'space-between';
    block.style.padding = '0 4px';
    block.style.color = color.text;
    block.style.fontSize = '10px';
    block.style.userSelect = 'none';
    block.style.cursor = 'grab';
    block.style.zIndex = '5';
    block.title = `${label}: ${startPct}% (~${eff.start.toFixed(1)}s) - ${endPct}% (~${eff.end.toFixed(1)}s)`;

    EffectPreviewTooltip.getInstance().bindElement(block, type, PREVIEW_CATEGORIES.OPTICAL_EFFECT);

    // Left Resize Handle
    const leftHandle = document.createElement('div');
    leftHandle.style.position = 'absolute';
    leftHandle.style.left = '0';
    leftHandle.style.top = '0';
    leftHandle.style.bottom = '0';
    leftHandle.style.width = '7px';
    leftHandle.style.cursor = 'ew-resize';
    leftHandle.style.zIndex = '10';

    // Right Resize Handle
    const rightHandle = document.createElement('div');
    rightHandle.style.position = 'absolute';
    rightHandle.style.right = '0';
    rightHandle.style.top = '0';
    rightHandle.style.bottom = '0';
    rightHandle.style.width = '7px';
    rightHandle.style.cursor = 'ew-resize';
    rightHandle.style.zIndex = '10';

    // Text Span
    const textSpan = document.createElement('span');
    textSpan.style.whiteSpace = 'nowrap';
    textSpan.style.overflow = 'hidden';
    textSpan.style.textOverflow = 'ellipsis';
    textSpan.style.pointerEvents = 'none';
    textSpan.style.marginRight = '4px';
    textSpan.textContent = `${label} (${startPct}% - ${endPct}%)`;

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = t('editor.inspector.removeEffect') || 'Remove effect';
    removeBtn.style.background = 'transparent';
    removeBtn.style.border = 'none';
    removeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
    removeBtn.style.fontSize = '12px';
    removeBtn.style.lineHeight = '1';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.padding = '0 2px';
    removeBtn.style.zIndex = '11';

    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.color = '#ff6b6b';
    });
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
    });
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeEffect(eff);
    });

    leftHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.startDrag(e, 'resize-start', eff, containerEl, duration, block, textSpan, modalInputs);
    });

    rightHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.startDrag(e, 'resize-end', eff, containerEl, duration, block, textSpan, modalInputs);
    });

    block.addEventListener('mousedown', (e) => {
      if (e.target === leftHandle || e.target === rightHandle || e.target === removeBtn) {
        return;
      }
      e.stopPropagation();
      this.startDrag(e, 'shift', eff, containerEl, duration, block, textSpan, modalInputs);
    });

    block.appendChild(leftHandle);
    block.appendChild(textSpan);
    block.appendChild(removeBtn);
    block.appendChild(rightHandle);
    return block;
  }

  startDrag(e, mode, eff, containerEl, duration, blockEl, textSpanEl, modalInputs = null) {
    const rect = containerEl.getBoundingClientRect();
    this.activeDrag = {
      mode,
      eff,
      blockEl,
      textSpanEl,
      modalInputs,
      containerRect: rect,
      duration,
      startX: e.clientX,
      origStartRatio: eff.startRatio,
      origEndRatio: eff.endRatio
    };
    document.body.style.cursor = mode === 'shift' ? 'grabbing' : 'ew-resize';
  }

  onMouseMove(e) {
    if (!this.activeDrag) return;
    const { mode, eff, blockEl, textSpanEl, modalInputs, containerRect, duration, startX, origStartRatio, origEndRatio } = this.activeDrag;
    const deltaPixels = e.clientX - startX;
    const containerWidth = Math.max(1, containerRect.width || 200);
    const deltaRatio = deltaPixels / containerWidth;

    if (mode === 'resize-start') {
      let newStartRatio = Math.round((origStartRatio + deltaRatio) * 100) / 100;
      newStartRatio = Math.max(0, Math.min(origEndRatio - 0.05, newStartRatio));
      eff.startRatio = newStartRatio;
      eff.start = Math.round(newStartRatio * duration * 100) / 100;
    } else if (mode === 'resize-end') {
      let newEndRatio = Math.round((origEndRatio + deltaRatio) * 100) / 100;
      newEndRatio = Math.min(1.0, Math.max(origStartRatio + 0.05, newEndRatio));
      eff.endRatio = newEndRatio;
      eff.end = Math.round(newEndRatio * duration * 100) / 100;
    } else if (mode === 'shift') {
      const lenRatio = origEndRatio - origStartRatio;
      let newStartRatio = Math.round((origStartRatio + deltaRatio) * 100) / 100;
      if (newStartRatio < 0) newStartRatio = 0;
      if (newStartRatio + lenRatio > 1.0) newStartRatio = 1.0 - lenRatio;
      eff.startRatio = Math.round(newStartRatio * 100) / 100;
      eff.endRatio = Math.round((eff.startRatio + lenRatio) * 100) / 100;
      eff.start = Math.round(eff.startRatio * duration * 100) / 100;
      eff.end = Math.round(eff.endRatio * duration * 100) / 100;
    }

    const startPct = Math.round(eff.startRatio * 100);
    const endPct = Math.round(eff.endRatio * 100);
    const label = this.getEffectLabel(eff.type);

    // Direct DOM style updates for 60 FPS buttery smooth drag
    if (blockEl) {
      blockEl.style.left = `${eff.startRatio * 100}%`;
      blockEl.style.width = `${Math.max(4, (eff.endRatio - eff.startRatio) * 100)}%`;
      blockEl.title = `${label}: ${startPct}% (~${eff.start.toFixed(1)}s) - ${endPct}% (~${eff.end.toFixed(1)}s)`;
    }
    if (textSpanEl) {
      textSpanEl.textContent = `${label} (${startPct}% - ${endPct}%)`;
    }
    if (modalInputs) {
      if (modalInputs.startInput) modalInputs.startInput.value = String(startPct);
      if (modalInputs.endInput) modalInputs.endInput.value = String(endPct);
      if (modalInputs.startHint) modalInputs.startHint.textContent = `(~${eff.start.toFixed(1)}s)`;
      if (modalInputs.endHint) modalInputs.endHint.textContent = `(~${eff.end.toFixed(1)}s)`;
    }
  }

  onMouseUp() {
    if (!this.activeDrag) return;
    this.activeDrag = null;
    document.body.style.cursor = '';
    this.commitChanges();
    this.render();
    if (this.expandedModal) {
      this.renderExpandedModalContent();
    }
  }

  removeEffect(targetEffect) {
    const type = targetEffect.type || targetEffect.key;
    this.effects = this.effects.filter((e) => (e.type || e.key) !== type);
    this.commitChanges();
    this.render();
    if (this.expandedModal) {
      this.renderExpandedModalContent();
    }
  }

  addEffect(type) {
    const duration = Math.max(0.5, Number(this.options.getDuration?.()) || 2.3);
    const startRatio = 0.10; // 10%
    const endRatio = 0.50; // 50%

    this.effects.push({
      type,
      startRatio,
      endRatio,
      start: Math.round(duration * startRatio * 100) / 100,
      end: Math.round(duration * endRatio * 100) / 100
    });

    this.commitChanges();
    this.render();
    if (this.expandedModal) {
      this.renderExpandedModalContent();
    }
  }

  showAddEffectMenu(anchorBtn) {
    const existingMenu = document.querySelector('.active-effects-add-menu');
    if (existingMenu) existingMenu.remove();

    const currentTypes = this.effects.map((e) => e.type || e.key);
    const available = (this.options.availableEffectTags || []).filter(
      (tag) => !currentTypes.includes(tag.key)
    );

    if (available.length === 0) return;

    const menu = document.createElement('div');
    menu.className = 'active-effects-add-menu';
    menu.style.position = 'fixed';
    const rect = anchorBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.style.background = 'rgba(15, 20, 30, 0.96)';
    menu.style.backdropFilter = 'blur(12px)';
    menu.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    menu.style.borderRadius = '6px';
    menu.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
    menu.style.padding = '4px 0';
    menu.style.minWidth = '160px';
    menu.style.maxHeight = '240px';
    menu.style.overflowY = 'auto';
    menu.style.zIndex = '3000';

    available.forEach((tag) => {
      const item = document.createElement('div');
      item.style.padding = '6px 12px';
      item.style.fontSize = '11px';
      item.style.color = '#fff';
      item.style.cursor = 'pointer';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '8px';
      item.textContent = this.getEffectLabel(tag.key);

      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(0, 229, 255, 0.15)';
        item.style.color = '#00e5ff';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
        item.style.color = '#fff';
      });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.remove();
        this.addEffect(tag.key);
      });

      menu.appendChild(item);
    });

    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== anchorBtn) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 10);

    document.body.appendChild(menu);
  }

  openExpandedModal() {
    this.closeExpandedModal();

    const overlay = document.createElement('div');
    overlay.className = 'active-effects-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.75)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const dialog = document.createElement('div');
    dialog.className = 'active-effects-modal-dialog';
    dialog.style.width = 'min(780px, 92vw)';
    dialog.style.maxHeight = '85vh';
    dialog.style.background = '#0e131d';
    dialog.style.border = '1px solid rgba(0, 229, 255, 0.3)';
    dialog.style.borderRadius = '12px';
    dialog.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15)';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.overflow = 'hidden';

    // Modal Header
    const modalHeader = document.createElement('div');
    modalHeader.style.padding = '12px 18px';
    modalHeader.style.background = 'rgba(255, 255, 255, 0.04)';
    modalHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';

    const modalTitle = document.createElement('h3');
    modalTitle.style.margin = '0';
    modalTitle.style.fontSize = '14px';
    modalTitle.style.color = '#fff';
    modalTitle.style.fontWeight = '600';
    const duration = Math.max(0.5, Number(this.options.getDuration?.()) || 2.3);
    modalTitle.textContent = `${t('editor.inspector.expandedTimelineTitle') || 'Active Effects Timeline Editor'} (${duration.toFixed(1)}s)`;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'rgba(255, 255, 255, 0.6)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '4px';
    closeBtn.appendChild(createSvgIcon('close', 16));
    closeBtn.addEventListener('click', () => this.closeExpandedModal());

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    dialog.appendChild(modalHeader);

    // Modal Content Area
    const contentArea = document.createElement('div');
    contentArea.className = 'active-effects-modal-content';
    contentArea.style.padding = '16px 20px';
    contentArea.style.overflowY = 'auto';
    contentArea.style.flex = '1';
    dialog.appendChild(contentArea);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeExpandedModal();
      }
    });

    this.expandedModal = { overlay, dialog, contentArea };
    this.renderExpandedModalContent();
  }

  renderExpandedModalContent() {
    if (!this.expandedModal) return;
    const { contentArea } = this.expandedModal;
    contentArea.innerHTML = '';
    const duration = Math.max(0.5, Number(this.options.getDuration?.()) || 2.3);

    if (this.effects.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.padding = '30px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.color = 'rgba(255, 255, 255, 0.4)';
      emptyMsg.style.fontSize = '12px';
      emptyMsg.textContent = t('editor.inspector.noActiveEffects') || 'No active effects added yet.';
      contentArea.appendChild(emptyMsg);
      return;
    }

    this.effects.forEach((eff, index) => {
      const type = eff.type || eff.key;
      const startPct = Math.round(eff.startRatio * 100);
      const endPct = Math.round(eff.endRatio * 100);
      const color = this.getEffectColor(type);
      const label = this.getEffectLabel(type);

      const trackRow = document.createElement('div');
      trackRow.style.marginBottom = '14px';
      trackRow.style.background = 'rgba(255, 255, 255, 0.03)';
      trackRow.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      trackRow.style.borderRadius = '8px';
      trackRow.style.padding = '8px 12px';

      // Row Header (Label, numeric % inputs, remove)
      const rowHeader = document.createElement('div');
      rowHeader.style.display = 'flex';
      rowHeader.style.justifyContent = 'space-between';
      rowHeader.style.alignItems = 'center';
      rowHeader.style.marginBottom = '8px';

      const tagBadge = document.createElement('div');
      tagBadge.style.display = 'flex';
      tagBadge.style.alignItems = 'center';
      tagBadge.style.gap = '8px';

      const dot = document.createElement('span');
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.background = color.border;

      const tagName = document.createElement('span');
      tagName.style.fontSize = '12px';
      tagName.style.fontWeight = 'bold';
      tagName.style.color = color.text;
      tagName.textContent = label;

      tagBadge.appendChild(dot);
      tagBadge.appendChild(tagName);

      // Numeric % inputs
      const timingControls = document.createElement('div');
      timingControls.style.display = 'flex';
      timingControls.style.alignItems = 'center';
      timingControls.style.gap = '14px';

      const startBox = document.createElement('label');
      startBox.style.fontSize = '11px';
      startBox.style.color = 'rgba(255, 255, 255, 0.7)';
      startBox.textContent = 'Start: ';
      const startInput = document.createElement('input');
      startInput.type = 'number';
      startInput.min = '0';
      startInput.max = '95';
      startInput.step = '1';
      startInput.value = String(startPct);
      startInput.style.width = '48px';
      startInput.style.background = '#111';
      startInput.style.border = '1px solid #444';
      startInput.style.color = '#fff';
      startInput.style.fontSize = '11px';
      startInput.style.borderRadius = '3px';
      startInput.style.padding = '2px 4px';
      startInput.style.textAlign = 'right';

      const startUnit = document.createElement('span');
      startUnit.style.marginLeft = '3px';
      startUnit.textContent = '%';
      const startHint = document.createElement('span');
      startHint.style.marginLeft = '4px';
      startHint.style.fontSize = '10px';
      startHint.style.color = 'rgba(255, 255, 255, 0.45)';
      startHint.textContent = `(~${eff.start.toFixed(1)}s)`;

      startBox.appendChild(startInput);
      startBox.appendChild(startUnit);
      startBox.appendChild(startHint);

      const endBox = document.createElement('label');
      endBox.style.fontSize = '11px';
      endBox.style.color = 'rgba(255, 255, 255, 0.7)';
      endBox.textContent = 'End: ';
      const endInput = document.createElement('input');
      endInput.type = 'number';
      endInput.min = '5';
      endInput.max = '100';
      endInput.step = '1';
      endInput.value = String(endPct);
      endInput.style.width = '48px';
      endInput.style.background = '#111';
      endInput.style.border = '1px solid #444';
      endInput.style.color = '#fff';
      endInput.style.fontSize = '11px';
      endInput.style.borderRadius = '3px';
      endInput.style.padding = '2px 4px';
      endInput.style.textAlign = 'right';

      const endUnit = document.createElement('span');
      endUnit.style.marginLeft = '3px';
      endUnit.textContent = '%';
      const endHint = document.createElement('span');
      endHint.style.marginLeft = '4px';
      endHint.style.fontSize = '10px';
      endHint.style.color = 'rgba(255, 255, 255, 0.45)';
      endHint.textContent = `(~${eff.end.toFixed(1)}s)`;

      endBox.appendChild(endInput);
      endBox.appendChild(endUnit);
      endBox.appendChild(endHint);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.title = t('editor.inspector.removeEffect') || 'Remove';
      delBtn.style.background = 'transparent';
      delBtn.style.border = 'none';
      delBtn.style.color = '#ff6b6b';
      delBtn.style.cursor = 'pointer';
      delBtn.style.padding = '4px';
      delBtn.appendChild(createSvgIcon('close', 14));
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeEffect(eff);
      });

      timingControls.appendChild(startBox);
      timingControls.appendChild(endBox);
      timingControls.appendChild(delBtn);

      rowHeader.appendChild(tagBadge);
      rowHeader.appendChild(timingControls);
      trackRow.appendChild(rowHeader);

      // Dedicated Scrub Lane
      const scrubLane = document.createElement('div');
      scrubLane.style.position = 'relative';
      scrubLane.style.height = '34px';
      scrubLane.style.background = 'rgba(0, 0, 0, 0.35)';
      scrubLane.style.borderRadius = '4px';
      scrubLane.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      scrubLane.style.overflow = 'hidden';

      const modalInputs = { startInput, endInput, startHint, endHint };
      const block = this.createEffectBlock(eff, index, duration, scrubLane, true, modalInputs);
      scrubLane.appendChild(block);
      trackRow.appendChild(scrubLane);

      const onTimingInputsChange = () => {
        let sPct = Number(startInput.value);
        let ePct = Number(endInput.value);
        if (isNaN(sPct)) sPct = eff.startRatio * 100;
        if (isNaN(ePct)) ePct = eff.endRatio * 100;

        sPct = Math.max(0, Math.min(95, sPct));
        ePct = Math.min(100, Math.max(sPct + 5, ePct));

        eff.startRatio = Math.round(sPct) / 100;
        eff.endRatio = Math.round(ePct) / 100;
        eff.start = Math.round(eff.startRatio * duration * 100) / 100;
        eff.end = Math.round(eff.endRatio * duration * 100) / 100;

        startHint.textContent = `(~${eff.start.toFixed(1)}s)`;
        endHint.textContent = `(~${eff.end.toFixed(1)}s)`;

        // Immediately update visual block
        block.style.left = `${eff.startRatio * 100}%`;
        block.style.width = `${Math.max(4, (eff.endRatio - eff.startRatio) * 100)}%`;
        const textSpan = block.querySelector('span');
        if (textSpan) {
          textSpan.textContent = `${label} (${Math.round(eff.startRatio * 100)}% - ${Math.round(eff.endRatio * 100)}%)`;
        }

        this.commitChanges();
        this.render(); // Update compact inspector view
      };

      startInput.addEventListener('input', onTimingInputsChange);
      startInput.addEventListener('change', onTimingInputsChange);
      endInput.addEventListener('input', onTimingInputsChange);
      endInput.addEventListener('change', onTimingInputsChange);

      contentArea.appendChild(trackRow);
    });
  }

  closeExpandedModal() {
    if (this.expandedModal) {
      this.expandedModal.overlay.remove();
      this.expandedModal = null;
    }
  }
}
