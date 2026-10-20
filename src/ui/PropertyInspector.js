import { t } from '../config/lang/i18n.js';
import en from '../config/lang/en.js';
import { editorConfig } from '../config/editor.js';
import {
  AVAILABLE_SHAPES,
  AVAILABLE_DYNAMICS,
  AVAILABLE_MODIFIERS,
  PRESET_TEMPLATES,
  AVAILABLE_CHILD_PRESETS,
  getTemplateForPreset,
  resolveFireworkComposition
} from '../factories/FireworkCompositionHelper.js';
import { EffectPreviewTooltip } from './EffectPreviewTooltip.js';
import { CustomSelect } from './CustomSelect.js';
import { PREVIEW_CATEGORIES } from '../config/effectPreviews.js';
import { globalEventBus } from '../core/EventBus.js';
import { WaveCurveEditor } from './WaveCurveEditor.js';
import { DEFAULT_WAVE_POINTS } from '../utils/SplineMath.js';

function formatOptionLabelFallback(rawKey) {
  if (rawKey === '' || rawKey === undefined || rawKey === null) return '';
  if (rawKey === 'random') return 'Random';
  let text = String(rawKey).replace(/[-_]/g, ' ');
  text = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEnglishOptionLabel(fieldName, opt) {
  if (opt === '' || opt === undefined || opt === null) {
    return en?.editor?.inspector?.options?.[fieldName]?.empty || '';
  }
  const enOptions = en?.editor?.inspector?.options?.[fieldName];
  if (enOptions) {
    if (enOptions[opt]) return enOptions[opt];
    const snakeKey = String(opt).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    if (enOptions[snakeKey]) return enOptions[snakeKey];
  }
  return formatOptionLabelFallback(opt);
}

export const AVAILABLE_EFFECT_TAGS = [
  {
    key: 'apex-hang',
    labelKey: 'apexHang'
  },
  {
    key: 'burst-smoke',
    labelKey: 'burstSmoke'
  },
  {
    key: 'crackle',
    labelKey: 'crackle'
  },
  {
    key: 'crossette',
    labelKey: 'crossette'
  },
  {
    key: 'erratic-dart',
    labelKey: 'erraticDart'
  },
  {
    key: 'flow',
    labelKey: 'flow'
  },
  {
    key: 'ghost',
    labelKey: 'ghost'
  },
  {
    key: 'ghost-flare',
    labelKey: 'ghostFlare'
  },
  {
    key: 'glitter-strobe',
    labelKey: 'glitterStrobe'
  },
  {
    key: 'long-burn',
    labelKey: 'longBurn'
  },
  {
    key: 'no-burst',
    labelKey: 'noBurst'
  },
  {
    key: 'no-trail',
    labelKey: 'noTrail'
  },
  {
    key: 'strobe',
    labelKey: 'strobe'
  },
  {
    key: 'tadpole-flurry',
    labelKey: 'tadpoleFlurry'
  },
  {
    key: 'white-strobe',
    labelKey: 'whiteStrobe'
  }
];

export class PropertyInspector {
  constructor(
    container,
    onUpdate,
    presetOptions = ['random'],
    onHelpClick = null
  ) {
    this.container = container;
    this.onUpdate = onUpdate;
    this.presetOptions = presetOptions;
    this.onHelpClick = onHelpClick;
    this.selectedEvent = null;
    this.activeStageIndex = 0;
    this.collapsedGroups = {}; // Keep track of open/closed states
    this.showHelpState = {}; // Keep track of help banner visibility states

    this.container.style.position = 'relative';
    this.container.style.width = '320px';
    this.container.style.minWidth = '320px';
    this.container.style.flexShrink = '0';
    this.container.style.height = '100%';
    this.container.style.background = 'rgba(15, 20, 25, 0.95)';
    this.container.style.borderLeft = '1px solid rgba(255, 255, 255, 0.1)';
    this.container.style.boxShadow = '-4px 0 16px rgba(0,0,0,0.5)';
    this.container.style.padding = '15px';
    this.container.style.boxSizing = 'border-box';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = 'monospace';
    this.container.style.overflowY = 'auto';
    this.container.style.display = 'none';
    this.container.style.zIndex = '1001';

    this.debounceTimeout = null;
    this.isEditing = false;

    this.render();
  }

  show(event) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    if (
      document.activeElement &&
      this.container.contains(document.activeElement) &&
      typeof document.activeElement.blur === 'function'
    ) {
      document.activeElement.blur();
    }
    this.isEditing = false;
    this.selectedEvent = event;
    this.container.style.display = 'block';
    this.render();
  }

  hide() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    if (
      document.activeElement &&
      this.container.contains(document.activeElement) &&
      typeof document.activeElement.blur === 'function'
    ) {
      document.activeElement.blur();
    }
    this.isEditing = false;
    this.selectedEvent = null;
    this.container.style.display = 'none';
  }

  setHelpHandler(handler) {
    this.onHelpClick = handler;
  }

  triggerUpdate(action) {
    if (action === 'beforeChange') {
      if (!this.isEditing) {
        this.onUpdate('beforeChange');
        this.isEditing = true;
      }
      return;
    }

    if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.onUpdate();
      this.debounceTimeout = null;
    }, 250);
  }

  isCometEvent(event) {
    if (!event) {
      return false;
    }
    if (event.type === 'cometsequence') {
      return true;
    }
    const preset = event.preset;
    if (!preset) {
      return false;
    }
    if (typeof preset === 'string') {
      return preset === 'comet'
        || preset.startsWith('comet_')
        || preset.startsWith('comet');
    }
    return preset.type === 'comet_cluster'
      || preset.type === 'comet'
      || preset.type?.startsWith('comet');
  }

  hasAngleConfig(event) {
    if (!event) {
      return false;
    }
    if (this.isCometEvent(event)) {
      return true;
    }
    if (event.type === 'sequence') {
      const pattern = event.pattern;
      return typeof pattern === 'string' && (
        pattern.startsWith('sweep') ||
        pattern.startsWith('fan') ||
        pattern.startsWith('cascade-slope') ||
        pattern.startsWith('crossfire')
      );
    }
    return false;
  }

  getSchema() {
    const isCometPreset = (event) => {
      return (event.preset && (event.preset.type === 'comet_cluster' || event.preset.type === 'comet' || event.preset.type?.startsWith('comet')))
        || (typeof event.preset === 'string' && (event.preset === 'comet' || event.preset.startsWith('comet_') || event.preset.startsWith('comet')));
    };

    return {
      audio: [
        {
          groupKey: 'audioSettings',
          fields: [
            { name: 'time', labelKey: 'time', type: 'number', step: '0.1' },
            { name: 'volume', labelKey: 'volume', type: 'number', step: '0.1' },
            { name: 'url', labelKey: 'url', type: 'text', span: 2 }
          ]
        },
        {
          groupKey: 'beatSettings',
          customRender: true
        }
      ],
      group: [
        {
          groupKey: 'groupSettings',
          fields: [
            { name: 'time', labelKey: 'time', type: 'number', step: '0.1' },
            { name: 'name', labelKey: 'name', type: 'text', span: 2 }
          ]
        }
      ],
      event: [
        {
          groupKey: 'coreSettings',
          fields: [
            { name: 'time', labelKey: 'time', type: 'number', step: '0.1' },
            { name: 'type', labelKey: 'type', type: 'select', options: ['sequence', 'cometsequence'] },
            {
              name: 'pattern',
              labelKey: 'pattern',
              type: 'select',
              options: [
                'random',
                'sweep',
                'sweep-custom-curve',
                'sweep-arc',
                'sweep-arc-out',
                'cascade-slope',
                'chasing-scissors',
                'waterfall-curtain',
                'sinusoidal-wave',
                'petal-bloom',
                'teeter-totter',
                'vortex-tunnel',
                'stepping-stones',
                'intertwined-helix',
                'fan',
                'fan-sweep',
                'fan-sweep-continuous',
                'fan-burst',
                'crossfire',
                'crossfire-burst',
                'v-shape',
                'spiral-helix',
                'ripple',
                'converge',
                'diverge',
                'zigzag',
                'continuous'
              ],
              span: 2
            },
            { name: 'preset', labelKey: 'preset', type: 'select', options: this.presetOptions, span: 2 },
            { name: 'count', labelKey: 'count', type: 'number', step: '1' },
            { name: 'duration', labelKey: 'duration', type: 'number', step: '0.1' },
            { name: 'sectorId', labelKey: 'sectorId', type: 'select', options: ['left', 'center', 'right', ''] }
          ]
        },
        {
          groupKey: 'compositionSettings',
          fields: [
            {
              name: 'shapeType',
              labelKey: 'shapeType',
              type: 'select',
              options: AVAILABLE_SHAPES,
              span: 2
            },
            {
              name: 'dynamicsType',
              labelKey: 'dynamicsType',
              type: 'select',
              options: AVAILABLE_DYNAMICS,
              span: 2
            },
            {
              name: 'pistil',
              labelKey: 'pistil',
              type: 'checkbox'
            },
            {
              name: 'instantBurst',
              labelKey: 'instantBurst',
              type: 'checkbox'
            },
            {
              name: 'effects',
              labelKey: 'activeEffects',
              type: 'effect-chips',
              span: 2
            },
            {
              name: 'secondBurstEnabled',
              labelKey: 'secondBurstEnabled',
              type: 'checkbox',
              span: 2
            }
          ]
        },
        {
          groupKey: 'secondBurst',
          visibleIf: (event) => Boolean(
            event?.secondBurst?.enabled
            || event?.secondBurstEnabled
          ),
          customRender: true
        },
        {
          groupKey: 'waveCurveSettings',
          visibleIf: (event) => (
            event?.pattern === 'sweep-custom-curve'
            || event?.pattern === 'sweep-wave'
          ),
          customRender: true
        },
        {
          groupKey: 'nestedStages',
          visibleIf: (event) => (
            event?.preset === 'multiNested'
            || event?.preset === 'multi_nested'
            || Boolean(event?.multiNested)
          ),
          customRender: true
        },
        {
          groupKey: (this.selectedEvent && this.isCometEvent(this.selectedEvent))
            ? 'cometConfig'
            : 'angleConfig',
          visibleIf: (event) => this.hasAngleConfig(event),
          fields: [
            {
              name: 'useAngle',
              labelKey: 'useAngle',
              type: 'checkbox'
            },
            {
              name: 'angle',
              labelKey: 'angle',
              type: 'angle',
              visibleIf: (event) => !!event?.useAngle
            }
          ]
        },
        {
          groupKey: 'visualEffects',
          fields: [
            {
              name: 'color',
              labelKey: 'color',
              type: 'color-badges'
            },
            {
              name: 'shellSize',
              labelKey: 'shellSize',
              type: 'number',
              step: '0.1'
            },
            {
              name: 'cometTrail',
              labelKey: 'cometTrail',
              type: 'select',
              options: [
                'normal',
                'thin',
                'thick',
                'detached',
                'smoke',
                'none',
                'ascent-bursts'
              ]
            },
            {
              name: 'ascentSubShellType',
              labelKey: 'ascentSubShellType',
              type: 'select',
              options: [
                'random',
                'crysanthemum',
                'crossette',
                'strobe',
                'crackle',
                'willow',
                'ring',
                'star',
                'flow',
                'sparking'
              ],
              visibleIf: (event) => event?.cometTrail === 'ascent-bursts' || Boolean(event?.ascentBursts)
            },
            {
              name: 'ascentBurstCount',
              labelKey: 'ascentBurstCount',
              type: 'number',
              step: '1',
              visibleIf: (event) => event?.cometTrail === 'ascent-bursts' || Boolean(event?.ascentBursts)
            }
          ]
        },
        {
          groupKey: 'soundSettings',
          fields: [
            {
              name: 'launchSound',
              labelKey: 'launchSound',
              type: 'select',
              options: [
                '',
                'standard',
                'heavy',
                'soft',
                'silent'
              ],
              span: 2
            },
            {
              name: 'burstSound',
              labelKey: 'burstSound',
              type: 'select',
              options: [
                '',
                'standard',
                'heavy',
                'soft',
                'crisp',
                'silent'
              ],
              span: 2
            },
            {
              name: 'crackleSound',
              labelKey: 'crackleSound',
              type: 'select',
              options: [
                '',
                'standard',
                'dense',
                'soft',
                'silent'
              ],
              span: 2
            },
            {
              name: 'soundVolume',
              labelKey: 'soundVolume',
              type: 'number',
              step: '0.1',
              span: 2
            }
          ]
        },
        {
          groupKey: 'geometryOffsets',
          fields: [
            { name: 'ratioX', labelKey: 'ratioX', type: 'number', step: '0.05' },
            { name: 'ratioY', labelKey: 'ratioY', type: 'number', step: '0.05' },
            { name: 'x1', labelKey: 'x1', type: 'number', step: '0.1' },
            { name: 'x2', labelKey: 'x2', type: 'number', step: '0.1' },
            { name: 'y1', labelKey: 'y1', type: 'number', step: '0.1' },
            { name: 'y2', labelKey: 'y2', type: 'number', step: '0.1' }
          ]
        }
      ]
    };
  }

  render() {
    this.container.innerHTML = '';

    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'inspector-header';
    headerWrapper.style.display = 'flex';
    headerWrapper.style.justifyContent = 'space-between';
    headerWrapper.style.alignItems = 'center';
    headerWrapper.style.marginBottom = '12px';
    headerWrapper.style.paddingBottom = '8px';
    headerWrapper.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

    const titleEl = document.createElement('h3');
    titleEl.className = 'inspector-title';
    titleEl.textContent = t('editor.inspector.title') || 'Thuộc tính';
    titleEl.style.margin = '0';
    titleEl.style.fontSize = '14px';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.color = '#00e5ff';

    const helpBtn = document.createElement('button');
    helpBtn.className = 'inspector-help-btn';
    helpBtn.textContent = t('editor.inspectorTour.helpBtn') || 'Hướng dẫn';
    helpBtn.title = t('editor.inspectorTour.helpBtnTooltip') || 'Xem hướng dẫn bảng thuộc tính';
    helpBtn.style.background = 'rgba(0, 229, 255, 0.12)';
    helpBtn.style.border = '1px solid rgba(0, 229, 255, 0.4)';
    helpBtn.style.color = '#00e5ff';
    helpBtn.style.padding = '3px 8px';
    helpBtn.style.borderRadius = '3px';
    helpBtn.style.cursor = 'pointer';
    helpBtn.style.fontSize = '11px';
    helpBtn.style.fontFamily = 'inherit';
    helpBtn.style.transition = 'all 0.15s ease';

    helpBtn.addEventListener('mouseenter', () => {
      helpBtn.style.background = 'rgba(0, 229, 255, 0.25)';
      helpBtn.style.borderColor = '#00e5ff';
    });
    helpBtn.addEventListener('mouseleave', () => {
      helpBtn.style.background = 'rgba(0, 229, 255, 0.12)';
      helpBtn.style.borderColor = 'rgba(0, 229, 255, 0.4)';
    });
    helpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof this.onHelpClick === 'function') {
        this.onHelpClick();
      } else {
        globalEventBus.emit('timeline:request-inspector-tour');
      }
    });

    headerWrapper.appendChild(titleEl);
    headerWrapper.appendChild(helpBtn);
    this.container.appendChild(headerWrapper);

    if (!this.selectedEvent) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'inspector-empty';
      emptyMsg.textContent = t('editor.inspector.empty');
      this.container.appendChild(emptyMsg);
      return;
    }

    // Default sectorId to 'center' if undefined for non-audio and non-group
    if (
      this.selectedEvent.type !== 'audio' &&
      this.selectedEvent.type !== 'group' &&
      this.selectedEvent.sectorId === undefined
    ) {
      this.selectedEvent.sectorId = 'center';
    }

    const typeKey = this.selectedEvent.type === 'audio'
      ? 'audio'
      : (this.selectedEvent.type === 'group' ? 'group' : 'event');

    if (typeKey === 'event') {
      const comp = resolveFireworkComposition(this.selectedEvent);
      if (this.selectedEvent.shapeType === undefined) {
        this.selectedEvent.shapeType = comp.shape;
      }
      if (this.selectedEvent.dynamicsType === undefined) {
        this.selectedEvent.dynamicsType = comp.dynamics;
      }
      if (this.selectedEvent.pistil === undefined) {
        this.selectedEvent.pistil = comp.modifiers.pistil;
      }
      if (this.selectedEvent.instantBurst === undefined) {
        this.selectedEvent.instantBurst = comp.modifiers.instantBurst;
      }
      if (this.selectedEvent.effects === undefined) {
        this.selectedEvent.effects = comp.effects;
      }
    }

    // Default cometTrail based on preset if undefined
    if (
      typeKey === 'event' &&
      this.selectedEvent.cometTrail === undefined
    ) {
      const presetName = typeof this.selectedEvent.preset === 'string'
        ? this.selectedEvent.preset
        : (this.selectedEvent.preset?.shellType || '');
      if (
        presetName.includes('notrail') ||
        presetName.includes('no_trail')
      ) {
        this.selectedEvent.cometTrail = 'none';
      } else if (presetName.includes('thick')) {
        this.selectedEvent.cometTrail = 'thick';
      } else {
        this.selectedEvent.cometTrail = 'normal';
      }
    }
    const groups = this.getSchema()[typeKey];

    groups.forEach(group => {
      // Check visibility condition
      if (group.visibleIf && !group.visibleIf(this.selectedEvent)) {
        return;
      }

      const accordion = document.createElement('div');
      accordion.className = `inspector-accordion inspector-group-${group.groupKey}`;
      accordion.dataset.groupKey = group.groupKey;

      const header = document.createElement('div');
      const isCollapsed = this.collapsedGroups[group.groupKey] === true;
      header.className = `inspector-accordion-header ${!isCollapsed ? 'active' : ''}`;

      const titleWrapper = document.createElement('div');
      titleWrapper.style.display = 'flex';
      titleWrapper.style.alignItems = 'center';
      titleWrapper.style.gap = '6px';

      const titleSpan = document.createElement('span');
      titleSpan.textContent = t(`editor.inspector.groups.${group.groupKey}`);
      titleWrapper.appendChild(titleSpan);

      if (group.groupKey === 'geometryOffsets') {
        const helpIcon = document.createElement('span');
        helpIcon.className = 'inspector-help-icon';
        helpIcon.textContent = '[?]';
        helpIcon.title = t('editor.inspector.help.geometryOffsetsTooltip') || 'Help';

        helpIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showHelpState[group.groupKey] = !this.showHelpState[group.groupKey];
          if (this.showHelpState[group.groupKey]) {
            this.collapsedGroups[group.groupKey] = false;
          }
          this.render();
        });
        titleWrapper.appendChild(helpIcon);
      }

      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = isCollapsed ? '▶' : '▼';

      header.appendChild(titleWrapper);
      header.appendChild(arrowSpan);

      header.addEventListener('click', () => {
        this.collapsedGroups[group.groupKey] = !isCollapsed;
        this.render();
      });

      accordion.appendChild(header);

      if (group.groupKey === 'geometryOffsets' && this.showHelpState[group.groupKey]) {
        const helpBanner = document.createElement('div');
        helpBanner.className = 'inspector-help-banner';
        helpBanner.textContent = t('editor.inspector.help.geometryOffsets');
        accordion.appendChild(helpBanner);
      }

      if (!isCollapsed) {
        const content = document.createElement('div');
        content.className = 'inspector-accordion-content';

        if (group.customRender) {
          if (group.groupKey === 'beatSettings') {
            this.renderBeatSettings(content);
          } else if (group.groupKey === 'nestedStages') {
            this.renderNestedStages(content);
          } else if (group.groupKey === 'secondBurst') {
            this.renderSecondBurst(content);
          } else if (group.groupKey === 'waveCurveSettings') {
            this.renderWaveCurveEditor(content);
          }
        } else if (group.fields) {
          group.fields.forEach(field => {
            if (field.visibleIf && !field.visibleIf(this.selectedEvent)) {
              return;
            }

            const fieldWrapper = document.createElement('div');
            if (field.span === 2) {
              fieldWrapper.className = 'inspector-field-span-2';
            }

            if (field.type === 'color-badges') {
              this.renderColorBadges(fieldWrapper);
            } else if (field.type === 'angle') {
              this.renderAngleDial(fieldWrapper, field);
            } else if (field.type === 'checkbox') {
              this.renderCheckbox(fieldWrapper, field);
            } else if (field.type === 'effect-chips') {
              this.renderEffectChips(fieldWrapper, field);
            } else {
              this.renderStandardInput(fieldWrapper, field);
            }

            content.appendChild(fieldWrapper);
          });
        }

        accordion.appendChild(content);
      }

      this.container.appendChild(accordion);
    });

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'inspector-delete-btn';
    deleteBtn.textContent = t('editor.inspector.deleteBtn');
    deleteBtn.addEventListener('click', () => {
      this.onUpdate('beforeChange');
      this.selectedEvent._deleted = true;
      this.onUpdate();
      this.hide();
    });
    this.container.appendChild(deleteBtn);
  }

  renderStandardInput(parent, field) {
    const targetEvent = this.selectedEvent;
    if (!targetEvent) return;

    let currentEventValue = targetEvent[field.name];
    if (currentEventValue === undefined && targetEvent.sound) {
      if (field.name === 'launchSound') currentEventValue = targetEvent.sound.launch;
      else if (field.name === 'burstSound') currentEventValue = targetEvent.sound.burst;
      else if (field.name === 'crackleSound') currentEventValue = targetEvent.sound.crackle;
      else if (field.name === 'soundVolume') currentEventValue = targetEvent.sound.volumeMultiplier;
    }

    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t(`editor.inspector.fields.${field.labelKey}`);
    parent.appendChild(label);

    const handleValueChange = (rawVal) => {
      let val = rawVal;
      if (field.type === 'number') {
        val = val === '' ? undefined : parseFloat(val);
      }

      this.triggerUpdate('beforeChange');

      if (val === '' || val === undefined) {
        if (field.name === 'sectorId') {
          targetEvent[field.name] = '';
        } else {
          delete targetEvent[field.name];
        }
      } else {
        targetEvent[field.name] = val;
      }

      if (
        field.name === 'launchSound' ||
        field.name === 'burstSound' ||
        field.name === 'crackleSound' ||
        field.name === 'soundVolume'
      ) {
        if (!targetEvent.sound) targetEvent.sound = {};
        if (field.name === 'launchSound') {
          if (val) {
            targetEvent.sound.launch = val;
            targetEvent.launchSound = val;
          } else {
            delete targetEvent.sound.launch;
            delete targetEvent.launchSound;
          }
        } else if (field.name === 'burstSound') {
          if (val) {
            targetEvent.sound.burst = val;
            targetEvent.burstSound = val;
          } else {
            delete targetEvent.sound.burst;
            delete targetEvent.burstSound;
          }
        } else if (field.name === 'crackleSound') {
          if (val) {
            targetEvent.sound.crackle = val;
            targetEvent.crackleSound = val;
          } else {
            delete targetEvent.sound.crackle;
            delete targetEvent.crackleSound;
          }
        } else if (field.name === 'soundVolume') {
          if (val !== undefined && !isNaN(val)) {
            targetEvent.sound.volumeMultiplier = val;
            targetEvent.soundVolume = val;
          } else {
            delete targetEvent.sound.volumeMultiplier;
            delete targetEvent.soundVolume;
          }
        }
        if (Object.keys(targetEvent.sound).length === 0) {
          delete targetEvent.sound;
        }
      }

      if (field.name === 'preset') {
        if (val !== 'multiNested' && val !== 'multi_nested') {
          delete targetEvent.multiNested;
          delete targetEvent.stages;
          delete targetEvent.nestingMode;
          delete targetEvent._selectedTemplateKey;
        } else {
          targetEvent.multiNested = true;
        }

        // Clean up all optical effect flags from previous preset
        AVAILABLE_EFFECT_TAGS.forEach((eff) => {
          delete targetEvent[eff.key];
        });
        delete targetEvent.strobe;
        delete targetEvent.crackle;
        delete targetEvent.ghost;
        delete targetEvent.ghostFlare;
        delete targetEvent.flow;
        delete targetEvent.noTrail;
        delete targetEvent.noBurst;
        delete targetEvent.crossette;

        if (val) {
          const template = getTemplateForPreset(val);
          if (template) {
            targetEvent.shapeType = template.shape;
            targetEvent.dynamicsType = template.dynamics;
            targetEvent.pistil = template.modifiers.pistil;
            targetEvent.instantBurst = template.modifiers.instantBurst;
            targetEvent.effects = [...template.effects];
            this.triggerUpdate();
            this.render();
            return;
          }
        }
        targetEvent.effects = [];
      }

      this.triggerUpdate();
      if (field.type === 'select') {
        this.render();
      }
    };

    let input;
    if (field.type === 'select') {
      const sortedOptions = [...field.options].sort((a, b) => {
        if (a === '') return -1;
        if (b === '') return 1;
        if (a === 'random') return -1;
        if (b === 'random') return 1;
        if (field.name === 'preset') {
          if (a === 'multi_nested' || a === 'multiNested') return -1;
          if (b === 'multi_nested' || b === 'multiNested') return 1;
        }
        const labelA = getEnglishOptionLabel(field.name, a);
        const labelB = getEnglishOptionLabel(field.name, b);
        return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
      });

      const optionsList = sortedOptions.map((opt) => {
        const lookupKey = opt === '' ? 'empty' : opt;
        const translationKey = `editor.inspector.options.${field.name}.${lookupKey}`;
        let translated = t(translationKey);
        if (translated === translationKey) {
          const snakeKey = String(lookupKey).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
          const snakeTranslationKey = `editor.inspector.options.${field.name}.${snakeKey}`;
          const snakeTranslated = t(snakeTranslationKey);
          if (snakeTranslated !== snakeTranslationKey) {
            translated = snakeTranslated;
          }
        }
        const fallbackLabel = formatOptionLabelFallback(opt || 'random');
        return {
          value: opt,
          label: translated === translationKey ? fallbackLabel : translated
        };
      });

      let previewCategory = null;
      if (field.name === 'shape' || field.name === 'shapeType') {
        previewCategory = PREVIEW_CATEGORIES.SHAPE;
      } else if (
        field.name === 'dynamics' ||
        field.name === 'dynamicsType' ||
        field.name === 'ascentSubShellType'
      ) {
        previewCategory = PREVIEW_CATEGORIES.DYNAMICS;
      } else if (field.name === 'preset') {
        previewCategory = PREVIEW_CATEGORIES.PRESET;
      } else if (field.name === 'pattern') {
        previewCategory = PREVIEW_CATEGORIES.PATTERN;
      }

      const customSelect = new CustomSelect({
        options: optionsList,
        value: currentEventValue !== undefined ? currentEventValue : '',
        category: previewCategory,
        fieldName: field.name,
        onChange: (val) => handleValueChange(val)
      });
      input = customSelect.element;

      if (previewCategory) {
        EffectPreviewTooltip.getInstance().bindElement(
          label,
          () => customSelect.value,
          previewCategory
        );
      }
    } else {
      input = document.createElement('input');
      input.className = 'inspector-input';
      input.dataset.fieldName = field.name;
      input.type = field.type;
      if (field.step) input.step = field.step;
      input.value = currentEventValue !== undefined ? currentEventValue : '';

      if (field.name === 'soundVolume') {
        input.placeholder = '1.0';
      }

      input.addEventListener('focus', () => {
        this.isEditing = true;
      });

      input.addEventListener('blur', () => {
        this.isEditing = false;
        this.onUpdate(); // Final sync on blur
      });

      input.addEventListener('input', (e) => {
        handleValueChange(e.target.value);
      });
    }

    if (
      field.name === 'launchSound' ||
      field.name === 'burstSound' ||
      field.name === 'crackleSound'
    ) {
      const inputGroup = document.createElement('div');
      inputGroup.className = 'inspector-input-group';
      inputGroup.appendChild(input);

      const testBtn = document.createElement('button');
      testBtn.type = 'button';
      testBtn.className = 'inspector-sound-test-btn';
      testBtn.textContent = t('editor.inspector.auditionSoundBtn') || 'Test';
      testBtn.title = t('editor.inspector.auditionSoundTooltip') || 'Play sound preview';
      testBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const stage = field.name.replace('Sound', '');
        const profile = currentEventValue || 'standard';
        globalEventBus.emit('audio:preview', {
          stage,
          profile
        });
      });
      inputGroup.appendChild(testBtn);
      parent.appendChild(inputGroup);
      return;
    }

    parent.appendChild(input);
  }

  renderCheckbox(parent, field) {
    const targetEvent = this.selectedEvent;
    if (!targetEvent) return;

    const container = document.createElement('label');
    container.className = 'inspector-checkbox-container';

    const input = document.createElement('input');
    input.className = 'inspector-checkbox';
    input.type = 'checkbox';
    input.dataset.fieldName = field.name;
    input.checked = !!targetEvent[field.name];

    input.addEventListener('change', (e) => {
      this.onUpdate('beforeChange');
      if (e.target.checked) {
        targetEvent[field.name] = true;
        if (field.name === 'useAngle' && targetEvent.angle === undefined) {
          targetEvent.angle = 0;
        }
        if (field.name === 'secondBurstEnabled') {
          if (!targetEvent.secondBurst) {
            targetEvent.secondBurst = {
              enabled: true,
              childShells: [
                {
                  ratio: 0.20,
                  triggerTiming: 0.50,
                  distributionMode: 'random',
                  shapeType: 'sphere',
                  dynamicsType: 'standard',
                  color: '#ffd700',
                  scale: 0.35,
                  effects: ['strobe']
                }
              ]
            };
          } else {
            targetEvent.secondBurst.enabled = true;
          }
        }
      } else {
        delete targetEvent[field.name];
        if (field.name === 'useAngle') {
          delete targetEvent.angle;
        }
        if (field.name === 'secondBurstEnabled') {
          if (targetEvent.secondBurst) {
            targetEvent.secondBurst.enabled = false;
          }
        }
      }
      this.onUpdate();
      this.render();
    });

    container.appendChild(input);
    const span = document.createElement('span');
    span.textContent = t(`editor.inspector.fields.${field.labelKey}`);
    container.appendChild(span);

    if (field.name === 'pistil') {
      EffectPreviewTooltip.getInstance().bindElement(container, 'pistil', PREVIEW_CATEGORIES.OPTICAL_EFFECT);
    }

    parent.appendChild(container);
  }

  renderEffectChips(parent, field) {
    const targetEvent = this.selectedEvent;
    if (!targetEvent) return;

    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t(`editor.inspector.fields.${field.labelKey}`) || 'Active Effects';

    const container = document.createElement('div');
    container.className = 'inspector-effect-chips-container';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.marginTop = '4px';

    // 1. Chips wrapper
    const chipsWrapper = document.createElement('div');
    chipsWrapper.className = 'inspector-chips-wrapper';
    chipsWrapper.style.display = 'flex';
    chipsWrapper.style.flexWrap = 'wrap';
    chipsWrapper.style.gap = '6px';
    chipsWrapper.style.minHeight = '24px';
    chipsWrapper.style.alignItems = 'center';

    const currentEffectsList = Array.isArray(targetEvent.effects)
      ? targetEvent.effects
      : [];

    const activeEffects = AVAILABLE_EFFECT_TAGS.filter((eff) => {
      return !!targetEvent[eff.key] || currentEffectsList.includes(eff.key);
    });

    if (activeEffects.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.style.fontSize = '11px';
      emptySpan.style.color = '#777';
      emptySpan.style.fontStyle = 'italic';
      emptySpan.textContent = t('editor.inspector.noActiveEffects') || 'No active effects';
      chipsWrapper.appendChild(emptySpan);
    } else {
      activeEffects.forEach((eff) => {
        const chip = document.createElement('div');
        chip.className = 'inspector-effect-chip';
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '6px';
        chip.style.padding = '3px 8px';
        chip.style.background = 'rgba(0, 200, 255, 0.12)';
        chip.style.border = '1px solid rgba(0, 200, 255, 0.35)';
        chip.style.borderRadius = '12px';
        chip.style.fontSize = '11px';
        chip.style.color = '#64d2ff';
        chip.style.userSelect = 'none';

        const chipText = document.createElement('span');
        chipText.textContent = t(`editor.inspector.fields.${eff.labelKey}`) || eff.key;
        chip.appendChild(chipText);

        EffectPreviewTooltip.getInstance().bindElement(chip, eff.key, PREVIEW_CATEGORIES.OPTICAL_EFFECT);

        const removeBtn = document.createElement('span');
        removeBtn.textContent = '×';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.fontSize = '14px';
        removeBtn.style.lineHeight = '1';
        removeBtn.style.color = '#ff6b6b';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.padding = '0 2px';
        removeBtn.title = t('editor.inspector.removeEffect') || 'Remove effect';

        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerUpdate('beforeChange');
          delete targetEvent[eff.key];
          if (Array.isArray(targetEvent.effects)) {
            targetEvent.effects = targetEvent.effects.filter((k) => k !== eff.key);
          }
          this.triggerUpdate();
          this.render();
        });

        chip.appendChild(removeBtn);
        chipsWrapper.appendChild(chip);
      });
    }

    // 2. Add Effect Dropdown Selector
    const availableToAdd = AVAILABLE_EFFECT_TAGS.filter((eff) => {
      return !targetEvent[eff.key] && !currentEffectsList.includes(eff.key);
    });

    const addWrapper = document.createElement('div');
    addWrapper.style.display = 'flex';
    addWrapper.style.alignItems = 'center';
    addWrapper.style.gap = '6px';

    const select = document.createElement('select');
    select.className = 'inspector-input';
    select.style.fontSize = '11px';
    select.style.padding = '4px 8px';
    select.style.cursor = 'pointer';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = availableToAdd.length > 0
      ? (t('editor.inspector.addEffectPrompt') || '+ Add Effect...')
      : (t('editor.inspector.allEffectsAdded') || 'All effects added');
    select.appendChild(defaultOption);

    if (availableToAdd.length === 0) {
      const disabledPlaceholder = document.createElement('div');
      disabledPlaceholder.className = 'inspector-input';
      disabledPlaceholder.style.fontSize = '11px';
      disabledPlaceholder.style.padding = '4px 8px';
      disabledPlaceholder.style.opacity = '0.5';
      disabledPlaceholder.textContent =
        t('editor.inspector.allEffectsAdded') || 'All effects added';
      addWrapper.appendChild(disabledPlaceholder);
    } else {
      const sortedAvailableToAdd = [...availableToAdd].sort((a, b) => {
        const labelA = en?.editor?.inspector?.fields?.[a.labelKey] || a.key;
        const labelB = en?.editor?.inspector?.fields?.[b.labelKey] || b.key;
        return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
      });

      const effectOptions = sortedAvailableToAdd.map((eff) => ({
        value: eff.key,
        label: t(`editor.inspector.fields.${eff.labelKey}`) || eff.key
      }));

      const effectSelect = new CustomSelect({
        options: effectOptions,
        placeholder:
          t('editor.inspector.addEffectPrompt') || '+ Add Effect...',
        category: PREVIEW_CATEGORIES.OPTICAL_EFFECT,
        fieldName: 'addEffect',
        enableSearch: false,
        onChange: (selectedKey) => {
          if (!selectedKey) return;
          this.triggerUpdate('beforeChange');
          targetEvent[selectedKey] = true;
          if (!Array.isArray(targetEvent.effects)) {
            targetEvent.effects = [];
          }
          if (!targetEvent.effects.includes(selectedKey)) {
            targetEvent.effects.push(selectedKey);
          }
          this.triggerUpdate();
          this.render();
        }
      });

      addWrapper.appendChild(effectSelect.element);
    }

    container.appendChild(chipsWrapper);
    container.appendChild(addWrapper);

    parent.appendChild(label);
    parent.appendChild(container);
  }

  renderColorBadges(parent) {
    const targetEvent = this.selectedEvent;
    if (!targetEvent) return;

    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t('editor.inspector.fields.color');
    parent.appendChild(label);

    const COLOR_MAP = editorConfig.colorMap;

    const container = document.createElement('div');
    container.className = 'color-badge-container';

    let activeKey = null;
    const currentColor = targetEvent.color;
    if (currentColor) {
      const cLower = currentColor.toLowerCase();
      activeKey = Object.keys(COLOR_MAP).find(k => k === cLower || COLOR_MAP[k] === cLower);
    }

    // Render default preset circles
    Object.keys(COLOR_MAP).forEach(key => {
      const badge = document.createElement('div');
      badge.className = `color-badge ${activeKey === key ? 'active' : ''}`;
      badge.style.backgroundColor = COLOR_MAP[key];
      badge.title = t(`editor.inspector.colors.${key}`) || key;

      badge.addEventListener('click', () => {
        this.onUpdate('beforeChange');
        targetEvent.color = key;
        this.onUpdate();
        this.render(); // Redraw selection outline
      });

      container.appendChild(badge);
    });

    // Custom hex color input picker
    const customWrapper = document.createElement('div');
    customWrapper.className = 'color-custom-wrapper';

    const customCb = document.createElement('input');
    customCb.type = 'checkbox';
    customCb.className = 'inspector-checkbox';
    customCb.id = 'inspector-custom-color-cb';
    customCb.checked = currentColor !== undefined;

    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.className = 'color-custom-input';
    customInput.disabled = !customCb.checked;

    let initialHex = '#ffffff';
    if (currentColor) {
      const cLower = currentColor.toLowerCase();
      if (COLOR_MAP[cLower]) {
        initialHex = COLOR_MAP[cLower];
      } else if (currentColor.startsWith('#')) {
        initialHex = currentColor;
      }
    }
    customInput.value = initialHex;

    customCb.addEventListener('change', (e) => {
      this.onUpdate('beforeChange');
      if (e.target.checked) {
        customInput.disabled = false;
        targetEvent.color = customInput.value;
      } else {
        customInput.disabled = true;
        delete targetEvent.color;
      }
      this.onUpdate();
      this.render();
    });

    customInput.addEventListener('input', (e) => {
      if (customCb.checked) {
        this.triggerUpdate('beforeChange');
        targetEvent.color = e.target.value;
        this.triggerUpdate();
      }
    });

    customInput.addEventListener('change', () => {
      this.render();
    });

    const customLabel = document.createElement('label');
    customLabel.htmlFor = 'inspector-custom-color-cb';
    customLabel.textContent = t('editor.inspector.fields.customColor');
    customLabel.style.fontSize = '10px';
    customLabel.style.color = '#aaa';
    customLabel.style.cursor = 'pointer';

    customWrapper.appendChild(customCb);
    customWrapper.appendChild(customLabel);
    customWrapper.appendChild(customInput);
    container.appendChild(customWrapper);

    parent.appendChild(container);
  }

  renderAngleDial(parent, field) {
    const targetEvent = this.selectedEvent;
    if (!targetEvent) return;

    const label = document.createElement('label');
    label.className = 'inspector-label';
    label.textContent = t(`editor.inspector.fields.${field.labelKey}`);
    parent.appendChild(label);

    const container = document.createElement('div');
    container.className = 'angle-dial-container';

    // The angle dial circle
    const dial = document.createElement('div');
    dial.className = 'angle-dial';

    const dialLine = document.createElement('div');
    dialLine.className = 'angle-dial-line';
    dial.appendChild(dialLine);

    const dialCenter = document.createElement('div');
    dialCenter.className = 'angle-dial-center';
    dial.appendChild(dialCenter);

    // Numeric input next to dial
    const angleInput = document.createElement('input');
    angleInput.className = 'inspector-input';
    angleInput.type = 'number';
    angleInput.style.width = '70px';
    angleInput.min = '10';
    angleInput.max = '170';

    const rad = targetEvent.angle;
    // Map radian to degree input: 90 - (rad * 180 / PI)
    const currentDegVal = (rad !== undefined && rad !== null) ? (90 - Math.round(rad * 180 / Math.PI)) : 90;
    angleInput.value = currentDegVal;

    // Position dial pointer initially
    const currentRad = (rad !== undefined && rad !== null) ? rad : 0;
    dialLine.style.transform = `translate(-50%, -50%) rotate(${currentRad - Math.PI / 2}rad)`;

    // Dial mouse/pointer interaction
    dial.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = dial.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const updateAngle = (pe) => {
        const dx = pe.clientX - centerX;
        const dy = pe.clientY - centerY;

        // Deflection angle from vertical (straight up is 0 rad)
        let deflectionRad = Math.atan2(dx, -dy);
        const maxLimitRad = 80 * Math.PI / 180;
        deflectionRad = Math.min(maxLimitRad, Math.max(-maxLimitRad, deflectionRad));

        this.triggerUpdate('beforeChange');
        targetEvent.angle = deflectionRad;
        this.triggerUpdate();

        dialLine.style.transform = `translate(-50%, -50%) rotate(${deflectionRad - Math.PI / 2}rad)`;
        angleInput.value = Math.round(90 - (deflectionRad * 180 / Math.PI));
      };

      const onPointerMove = (pe) => {
        updateAngle(pe);
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        this.isEditing = false;
        this.onUpdate(); // Final sync on release
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      this.isEditing = true;
      updateAngle(e);
    });

    // Handle input change manually
    angleInput.addEventListener('input', (e) => {
      let val = e.target.value;
      if (val === '') return;
      val = parseFloat(val);

      this.triggerUpdate('beforeChange');
      // Convert degrees to deflection radians: (90 - val) * PI / 180
      const offsetDeg = Math.min(80, Math.max(-80, 90 - val));
      const deflectionRad = (offsetDeg * Math.PI) / 180;

      targetEvent.angle = deflectionRad;
      dialLine.style.transform = `translate(-50%, -50%) rotate(${deflectionRad - Math.PI / 2}rad)`;
      this.triggerUpdate();
    });

    angleInput.addEventListener('blur', () => {
      this.isEditing = false;
      this.onUpdate();
    });

    container.appendChild(dial);
    container.appendChild(angleInput);
    parent.appendChild(container);
  }

  updateValues() {
    if (!this.selectedEvent) return;

    // Cập nhật các text, number và select inputs
    const inputs = this.container.querySelectorAll('.inspector-input');
    inputs.forEach(input => {
      const fieldName = input.dataset.fieldName;
      if (fieldName && this.selectedEvent[fieldName] !== undefined) {
        const currentVal = this.selectedEvent[fieldName];
        if (input.value != currentVal && document.activeElement !== input) {
          input.value = currentVal;
        }
      }
    });

    // Cập nhật các checkboxes
    const checkboxes = this.container.querySelectorAll('.inspector-checkbox');
    checkboxes.forEach(cb => {
      const fieldName = cb.dataset.fieldName;
      if (fieldName) {
        const currentVal = !!this.selectedEvent[fieldName];
        if (cb.checked !== currentVal) {
          cb.checked = currentVal;
        }
      }
    });

    // Cập nhật Angle Dial nếu hiển thị
    const angleInput = this.container.querySelector('.angle-dial-container input');
    const dialLine = this.container.querySelector('.angle-dial-line');
    if (angleInput && dialLine && this.selectedEvent.angle !== undefined) {
      const rad = this.selectedEvent.angle;
      const currentDegVal = 90 - Math.round(rad * 180 / Math.PI);
      if (angleInput.value != currentDegVal && document.activeElement !== angleInput) {
        angleInput.value = currentDegVal;
        dialLine.style.transform = `translate(-50%, -50%) rotate(${rad - Math.PI / 2}rad)`;
      }
    }
  }

  renderBeatSettings(parent) {
    const event = this.selectedEvent;
    if (!event) return;

    if (!event.beats) {
      event.beats = [];
    }

    const threshWrapper = document.createElement('div');
    threshWrapper.className = 'input-group inspector-field-span-2';
    threshWrapper.style.flexDirection = 'column';
    threshWrapper.style.alignItems = 'stretch';
    threshWrapper.style.marginBottom = '12px';

    const threshLabel = document.createElement('label');
    threshLabel.className = 'inspector-label';
    threshLabel.style.marginBottom = '6px';
    threshLabel.textContent =
      t('editor.inspector.fields.beatThreshold') ||
      'Do nhay phan tich (1.0 - 2.0)';

    const sliderContainer = document.createElement('div');
    sliderContainer.style.display = 'flex';
    sliderContainer.style.alignItems = 'center';
    sliderContainer.style.gap = '10px';

    const threshSlider = document.createElement('input');
    threshSlider.type = 'range';
    threshSlider.min = '1.0';
    threshSlider.max = '2.0';
    threshSlider.step = '0.05';
    threshSlider.value =
      event._beatThreshold !== undefined
        ? event._beatThreshold
        : '1.3';
    threshSlider.style.flex = '1';

    const threshValSpan = document.createElement('span');
    threshValSpan.textContent = threshSlider.value;
    threshValSpan.style.fontFamily = 'monospace';
    threshValSpan.style.width = '30px';

    threshSlider.addEventListener(
      'input',
      () => {
        threshValSpan.textContent = threshSlider.value;
        event._beatThreshold = parseFloat(threshSlider.value);
      }
    );

    sliderContainer.appendChild(threshSlider);
    sliderContainer.appendChild(threshValSpan);
    threshWrapper.appendChild(threshLabel);
    threshWrapper.appendChild(sliderContainer);
    parent.appendChild(threshWrapper);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'inspector-field-span-2';
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column';
    btnContainer.style.gap = '8px';
    btnContainer.style.marginBottom = '12px';

    const autoBtn = document.createElement('button');
    autoBtn.className = 'btn';
    autoBtn.style.background = '#9c27b0';
    autoBtn.style.color = '#fff';
    autoBtn.textContent =
      t('editor.inspector.fields.autoBeatBtn') ||
      'Tu dong tao nhip (Auto)';

    const loadingText = document.createElement('div');
    loadingText.style.fontSize = '12px';
    loadingText.style.color = '#ffd700';
    loadingText.style.display = 'none';
    loadingText.style.marginTop = '4px';
    loadingText.textContent =
      t('editor.inspector.fields.analyzing') ||
      'Dang phan tich am thanh...';

    autoBtn.addEventListener(
      'click',
      async () => {
        const source =
          event._file ||
          event._blobUrl ||
          ('/' + event.url);
        const threshold =
          event._beatThreshold !== undefined
            ? event._beatThreshold
            : 1.3;

        autoBtn.disabled = true;
        autoBtn.style.opacity = '0.5';
        loadingText.style.display = 'block';

        try {
          const { BeatDetector } = await import(
            '../utils/BeatDetector.js'
          );
          const beats = await BeatDetector.detectBeats(
            source,
            threshold
          );

          this.triggerUpdate('beforeChange');
          event.beats = beats;
          this.triggerUpdate();
          this.render();
        } catch (err) {
          alert(
            (t('editor.inspector.fields.analyzeError') ||
              'Loi khi phan tich am thanh: ') +
            err.message
          );
        } finally {
          autoBtn.disabled = false;
          autoBtn.style.opacity = '1';
          loadingText.style.display = 'none';
        }
      }
    );
    btnContainer.appendChild(autoBtn);
    btnContainer.appendChild(loadingText);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary';
    clearBtn.textContent =
      t('editor.inspector.fields.clearBeatsBtn') ||
      'Xoa tat ca nhip';
    clearBtn.addEventListener(
      'click',
      () => {
        if (
          confirm(
            t('editor.inspector.fields.confirmClearBeats') ||
            'Ban co chac chan muon xoa toan bo diem nhip?'
          )
        ) {
          this.triggerUpdate('beforeChange');
          event.beats = [];
          this.triggerUpdate();
          this.render();
        }
      }
    );
    btnContainer.appendChild(clearBtn);

    parent.appendChild(btnContainer);
  }

  renderNestedStages(parent) {
    const event = this.selectedEvent;
    if (!event) return;

    if (!Array.isArray(event.stages) || event.stages.length === 0) {
      const defaultColor = event.color || '#ff4400';
      event.stages = [
        {
          shapeType: 'sphere',
          dynamicsType: 'standard',
          color: defaultColor,
          delay: 0.0,
          scale: 1.0,
          effects: ['strobe']
        },
        {
          shapeType: 'ring',
          dynamicsType: 'flow',
          color: '#00e5ff',
          delay: 0.45,
          scale: 0.82,
          effects: []
        },
        {
          shapeType: 'sphere',
          dynamicsType: 'crossette',
          color: '#ffd700',
          delay: 0.90,
          scale: 0.65,
          effects: ['crossette']
        },
        {
          shapeType: 'sphere',
          dynamicsType: 'willow',
          color: '#ffffff',
          delay: 1.35,
          scale: 0.50,
          effects: ['glitter-strobe']
        }
      ];
    }

    const stages = event.stages;
    if (typeof this.activeStageIndex !== 'number' || this.activeStageIndex >= stages.length) {
      this.activeStageIndex = 0;
    }

    const container = document.createElement('div');
    container.className = 'inspector-field-span-2';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    // 1. Template Presets
    const templateWrapper = document.createElement('div');
    templateWrapper.style.display = 'flex';
    templateWrapper.style.flexDirection = 'column';
    templateWrapper.style.gap = '4px';

    const templateLabel = document.createElement('label');
    templateLabel.className = 'inspector-label';
    templateLabel.textContent =
      t('editor.inspector.fields.templates') ||
      'Quick Templates';

    const templateSelect = document.createElement('select');
    templateSelect.className = 'inspector-input';
    templateSelect.style.fontSize = '11px';

    const TEMPLATE_PRESETS = [
      {
        key: 'custom',
        label: t('editor.inspector.options.templates.custom') || 'Custom'
      },
      {
        key: 'chrysanthemumSimultaneous',
        label:
          t('editor.inspector.options.templates.chrysanthemumSimultaneous') ||
          '4 Layer Simultaneous Chrysanthemum',
        mode: 'concentric',
        stages: [
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#ff3333',
            delay: 0.0,
            scale: 1.0,
            effects: []
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#ffd700',
            delay: 0.0,
            scale: 0.78,
            effects: []
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#00e5ff',
            delay: 0.0,
            scale: 0.56,
            effects: []
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#ffffff',
            delay: 0.0,
            scale: 0.35,
            effects: ['strobe']
          }
        ]
      },
      {
        key: 'classic',
        label: t('editor.inspector.options.templates.classic') || 'Classic Brocade Cascade',
        mode: 'concentric',
        stages: [
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#ff4400',
            delay: 0.0,
            scale: 1.0,
            effects: ['strobe']
          },
          {
            shapeType: 'ring',
            dynamicsType: 'flow',
            color: '#00e5ff',
            delay: 0.45,
            scale: 0.82,
            effects: []
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'crossette',
            color: '#ffd700',
            delay: 0.90,
            scale: 0.65,
            effects: ['crossette']
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'willow',
            color: '#ffffff',
            delay: 1.35,
            scale: 0.50,
            effects: ['glitter-strobe']
          }
        ]
      },
      {
        key: 'satellite',
        label: t('editor.inspector.options.templates.satellite') || 'Satellite Star Cluster',
        mode: 'satellite',
        stages: [
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#ff2255',
            delay: 0.0,
            scale: 1.0,
            effects: ['strobe']
          },
          {
            shapeType: 'star',
            dynamicsType: 'standard',
            color: '#00e5ff',
            delay: 0.35,
            scale: 0.85,
            effects: ['glitter-strobe']
          },
          {
            shapeType: 'star',
            dynamicsType: 'flow',
            color: '#ffd700',
            delay: 0.70,
            scale: 0.70,
            effects: ['crackle']
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'crossette',
            color: '#cc44ff',
            delay: 1.05,
            scale: 0.55,
            effects: ['crossette']
          }
        ]
      },
      {
        key: 'ghost',
        label: t('editor.inspector.options.templates.ghost') || 'Ghost Strobe Symphony',
        mode: 'concentric',
        stages: [
          {
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#00ff88',
            delay: 0.0,
            scale: 1.0,
            effects: ['ghost']
          },
          {
            shapeType: 'double-helix',
            dynamicsType: 'flow',
            color: '#00d0ff',
            delay: 0.50,
            scale: 0.80,
            effects: ['ghost-flare']
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'willow',
            color: '#ffffff',
            delay: 1.00,
            scale: 0.60,
            effects: ['white-strobe']
          }
        ]
      },
      {
        key: 'crossette',
        label: t('editor.inspector.options.templates.crossette') || 'Crossette Matrix',
        mode: 'concentric',
        stages: [
          {
            shapeType: 'sphere',
            dynamicsType: 'crossette',
            color: '#ff3366',
            delay: 0.0,
            scale: 1.0,
            effects: ['crossette']
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'crossette',
            color: '#ffd700',
            delay: 0.40,
            scale: 0.80,
            effects: ['crossette']
          },
          {
            shapeType: 'ring',
            dynamicsType: 'crossette',
            color: '#00ffcc',
            delay: 0.80,
            scale: 0.65,
            effects: ['crossette']
          },
          {
            shapeType: 'sphere',
            dynamicsType: 'willow',
            color: '#ffffff',
            delay: 1.20,
            scale: 0.50,
            effects: ['glitter-strobe']
          }
        ]
      }
    ];

    const activeTplKey = event._selectedTemplateKey || 'custom';
    const sortedTemplates = [...TEMPLATE_PRESETS].sort((a, b) => {
      if (a.key === 'custom') return -1;
      if (b.key === 'custom') return 1;
      const labelA = en?.editor?.inspector?.options?.templates?.[a.key] || a.label;
      const labelB = en?.editor?.inspector?.options?.templates?.[b.key] || b.label;
      return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
    });

    sortedTemplates.forEach(tpl => {
      const opt = document.createElement('option');
      opt.value = tpl.key;
      opt.textContent = tpl.label;
      if (tpl.key === activeTplKey) {
        opt.selected = true;
      }
      templateSelect.appendChild(opt);
    });

    templateSelect.addEventListener(
      'change',
      (e) => {
        const selectedTpl = TEMPLATE_PRESETS.find(t => t.key === e.target.value);
        if (selectedTpl && selectedTpl.stages) {
          this.triggerUpdate('beforeChange');
          event.preset = 'multi_nested';
          event.multiNested = true;
          event.nestingMode = selectedTpl.mode;
          event.stages = JSON.parse(JSON.stringify(selectedTpl.stages));
          event._selectedTemplateKey = selectedTpl.key;
          this.activeStageIndex = 0;
          this.triggerUpdate();
          this.onUpdate();
          this.render();
        }
      }
    );

    templateWrapper.appendChild(templateLabel);
    templateWrapper.appendChild(templateSelect);
    container.appendChild(templateWrapper);

    // 2. Nesting Mode Segmented Buttons
    const modeWrapper = document.createElement('div');
    modeWrapper.style.display = 'flex';
    modeWrapper.style.flexDirection = 'column';
    modeWrapper.style.gap = '4px';

    const modeLabel = document.createElement('label');
    modeLabel.className = 'inspector-label';
    modeLabel.textContent =
      t('editor.inspector.fields.nestingMode') ||
      'Nesting Pattern';

    const modeButtonGroup = document.createElement('div');
    modeButtonGroup.style.display = 'grid';
    modeButtonGroup.style.gridTemplateColumns = '1fr 1fr';
    modeButtonGroup.style.gap = '6px';

    const currentMode = event.nestingMode || 'concentric';
    const modes = [
      {
        key: 'concentric',
        label: t('editor.inspector.options.nestingMode.concentric') || 'Concentric Time Cascade'
      },
      {
        key: 'satellite',
        label: t('editor.inspector.options.nestingMode.satellite') || 'Satellite Dispersion'
      }
    ];

    modes.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = currentMode === m.key;
      btn.style.padding = '6px 4px';
      btn.style.fontSize = '11px';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.border = isActive
        ? '1px solid #3498db'
        : '1px solid rgba(255, 255, 255, 0.12)';
      btn.style.background = isActive
        ? 'rgba(52, 152, 219, 0.25)'
        : 'rgba(255, 255, 255, 0.04)';
      btn.style.color = isActive
        ? '#ffffff'
        : '#8a9ba8';
      btn.style.fontWeight = isActive
        ? 'bold'
        : 'normal';
      btn.textContent = m.label;

      btn.addEventListener(
        'click',
        () => {
          if (event.nestingMode !== m.key) {
            this.triggerUpdate('beforeChange');
            event.nestingMode = m.key;
            this.triggerUpdate();
            this.render();
          }
        }
      );
      modeButtonGroup.appendChild(btn);
    });

    modeWrapper.appendChild(modeLabel);
    modeWrapper.appendChild(modeButtonGroup);
    container.appendChild(modeWrapper);

    // 3. Stage Tabs Bar
    const tabsWrapper = document.createElement('div');
    tabsWrapper.style.display = 'flex';
    tabsWrapper.style.gap = '4px';
    tabsWrapper.style.alignItems = 'center';
    tabsWrapper.style.overflowX = 'auto';
    tabsWrapper.style.paddingBottom = '4px';

    stages.forEach((stage, idx) => {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      const isSelected = idx === this.activeStageIndex;
      tabBtn.style.display = 'flex';
      tabBtn.style.alignItems = 'center';
      tabBtn.style.gap = '5px';
      tabBtn.style.padding = '5px 8px';
      tabBtn.style.fontSize = '11px';
      tabBtn.style.borderRadius = '4px';
      tabBtn.style.cursor = 'pointer';
      tabBtn.style.border = isSelected
        ? '1px solid #3498db'
        : '1px solid rgba(255, 255, 255, 0.12)';
      tabBtn.style.background = isSelected
        ? 'rgba(52, 152, 219, 0.3)'
        : 'rgba(255, 255, 255, 0.04)';
      tabBtn.style.color = isSelected
        ? '#ffffff'
        : '#8a9ba8';
      tabBtn.style.fontWeight = isSelected
        ? 'bold'
        : 'normal';

      const dot = document.createElement('span');
      dot.style.width = '7px';
      dot.style.height = '7px';
      dot.style.borderRadius = '50%';
      dot.style.background = stage.color || '#ff4400';
      dot.style.flexShrink = '0';
      tabBtn.appendChild(dot);

      const tabText = document.createElement('span');
      const stageDelay = typeof stage.delay === 'number' ? stage.delay.toFixed(2) : '0.00';
      tabText.textContent = `S${idx + 1} ${stageDelay}s`;
      tabBtn.appendChild(tabText);

      tabBtn.addEventListener(
        'click',
        () => {
          this.activeStageIndex = idx;
          this.render();
        }
      );
      tabsWrapper.appendChild(tabBtn);
    });

    if (stages.length < 5) {
      const addTabBtn = document.createElement('button');
      addTabBtn.type = 'button';
      addTabBtn.style.padding = '5px 8px';
      addTabBtn.style.fontSize = '11px';
      addTabBtn.style.borderRadius = '4px';
      addTabBtn.style.cursor = 'pointer';
      addTabBtn.style.border = '1px dashed rgba(255, 255, 255, 0.25)';
      addTabBtn.style.background = 'rgba(255, 255, 255, 0.04)';
      addTabBtn.style.color = '#3498db';
      addTabBtn.textContent = '+ ' + (t('editor.inspector.fields.addStage') || 'Add');
      addTabBtn.title = t('editor.inspector.fields.addStage') || 'Add Stage';

      addTabBtn.addEventListener(
        'click',
        () => {
          this.triggerUpdate('beforeChange');
          const nextIdx = stages.length;
          const fallbackColors = [
            '#ff4400',
            '#00e5ff',
            '#ffd700',
            '#ffffff',
            '#ff00ff'
          ];
          stages.push({
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: fallbackColors[nextIdx % fallbackColors.length],
            delay: nextIdx * 0.45,
            scale: Math.max(0.35, 1.0 - nextIdx * 0.15),
            effects: []
          });
          this.activeStageIndex = stages.length - 1;
          this.triggerUpdate();
          this.render();
        }
      );
      tabsWrapper.appendChild(addTabBtn);
    }

    container.appendChild(tabsWrapper);

    // 4. Visual Cascade Timeline Strip
    const stageDelays = stages.map(s => (typeof s.delay === 'number' ? s.delay : 0));
    const maxDelayVal = Math.max(2.0, Math.max(...stageDelays) + 0.3);

    const timelineStrip = document.createElement('div');
    timelineStrip.style.position = 'relative';
    timelineStrip.style.height = '24px';
    timelineStrip.style.background = 'rgba(0, 0, 0, 0.4)';
    timelineStrip.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    timelineStrip.style.borderRadius = '4px';
    timelineStrip.style.display = 'flex';
    timelineStrip.style.alignItems = 'center';
    timelineStrip.style.padding = '0 6px';

    // Grid ticks on strip
    for (let s = 0.5; s <= maxDelayVal; s += 0.5) {
      const tick = document.createElement('div');
      tick.style.position = 'absolute';
      tick.style.left = `${(s / maxDelayVal) * 94 + 3}%`;
      tick.style.top = '0';
      tick.style.bottom = '0';
      tick.style.width = '1px';
      tick.style.background = 'rgba(255, 255, 255, 0.05)';
      timelineStrip.appendChild(tick);
    }

    stages.forEach((stage, idx) => {
      const pip = document.createElement('div');
      const isSelected = idx === this.activeStageIndex;
      const sDelay = typeof stage.delay === 'number' ? stage.delay : 0;
      const leftPercent = Math.min(94, Math.max(3, (sDelay / maxDelayVal) * 94 + 3));

      pip.style.position = 'absolute';
      pip.style.left = `${leftPercent}%`;
      pip.style.transform = 'translateX(-50%)';
      pip.style.width = isSelected ? '14px' : '10px';
      pip.style.height = isSelected ? '14px' : '10px';
      pip.style.borderRadius = '50%';
      pip.style.background = stage.color || '#ff4400';
      pip.style.border = isSelected ? '2px solid #ffffff' : '1px solid rgba(0, 0, 0, 0.6)';
      pip.style.boxShadow = isSelected ? `0 0 8px ${stage.color || '#3498db'}` : 'none';
      pip.style.cursor = 'pointer';
      pip.style.zIndex = isSelected ? '2' : '1';
      pip.title = `Stage ${idx + 1} (${sDelay.toFixed(2)}s)`;

      pip.addEventListener(
        'click',
        () => {
          this.activeStageIndex = idx;
          this.render();
        }
      );
      timelineStrip.appendChild(pip);
    });

    container.appendChild(timelineStrip);

    // 5. Active Stage Editor Card
    const currentIdx = this.activeStageIndex;
    const stage = stages[currentIdx];

    if (stage) {
      const card = document.createElement('div');
      card.style.background = 'rgba(255, 255, 255, 0.03)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      card.style.borderRadius = '6px';
      card.style.padding = '10px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '8px';

      // Stage Card Header: Indicator & Actions
      const cardHeader = document.createElement('div');
      cardHeader.style.display = 'flex';
      cardHeader.style.justifyContent = 'space-between';
      cardHeader.style.alignItems = 'center';

      const titleGroup = document.createElement('div');
      titleGroup.style.display = 'flex';
      titleGroup.style.alignItems = 'center';
      titleGroup.style.gap = '6px';

      const colorSwatch = document.createElement('div');
      colorSwatch.style.width = '10px';
      colorSwatch.style.height = '10px';
      colorSwatch.style.borderRadius = '50%';
      colorSwatch.style.background = stage.color || '#ff4400';

      const title = document.createElement('span');
      title.style.fontWeight = 'bold';
      title.style.fontSize = '12px';
      title.style.color = '#ffffff';
      title.textContent = `${t('editor.inspector.fields.stage') || 'Stage'} ${currentIdx + 1} / ${stages.length}`;

      titleGroup.appendChild(colorSwatch);
      titleGroup.appendChild(title);
      cardHeader.appendChild(titleGroup);

      const actionGroup = document.createElement('div');
      actionGroup.style.display = 'flex';
      actionGroup.style.gap = '4px';

      // Duplicate Stage
      if (stages.length < 5) {
        const dupBtn = document.createElement('button');
        dupBtn.type = 'button';
        dupBtn.style.background = 'rgba(255, 255, 255, 0.06)';
        dupBtn.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        dupBtn.style.color = '#c2cbd2';
        dupBtn.style.borderRadius = '3px';
        dupBtn.style.padding = '2px 6px';
        dupBtn.style.fontSize = '10px';
        dupBtn.style.cursor = 'pointer';
        dupBtn.textContent = t('editor.inspector.fields.duplicateStage') || 'Duplicate';
        dupBtn.title = t('editor.inspector.fields.duplicateStage') || 'Duplicate Stage';

        dupBtn.addEventListener(
          'click',
          () => {
            this.triggerUpdate('beforeChange');
            const clone = JSON.parse(JSON.stringify(stage));
            clone.delay = parseFloat(((clone.delay || 0) + 0.45).toFixed(2));
            stages.splice(currentIdx + 1, 0, clone);
            this.activeStageIndex = currentIdx + 1;
            this.triggerUpdate();
            this.render();
          }
        );
        actionGroup.appendChild(dupBtn);
      }

      // Delete Stage
      if (stages.length > 2) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.style.background = 'rgba(231, 76, 60, 0.15)';
        delBtn.style.border = '1px solid rgba(231, 76, 60, 0.3)';
        delBtn.style.color = '#ff6b6b';
        delBtn.style.borderRadius = '3px';
        delBtn.style.padding = '2px 6px';
        delBtn.style.fontSize = '10px';
        delBtn.style.cursor = 'pointer';
        delBtn.textContent = t('editor.inspector.fields.removeStage') || 'Delete';
        delBtn.title = t('editor.inspector.fields.removeStage') || 'Delete Stage';

        delBtn.addEventListener(
          'click',
          () => {
            this.triggerUpdate('beforeChange');
            stages.splice(currentIdx, 1);
            this.activeStageIndex = Math.max(0, currentIdx - 1);
            this.triggerUpdate();
            this.render();
          }
        );
        actionGroup.appendChild(delBtn);
      }

      cardHeader.appendChild(actionGroup);
      card.appendChild(cardHeader);

      // Row 1: Shape & Dynamics
      const row1 = document.createElement('div');
      row1.style.display = 'grid';
      row1.style.gridTemplateColumns = '1fr 1fr';
      row1.style.gap = '6px';

      // Shape select
      const shapeCol = document.createElement('div');
      const shapeLbl = document.createElement('label');
      shapeLbl.className = 'inspector-label';
      shapeLbl.style.fontSize = '10px';
      shapeLbl.textContent =
        t('editor.inspector.fields.shapeType') ||
        'Shape';
      const sortedShapes = [...AVAILABLE_SHAPES].sort((a, b) => {
        const labelA = getEnglishOptionLabel('shapeType', a);
        const labelB = getEnglishOptionLabel('shapeType', b);
        return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
      });

      const shapeCustom = new CustomSelect({
        options: sortedShapes.map((sh) => ({
          value: sh,
          label: t(`editor.inspector.options.shapeType.${sh}`) || sh
        })),
        value: stage.shapeType || 'sphere',
        category: PREVIEW_CATEGORIES.SHAPE,
        fieldName: 'shapeType',
        onChange: (val) => {
          this.triggerUpdate('beforeChange');
          stage.shapeType = val;
          this.triggerUpdate();
        }
      });

      shapeCol.appendChild(shapeLbl);
      shapeCol.appendChild(shapeCustom.element);

      // Dynamics select
      const dynCol = document.createElement('div');
      const dynLbl = document.createElement('label');
      dynLbl.className = 'inspector-label';
      dynLbl.style.fontSize = '10px';
      dynLbl.textContent =
        t('editor.inspector.fields.dynamicsType') ||
        'Dynamics';

      const sortedDynamics = [...AVAILABLE_DYNAMICS].sort((a, b) => {
        const labelA = getEnglishOptionLabel('dynamicsType', a);
        const labelB = getEnglishOptionLabel('dynamicsType', b);
        return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
      });

      const dynCustom = new CustomSelect({
        options: sortedDynamics.map((dyn) => ({
          value: dyn,
          label: t(`editor.inspector.options.dynamicsType.${dyn}`) || dyn
        })),
        value: stage.dynamicsType || 'standard',
        category: PREVIEW_CATEGORIES.DYNAMICS,
        fieldName: 'dynamicsType',
        onChange: (val) => {
          this.triggerUpdate('beforeChange');
          stage.dynamicsType = val;
          this.triggerUpdate();
        }
      });

      dynCol.appendChild(dynLbl);
      dynCol.appendChild(dynCustom.element);

      row1.appendChild(shapeCol);
      row1.appendChild(dynCol);
      card.appendChild(row1);

      // Row 2: Color Palette Swatches & Custom Picker
      const colorWrapper = document.createElement('div');
      colorWrapper.style.display = 'flex';
      colorWrapper.style.flexDirection = 'column';
      colorWrapper.style.gap = '4px';

      const colorLbl = document.createElement('label');
      colorLbl.className = 'inspector-label';
      colorLbl.style.fontSize = '10px';
      colorLbl.textContent =
        t('editor.inspector.fields.color') ||
        'Color';

      const colorPaletteRow = document.createElement('div');
      colorPaletteRow.style.display = 'flex';
      colorPaletteRow.style.alignItems = 'center';
      colorPaletteRow.style.flexWrap = 'wrap';
      colorPaletteRow.style.gap = '5px';

      const COLOR_PALETTE = [
        { key: 'red', hex: '#ff3333' },
        { key: 'gold', hex: '#ffd700' },
        { key: 'white', hex: '#ffffff' },
        { key: 'blue', hex: '#007aff' },
        { key: 'green', hex: '#34c759' },
        { key: 'purple', hex: '#af52de' },
        { key: 'pink', hex: '#ff2d55' },
        { key: 'aqua', hex: '#00e5ff' }
      ];

      COLOR_PALETTE.forEach(c => {
        const swatch = document.createElement('div');
        const isActiveColor = (stage.color || '').toLowerCase() === c.hex.toLowerCase();
        swatch.style.width = '18px';
        swatch.style.height = '18px';
        swatch.style.borderRadius = '50%';
        swatch.style.background = c.hex;
        swatch.style.cursor = 'pointer';
        swatch.style.border = isActiveColor
          ? '2px solid #ffffff'
          : '1px solid rgba(0, 0, 0, 0.4)';
        swatch.style.boxShadow = isActiveColor
          ? '0 0 6px rgba(255, 255, 255, 0.8)'
          : 'none';
        swatch.title = c.key;

        swatch.addEventListener(
          'click',
          () => {
            this.triggerUpdate('beforeChange');
            stage.color = c.hex;
            this.triggerUpdate();
            this.render();
          }
        );
        colorPaletteRow.appendChild(swatch);
      });

      const customColorInput = document.createElement('input');
      customColorInput.type = 'color';
      customColorInput.value = stage.color || '#ff4400';
      customColorInput.style.width = '20px';
      customColorInput.style.height = '20px';
      customColorInput.style.border = 'none';
      customColorInput.style.borderRadius = '3px';
      customColorInput.style.cursor = 'pointer';
      customColorInput.style.background = 'transparent';
      customColorInput.title = t('editor.inspector.fields.customColor') || 'Custom Color';

      customColorInput.addEventListener(
        'change',
        (e) => {
          this.triggerUpdate('beforeChange');
          stage.color = e.target.value;
          this.triggerUpdate();
          this.render();
        }
      );
      colorPaletteRow.appendChild(customColorInput);

      colorWrapper.appendChild(colorLbl);
      colorWrapper.appendChild(colorPaletteRow);
      card.appendChild(colorWrapper);

      // Row 3: Burst Delay Slider & Number
      const delayWrapper = document.createElement('div');
      delayWrapper.style.display = 'flex';
      delayWrapper.style.flexDirection = 'column';
      delayWrapper.style.gap = '2px';

      const delayHeader = document.createElement('div');
      delayHeader.style.display = 'flex';
      delayHeader.style.justifyContent = 'space-between';

      const delayLbl = document.createElement('label');
      delayLbl.className = 'inspector-label';
      delayLbl.style.fontSize = '10px';
      delayLbl.textContent =
        t('editor.inspector.fields.delay') ||
        'Burst Delay';

      const delayValText = document.createElement('span');
      delayValText.style.fontSize = '11px';
      delayValText.style.color = '#3498db';
      delayValText.textContent = `${(stage.delay || 0).toFixed(2)}s`;

      delayHeader.appendChild(delayLbl);
      delayHeader.appendChild(delayValText);
      delayWrapper.appendChild(delayHeader);

      const delayInputRow = document.createElement('div');
      delayInputRow.style.display = 'flex';
      delayInputRow.style.alignItems = 'center';
      delayInputRow.style.gap = '8px';

      const delaySlider = document.createElement('input');
      delaySlider.type = 'range';
      delaySlider.min = '0';
      delaySlider.max = '3';
      delaySlider.step = '0.05';
      delaySlider.value = stage.delay !== undefined ? stage.delay : (currentIdx * 0.45);
      delaySlider.style.flex = '1';

      const delayNum = document.createElement('input');
      delayNum.type = 'number';
      delayNum.className = 'inspector-input';
      delayNum.style.width = '60px';
      delayNum.style.fontSize = '11px';
      delayNum.step = '0.05';
      delayNum.min = '0';
      delayNum.max = '3';
      delayNum.value = stage.delay !== undefined ? stage.delay : (currentIdx * 0.45);

      delaySlider.addEventListener(
        'input',
        (e) => {
          const val = parseFloat(e.target.value) || 0;
          stage.delay = val;
          delayNum.value = val;
          delayValText.textContent = `${val.toFixed(2)}s`;
          this.triggerUpdate();
        }
      );

      delayNum.addEventListener(
        'change',
        (e) => {
          const val = parseFloat(e.target.value) || 0;
          this.triggerUpdate('beforeChange');
          stage.delay = val;
          delaySlider.value = val;
          delayValText.textContent = `${val.toFixed(2)}s`;
          this.triggerUpdate();
          this.render();
        }
      );

      delayInputRow.appendChild(delaySlider);
      delayInputRow.appendChild(delayNum);
      delayWrapper.appendChild(delayInputRow);
      card.appendChild(delayWrapper);

      // Row 4: Scale Multiplier Slider & Number
      const scaleWrapper = document.createElement('div');
      scaleWrapper.style.display = 'flex';
      scaleWrapper.style.flexDirection = 'column';
      scaleWrapper.style.gap = '2px';

      const scaleHeader = document.createElement('div');
      scaleHeader.style.display = 'flex';
      scaleHeader.style.justifyContent = 'space-between';

      const scaleLbl = document.createElement('label');
      scaleLbl.className = 'inspector-label';
      scaleLbl.style.fontSize = '10px';
      scaleLbl.textContent =
        t('editor.inspector.fields.stageScale') ||
        'Scale Multiplier';

      const scaleValText = document.createElement('span');
      scaleValText.style.fontSize = '11px';
      scaleValText.style.color = '#3498db';
      scaleValText.textContent = `${(stage.scale !== undefined ? stage.scale : 1.0).toFixed(2)}x`;

      scaleHeader.appendChild(scaleLbl);
      scaleHeader.appendChild(scaleValText);
      scaleWrapper.appendChild(scaleHeader);

      const scaleInputRow = document.createElement('div');
      scaleInputRow.style.display = 'flex';
      scaleInputRow.style.alignItems = 'center';
      scaleInputRow.style.gap = '8px';

      const scaleSlider = document.createElement('input');
      scaleSlider.type = 'range';
      scaleSlider.min = '0.2';
      scaleSlider.max = '2.0';
      scaleSlider.step = '0.05';
      scaleSlider.value = stage.scale !== undefined ? stage.scale : 1.0;
      scaleSlider.style.flex = '1';

      const scaleNum = document.createElement('input');
      scaleNum.type = 'number';
      scaleNum.className = 'inspector-input';
      scaleNum.style.width = '60px';
      scaleNum.style.fontSize = '11px';
      scaleNum.step = '0.05';
      scaleNum.min = '0.2';
      scaleNum.max = '2.0';
      scaleNum.value = stage.scale !== undefined ? stage.scale : 1.0;

      scaleSlider.addEventListener(
        'input',
        (e) => {
          const val = parseFloat(e.target.value) || 1.0;
          stage.scale = val;
          scaleNum.value = val;
          scaleValText.textContent = `${val.toFixed(2)}x`;
          this.triggerUpdate();
        }
      );

      scaleNum.addEventListener(
        'change',
        (e) => {
          const val = parseFloat(e.target.value) || 1.0;
          this.triggerUpdate('beforeChange');
          stage.scale = val;
          scaleSlider.value = val;
          scaleValText.textContent = `${val.toFixed(2)}x`;
          this.triggerUpdate();
        }
      );

      scaleInputRow.appendChild(scaleSlider);
      scaleInputRow.appendChild(scaleNum);
      scaleWrapper.appendChild(scaleInputRow);
      card.appendChild(scaleWrapper);

      // Row 5: Active Optical Effects Chips
      const effectsWrapper = document.createElement('div');
      effectsWrapper.style.display = 'flex';
      effectsWrapper.style.flexDirection = 'column';
      effectsWrapper.style.gap = '4px';

      const effLbl = document.createElement('label');
      effLbl.className = 'inspector-label';
      effLbl.style.fontSize = '10px';
      effLbl.textContent =
        t('editor.inspector.fields.activeEffects') ||
        'Active Effects';

      const chipsWrapper = document.createElement('div');
      chipsWrapper.style.display = 'flex';
      chipsWrapper.style.flexWrap = 'wrap';
      chipsWrapper.style.gap = '4px';

      const currentEffects = Array.isArray(stage.effects) ? stage.effects : [];
      AVAILABLE_EFFECT_TAGS.forEach(eff => {
        const isEffectActive = currentEffects.includes(eff.key);
        const chip = document.createElement('span');
        chip.className = 'effect-chip';
        chip.style.fontSize = '10px';
        chip.style.padding = '3px 7px';
        chip.style.cursor = 'pointer';
        chip.style.borderRadius = '4px';
        chip.style.userSelect = 'none';
        chip.style.border = isEffectActive
          ? '1px solid #4a9eff'
          : '1px solid rgba(255,255,255,0.12)';
        chip.style.background = isEffectActive
          ? 'rgba(74, 158, 255, 0.25)'
          : 'rgba(255,255,255,0.04)';
        chip.style.color = isEffectActive
          ? '#ffffff'
          : '#8a9ba8';
        chip.style.fontWeight = isEffectActive
          ? 'bold'
          : 'normal';
        chip.textContent =
          t(`editor.inspector.fields.${eff.labelKey}`) ||
          eff.key;

        chip.addEventListener(
          'click',
          () => {
            this.triggerUpdate('beforeChange');
            if (!Array.isArray(stage.effects)) {
              stage.effects = [];
            }
            const activeIdx = stage.effects.indexOf(eff.key);
            if (activeIdx >= 0) {
              stage.effects.splice(activeIdx, 1);
            } else {
              stage.effects.push(eff.key);
            }
            this.triggerUpdate();
            this.render();
          }
        );

        chipsWrapper.appendChild(chip);
      });

      effectsWrapper.appendChild(effLbl);
      effectsWrapper.appendChild(chipsWrapper);
      card.appendChild(effectsWrapper);

      container.appendChild(card);
    }

    parent.appendChild(container);
  }

  renderWaveCurveEditor(parent) {
    const event = this.selectedEvent;
    if (!event) return;

    if (!Array.isArray(event.wavePoints) || event.wavePoints.length === 0) {
      event.wavePoints = DEFAULT_WAVE_POINTS.map(p => ({ ...p }));
    }

    const container = document.createElement('div');
    container.className = 'inspector-field-span-2';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';

    const editor = new WaveCurveEditor({
      points: event.wavePoints,
      shellCount: Number(event.count) || 12,
      onChange: (newPoints) => {
        this.triggerUpdate('beforeChange');
        event.wavePoints = newPoints;
        this.triggerUpdate();
      }
    });

    container.appendChild(editor.getElement());
    parent.appendChild(container);
  }

  renderSecondBurst(parent) {
    const event = this.selectedEvent;
    if (!event) return;

    if (!event.secondBurst || typeof event.secondBurst !== 'object') {
      event.secondBurst = {
        enabled: true,
        childShells: [
          {
            ratio: 0.20,
            triggerTiming: 0.50,
            distributionMode: 'random',
            shapeType: 'sphere',
            dynamicsType: 'standard',
            color: '#ffd700',
            scale: 0.35,
            effects: ['strobe']
          }
        ]
      };
    }

    const sb = event.secondBurst;
    if (!Array.isArray(sb.childShells) || sb.childShells.length === 0) {
      sb.childShells = [
        {
          ratio: 0.20,
          triggerTiming: 0.50,
          distributionMode: 'random',
          shapeType: 'sphere',
          dynamicsType: 'standard',
          color: '#ffd700',
          scale: 0.35,
          effects: ['strobe']
        }
      ];
    }

    const childShells = sb.childShells;
    if (typeof this.activeChildShellIndex !== 'number' || this.activeChildShellIndex >= childShells.length) {
      this.activeChildShellIndex = 0;
    }

    const container = document.createElement('div');
    container.className = 'inspector-field-span-2';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    // Summary header: Total conversion ratio
    const totalAllocated = childShells.reduce((sum, c) => {
      return sum + (typeof c.ratio === 'number' ? c.ratio : 0.20);
    }, 0);

    const summaryRow = document.createElement('div');
    summaryRow.style.display = 'flex';
    summaryRow.style.justifyContent = 'space-between';
    summaryRow.style.alignItems = 'center';
    summaryRow.style.padding = '4px 6px';
    summaryRow.style.background = 'rgba(255, 255, 255, 0.04)';
    summaryRow.style.borderRadius = '4px';

    const summaryLabel = document.createElement('span');
    summaryLabel.style.fontSize = '11px';
    summaryLabel.style.fontWeight = 'bold';
    summaryLabel.style.color = '#ffffff';
    const localizedBurstTitle = t('editor.inspector.fields.secondBurst');
    summaryLabel.textContent =
      localizedBurstTitle && localizedBurstTitle !== 'editor.inspector.fields.secondBurst'
        ? localizedBurstTitle
        : (t('editor.inspector.groups.secondBurst') || 'Second Burst');

    const summaryPercent = document.createElement('span');
    summaryPercent.style.fontSize = '11px';
    summaryPercent.style.color = totalAllocated > 0.6 ? '#f39c12' : '#3498db';
    summaryPercent.style.whiteSpace = 'nowrap';
    summaryPercent.style.marginLeft = '8px';
    summaryPercent.textContent = `${Math.round(totalAllocated * 100)}% Total Active`;

    summaryRow.appendChild(summaryLabel);
    summaryRow.appendChild(summaryPercent);
    container.appendChild(summaryRow);

    // Performance guidance note
    const hintText = document.createElement('div');
    hintText.style.fontSize = '10px';
    hintText.style.lineHeight = '1.3';
    hintText.style.color = totalAllocated > 0.6 ? '#f39c12' : '#7f8c8d';
    hintText.style.padding = '3px 6px';
    hintText.style.background = 'rgba(255, 255, 255, 0.02)';
    hintText.style.borderRadius = '3px';
    hintText.style.border = '1px dashed rgba(255, 255, 255, 0.08)';
    hintText.textContent = t('editor.inspector.fields.secondBurstHint') ||
      'Keep ratio between 20% and 35% for optimal density and 60 FPS performance';
    container.appendChild(hintText);

    // 1. Child Shells Tabs Bar
    const tabsWrapper = document.createElement('div');
    tabsWrapper.style.display = 'flex';
    tabsWrapper.style.gap = '4px';
    tabsWrapper.style.alignItems = 'center';
    tabsWrapper.style.overflowX = 'auto';
    tabsWrapper.style.paddingBottom = '4px';
    tabsWrapper.style.marginTop = '4px';

    childShells.forEach((child, idx) => {
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      const isSelected = idx === this.activeChildShellIndex;
      tabBtn.style.display = 'flex';
      tabBtn.style.alignItems = 'center';
      tabBtn.style.gap = '5px';
      tabBtn.style.padding = '5px 8px';
      tabBtn.style.fontSize = '11px';
      tabBtn.style.borderRadius = '4px';
      tabBtn.style.cursor = 'pointer';
      tabBtn.style.border = isSelected
        ? '1px solid #3498db'
        : '1px solid rgba(255, 255, 255, 0.12)';
      tabBtn.style.background = isSelected
        ? 'rgba(52, 152, 219, 0.3)'
        : 'rgba(255, 255, 255, 0.04)';
      tabBtn.style.color = isSelected ? '#ffffff' : '#8a9ba8';
      tabBtn.style.fontWeight = isSelected ? 'bold' : 'normal';

      const dot = document.createElement('span');
      dot.style.width = '7px';
      dot.style.height = '7px';
      dot.style.borderRadius = '50%';
      dot.style.background = child.color || '#ffd700';
      dot.style.flexShrink = '0';
      tabBtn.appendChild(dot);

      const childRatio = typeof child.ratio === 'number' ? child.ratio : 0.20;
      const tabText = document.createElement('span');
      tabText.textContent = `${t('editor.inspector.fields.childShell') || 'Type'} ${idx + 1}: ${Math.round(childRatio * 100)}%`;
      tabBtn.appendChild(tabText);

      tabBtn.addEventListener('click', () => {
        this.activeChildShellIndex = idx;
        this.render();
      });
      tabsWrapper.appendChild(tabBtn);
    });

    if (childShells.length < 5) {
      const addTabBtn = document.createElement('button');
      addTabBtn.type = 'button';
      addTabBtn.style.padding = '5px 8px';
      addTabBtn.style.fontSize = '11px';
      addTabBtn.style.borderRadius = '4px';
      addTabBtn.style.cursor = 'pointer';
      addTabBtn.style.border = '1px dashed rgba(255, 255, 255, 0.25)';
      addTabBtn.style.background = 'rgba(255, 255, 255, 0.04)';
      addTabBtn.style.color = '#3498db';
      addTabBtn.textContent = '+ ' + (t('editor.inspector.fields.addChildShell') || 'Add Type');

      addTabBtn.addEventListener('click', () => {
        this.triggerUpdate('beforeChange');
        const fallbackColors = ['#ffd700', '#00e5ff', '#ff3366', '#ffffff', '#a855f7'];
        childShells.push({
          ratio: 0.20,
          triggerTiming: 0.50,
          distributionMode: 'random',
          shapeType: 'sphere',
          dynamicsType: 'standard',
          color: fallbackColors[childShells.length % fallbackColors.length],
          scale: 0.35,
          effects: ['strobe']
        });
        this.activeChildShellIndex = childShells.length - 1;
        this.triggerUpdate();
        this.render();
      });
      tabsWrapper.appendChild(addTabBtn);
    }

    container.appendChild(tabsWrapper);

    // 2. Active Child Shell Editor Card
    const currentIdx = this.activeChildShellIndex;
    const activeChild = childShells[currentIdx];

    if (activeChild) {
      const card = document.createElement('div');
      card.style.background = 'rgba(255, 255, 255, 0.03)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      card.style.borderRadius = '6px';
      card.style.padding = '10px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '8px';

      // Card Header
      const cardHeader = document.createElement('div');
      cardHeader.style.display = 'flex';
      cardHeader.style.justifyContent = 'space-between';
      cardHeader.style.alignItems = 'center';

      const titleGroup = document.createElement('div');
      titleGroup.style.display = 'flex';
      titleGroup.style.alignItems = 'center';
      titleGroup.style.gap = '6px';

      const colorSwatch = document.createElement('div');
      colorSwatch.style.width = '10px';
      colorSwatch.style.height = '10px';
      colorSwatch.style.borderRadius = '50%';
      colorSwatch.style.background = activeChild.color || '#ffd700';

      const title = document.createElement('span');
      title.style.fontWeight = 'bold';
      title.style.fontSize = '12px';
      title.style.color = '#ffffff';
      title.textContent = `${t('editor.inspector.fields.childShell') || 'Child Shell'} ${currentIdx + 1} / ${childShells.length}`;

      titleGroup.appendChild(colorSwatch);
      titleGroup.appendChild(title);
      cardHeader.appendChild(titleGroup);

      if (childShells.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.style.background = 'rgba(231, 76, 60, 0.15)';
        delBtn.style.border = '1px solid rgba(231, 76, 60, 0.3)';
        delBtn.style.color = '#ff6b6b';
        delBtn.style.borderRadius = '3px';
        delBtn.style.padding = '2px 6px';
        delBtn.style.fontSize = '10px';
        delBtn.style.cursor = 'pointer';
        delBtn.textContent = t('editor.inspector.fields.removeChildShell') || 'Delete';

        delBtn.addEventListener('click', () => {
          this.triggerUpdate('beforeChange');
          childShells.splice(currentIdx, 1);
          this.activeChildShellIndex = Math.max(0, currentIdx - 1);
          this.triggerUpdate();
          this.render();
        });
        cardHeader.appendChild(delBtn);
      }

      card.appendChild(cardHeader);

      // Section A: Activation Parameters (Ratio, Timing, Mode)
      // 1. Particle Ratio Slider for this child
      const ratioWrapper = document.createElement('div');
      ratioWrapper.style.display = 'flex';
      ratioWrapper.style.flexDirection = 'column';
      ratioWrapper.style.gap = '2px';

      const ratioHeader = document.createElement('div');
      ratioHeader.style.display = 'flex';
      ratioHeader.style.justifyContent = 'space-between';

      const ratioLbl = document.createElement('label');
      ratioLbl.className = 'inspector-label';
      ratioLbl.style.fontSize = '10px';
      ratioLbl.textContent = t('editor.inspector.fields.secondBurstRatio') || 'Particle Ratio';

      const currentRatio = typeof activeChild.ratio === 'number' ? activeChild.ratio : 0.20;
      const ratioValText = document.createElement('span');
      ratioValText.style.fontSize = '11px';
      ratioValText.style.color = '#3498db';
      ratioValText.textContent = `${Math.round(currentRatio * 100)}%`;

      ratioHeader.appendChild(ratioLbl);
      ratioHeader.appendChild(ratioValText);
      ratioWrapper.appendChild(ratioHeader);

      const ratioSlider = document.createElement('input');
      ratioSlider.type = 'range';
      ratioSlider.min = '0.05';
      ratioSlider.max = '0.80';
      ratioSlider.step = '0.05';
      ratioSlider.value = currentRatio;
      ratioSlider.style.width = '100%';

      ratioSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0.20;
        activeChild.ratio = val;
        ratioValText.textContent = `${Math.round(val * 100)}%`;
        this.triggerUpdate();
      });

      ratioSlider.addEventListener('change', () => {
        this.render();
      });

      ratioWrapper.appendChild(ratioSlider);
      card.appendChild(ratioWrapper);

      // 2. Trigger Timing Slider for this child
      const timingWrapper = document.createElement('div');
      timingWrapper.style.display = 'flex';
      timingWrapper.style.flexDirection = 'column';
      timingWrapper.style.gap = '2px';

      const timingHeader = document.createElement('div');
      timingHeader.style.display = 'flex';
      timingHeader.style.justifyContent = 'space-between';

      const timingLbl = document.createElement('label');
      timingLbl.className = 'inspector-label';
      timingLbl.style.fontSize = '10px';
      timingLbl.textContent = t('editor.inspector.fields.secondBurstTiming') || 'Trigger Timing';

      const currentTiming = typeof activeChild.triggerTiming === 'number' ? activeChild.triggerTiming : 0.50;
      const timingValText = document.createElement('span');
      timingValText.style.fontSize = '11px';
      timingValText.style.color = '#3498db';
      timingValText.textContent = `${Math.round(currentTiming * 100)}%`;

      timingHeader.appendChild(timingLbl);
      timingHeader.appendChild(timingValText);
      timingWrapper.appendChild(timingHeader);

      const timingSlider = document.createElement('input');
      timingSlider.type = 'range';
      timingSlider.min = '0.15';
      timingSlider.max = '0.85';
      timingSlider.step = '0.05';
      timingSlider.value = currentTiming;
      timingSlider.style.width = '100%';

      timingSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0.50;
        activeChild.triggerTiming = val;
        timingValText.textContent = `${Math.round(val * 100)}%`;
        this.triggerUpdate();
      });

      timingWrapper.appendChild(timingSlider);
      card.appendChild(timingWrapper);

      // 3. Distribution Mode Segmented Buttons for this child
      const modeWrapper = document.createElement('div');
      modeWrapper.style.display = 'flex';
      modeWrapper.style.flexDirection = 'column';
      modeWrapper.style.gap = '4px';

      const modeLabel = document.createElement('label');
      modeLabel.className = 'inspector-label';
      modeLabel.style.fontSize = '10px';
      modeLabel.textContent = t('editor.inspector.fields.secondBurstMode') || 'Distribution Mode';

      const modeButtonGroup = document.createElement('div');
      modeButtonGroup.style.display = 'grid';
      modeButtonGroup.style.gridTemplateColumns = '1fr 1fr 1fr';
      modeButtonGroup.style.gap = '4px';

      const currentDistMode = activeChild.distributionMode || 'random';
      const distModes = [
        {
          key: 'random',
          label: t('editor.inspector.options.distributionMode.random') || 'Random'
        },
        {
          key: 'sequential',
          label: t('editor.inspector.options.distributionMode.sequential') || 'Sequential'
        },
        {
          key: 'simultaneous',
          label: t('editor.inspector.options.distributionMode.simultaneous') || 'Simultaneous'
        }
      ];

      distModes.forEach((m) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isActive = currentDistMode === m.key;
        btn.style.padding = '5px 3px';
        btn.style.fontSize = '10px';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.border = isActive
          ? '1px solid #3498db'
          : '1px solid rgba(255, 255, 255, 0.12)';
        btn.style.background = isActive
          ? 'rgba(52, 152, 219, 0.25)'
          : 'rgba(255, 255, 255, 0.04)';
        btn.style.color = isActive ? '#ffffff' : '#8a9ba8';
        btn.style.fontWeight = isActive ? 'bold' : 'normal';
        btn.textContent = m.label;

        btn.addEventListener('click', () => {
          if (activeChild.distributionMode !== m.key) {
            this.triggerUpdate('beforeChange');
            activeChild.distributionMode = m.key;
            this.triggerUpdate();
            this.render();
          }
        });
        modeButtonGroup.appendChild(btn);
      });

      modeWrapper.appendChild(modeLabel);
      modeWrapper.appendChild(modeButtonGroup);
      card.appendChild(modeWrapper);

      // Section B: Composition Details (Template, Shape, Dynamics, Modifiers, Color, Scale, Sound, Effects)
      // 1. Preset Template Selector
      const templateWrapper = document.createElement('div');
      templateWrapper.style.display = 'flex';
      templateWrapper.style.flexDirection = 'column';
      templateWrapper.style.gap = '2px';

      const templateLbl = document.createElement('label');
      templateLbl.className = 'inspector-label';
      templateLbl.style.fontSize = '10px';
      templateLbl.textContent = t('editor.inspector.fields.templates') || 'Preset Template';

      const templateCustom = new CustomSelect({
        options: AVAILABLE_CHILD_PRESETS.map((presetKey) => ({
          value: presetKey,
          label: presetKey === 'custom'
            ? (t('editor.inspector.options.templates.custom') || 'Custom')
            : (t(`editor.inspector.options.preset.${presetKey}`) || formatOptionLabelFallback(presetKey))
        })),
        value: activeChild.preset || 'custom',
        category: PREVIEW_CATEGORIES.PRESET,
        fieldName: 'preset',
        onChange: (val) => {
          this.triggerUpdate('beforeChange');
          activeChild.preset = val;
          if (val !== 'custom') {
            const tmpl = getTemplateForPreset(val);
            if (tmpl) {
              activeChild.shapeType = tmpl.shape;
              activeChild.dynamicsType = tmpl.dynamics;
              activeChild.pistil = tmpl.modifiers.pistil;
              activeChild.instantBurst = tmpl.modifiers.instantBurst;
              activeChild.effects = [...tmpl.effects];
            }
          }
          this.triggerUpdate();
          this.render();
        }
      });

      templateWrapper.appendChild(templateLbl);
      templateWrapper.appendChild(templateCustom.element);
      card.appendChild(templateWrapper);

      // 2. Row: Shape & Dynamics
      const row1 = document.createElement('div');
      row1.style.display = 'grid';
      row1.style.gridTemplateColumns = '1fr 1fr';
      row1.style.gap = '6px';

      // Shape
      const shapeCol = document.createElement('div');
      const shapeLbl = document.createElement('label');
      shapeLbl.className = 'inspector-label';
      shapeLbl.style.fontSize = '10px';
      shapeLbl.textContent = t('editor.inspector.fields.shapeType') || 'Shape';

      const sortedShapes = [...AVAILABLE_SHAPES].sort((a, b) => {
        const labelA = getEnglishOptionLabel('shapeType', a);
        const labelB = getEnglishOptionLabel('shapeType', b);
        return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
      });

      const shapeCustom = new CustomSelect({
        options: sortedShapes.map((sh) => ({
          value: sh,
          label: t(`editor.inspector.options.shapeType.${sh}`) || sh
        })),
        value: activeChild.shapeType || 'sphere',
        category: PREVIEW_CATEGORIES.SHAPE,
        fieldName: 'shapeType',
        onChange: (val) => {
          this.triggerUpdate('beforeChange');
          activeChild.shapeType = val;
          this.triggerUpdate();
        }
      });

      shapeCol.appendChild(shapeLbl);
      shapeCol.appendChild(shapeCustom.element);

      // Dynamics
      const dynCol = document.createElement('div');
      const dynLbl = document.createElement('label');
      dynLbl.className = 'inspector-label';
      dynLbl.style.fontSize = '10px';
      dynLbl.textContent = t('editor.inspector.fields.dynamicsType') || 'Dynamics';

      const sortedDynamics = [...AVAILABLE_DYNAMICS].sort((a, b) => {
        const labelA = getEnglishOptionLabel('dynamicsType', a);
        const labelB = getEnglishOptionLabel('dynamicsType', b);
        return labelA.localeCompare(labelB, 'en', { sensitivity: 'base' });
      });

      const dynCustom = new CustomSelect({
        options: sortedDynamics.map((dyn) => ({
          value: dyn,
          label: t(`editor.inspector.options.dynamicsType.${dyn}`) || dyn
        })),
        value: activeChild.dynamicsType || 'standard',
        category: PREVIEW_CATEGORIES.DYNAMICS,
        fieldName: 'dynamicsType',
        onChange: (val) => {
          this.triggerUpdate('beforeChange');
          activeChild.dynamicsType = val;
          this.triggerUpdate();
        }
      });

      dynCol.appendChild(dynLbl);
      dynCol.appendChild(dynCustom.element);

      row1.appendChild(shapeCol);
      row1.appendChild(dynCol);
      card.appendChild(row1);

      // 3. Row: Structural Modifiers (Pistil & Instant Burst)
      const modRow = document.createElement('div');
      modRow.style.display = 'flex';
      modRow.style.gap = '14px';
      modRow.style.alignItems = 'center';
      modRow.style.padding = '2px 0';

      // Pistil
      const pistilLabel = document.createElement('label');
      pistilLabel.className = 'inspector-checkbox-container';
      pistilLabel.style.fontSize = '10px';
      pistilLabel.style.cursor = 'pointer';

      const pistilInput = document.createElement('input');
      pistilInput.className = 'inspector-checkbox';
      pistilInput.type = 'checkbox';
      pistilInput.checked = Boolean(activeChild.pistil);
      pistilInput.addEventListener('change', (e) => {
        this.triggerUpdate('beforeChange');
        activeChild.pistil = e.target.checked;
        this.triggerUpdate();
        this.render();
      });

      const pistilText = document.createElement('span');
      pistilText.textContent = t('editor.inspector.fields.pistil') || 'Pistil';

      pistilLabel.appendChild(pistilInput);
      pistilLabel.appendChild(pistilText);
      EffectPreviewTooltip.getInstance().bindElement(
        pistilLabel,
        'pistil',
        PREVIEW_CATEGORIES.OPTICAL_EFFECT
      );
      modRow.appendChild(pistilLabel);

      // Instant Burst
      const instantLabel = document.createElement('label');
      instantLabel.className = 'inspector-checkbox-container';
      instantLabel.style.fontSize = '10px';
      instantLabel.style.cursor = 'pointer';

      const instantInput = document.createElement('input');
      instantInput.className = 'inspector-checkbox';
      instantInput.type = 'checkbox';
      instantInput.checked = Boolean(activeChild.instantBurst);
      instantInput.addEventListener('change', (e) => {
        this.triggerUpdate('beforeChange');
        activeChild.instantBurst = e.target.checked;
        this.triggerUpdate();
      });

      const instantText = document.createElement('span');
      instantText.textContent = t('editor.inspector.fields.instantBurst') || 'Instant Burst';

      instantLabel.appendChild(instantInput);
      instantLabel.appendChild(instantText);
      modRow.appendChild(instantLabel);

      card.appendChild(modRow);

      // Row: Color Palette Swatches & Custom Picker
      const colorWrapper = document.createElement('div');
      colorWrapper.style.display = 'flex';
      colorWrapper.style.flexDirection = 'column';
      colorWrapper.style.gap = '4px';

      const colorLbl = document.createElement('label');
      colorLbl.className = 'inspector-label';
      colorLbl.style.fontSize = '10px';
      colorLbl.textContent = t('editor.inspector.fields.color') || 'Color';

      const colorPaletteRow = document.createElement('div');
      colorPaletteRow.style.display = 'flex';
      colorPaletteRow.style.alignItems = 'center';
      colorPaletteRow.style.flexWrap = 'wrap';
      colorPaletteRow.style.gap = '5px';

      const COLOR_PALETTE = [
        { key: 'red', hex: '#ff3333' },
        { key: 'gold', hex: '#ffd700' },
        { key: 'white', hex: '#ffffff' },
        { key: 'blue', hex: '#007aff' },
        { key: 'green', hex: '#34c759' },
        { key: 'purple', hex: '#af52de' },
        { key: 'pink', hex: '#ff2d55' },
        { key: 'aqua', hex: '#00e5ff' }
      ];

      COLOR_PALETTE.forEach((c) => {
        const swatch = document.createElement('div');
        const isActiveColor = (activeChild.color || '').toLowerCase() === c.hex.toLowerCase();
        swatch.style.width = '18px';
        swatch.style.height = '18px';
        swatch.style.borderRadius = '50%';
        swatch.style.background = c.hex;
        swatch.style.cursor = 'pointer';
        swatch.style.border = isActiveColor
          ? '2px solid #ffffff'
          : '1px solid rgba(0, 0, 0, 0.4)';
        swatch.style.boxShadow = isActiveColor
          ? '0 0 6px rgba(255, 255, 255, 0.8)'
          : 'none';
        swatch.title = c.key;

        swatch.addEventListener('click', () => {
          this.triggerUpdate('beforeChange');
          activeChild.color = c.hex;
          this.triggerUpdate();
          this.render();
        });
        colorPaletteRow.appendChild(swatch);
      });

      const customColorInput = document.createElement('input');
      customColorInput.type = 'color';
      customColorInput.value = activeChild.color || '#ffd700';
      customColorInput.style.width = '20px';
      customColorInput.style.height = '20px';
      customColorInput.style.border = 'none';
      customColorInput.style.borderRadius = '3px';
      customColorInput.style.cursor = 'pointer';
      customColorInput.style.background = 'transparent';

      customColorInput.addEventListener('change', (e) => {
        this.triggerUpdate('beforeChange');
        activeChild.color = e.target.value;
        this.triggerUpdate();
        this.render();
      });
      colorPaletteRow.appendChild(customColorInput);

      colorWrapper.appendChild(colorLbl);
      colorWrapper.appendChild(colorPaletteRow);
      card.appendChild(colorWrapper);

      // Row: Scale Slider
      const scaleWrapper = document.createElement('div');
      scaleWrapper.style.display = 'flex';
      scaleWrapper.style.flexDirection = 'column';
      scaleWrapper.style.gap = '2px';

      const scaleHeader = document.createElement('div');
      scaleHeader.style.display = 'flex';
      scaleHeader.style.justifyContent = 'space-between';

      const scaleLbl = document.createElement('label');
      scaleLbl.className = 'inspector-label';
      scaleLbl.style.fontSize = '10px';
      scaleLbl.textContent = t('editor.inspector.fields.childShellScale') || 'Scale';

      const currentScale = typeof activeChild.scale === 'number' ? activeChild.scale : 0.35;
      const scaleValText = document.createElement('span');
      scaleValText.style.fontSize = '11px';
      scaleValText.style.color = '#3498db';
      scaleValText.textContent = `${currentScale.toFixed(2)}x`;

      scaleHeader.appendChild(scaleLbl);
      scaleHeader.appendChild(scaleValText);
      scaleWrapper.appendChild(scaleHeader);

      const scaleSlider = document.createElement('input');
      scaleSlider.type = 'range';
      scaleSlider.min = '0.15';
      scaleSlider.max = '0.80';
      scaleSlider.step = '0.05';
      scaleSlider.value = currentScale;
      scaleSlider.style.width = '100%';

      scaleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0.35;
        activeChild.scale = val;
        scaleValText.textContent = `${val.toFixed(2)}x`;
        this.triggerUpdate();
      });

      scaleWrapper.appendChild(scaleSlider);
      card.appendChild(scaleWrapper);

      // Row: Child Burst Sound
      const soundWrapper = document.createElement('div');
      soundWrapper.style.display = 'flex';
      soundWrapper.style.flexDirection = 'column';
      soundWrapper.style.gap = '2px';

      const soundLbl = document.createElement('label');
      soundLbl.className = 'inspector-label';
      soundLbl.style.fontSize = '10px';
      soundLbl.textContent = t('editor.inspector.fields.burstSound') || 'Burst Sound';

      const SOUND_OPTIONS = ['standard', 'heavy', 'soft', 'silent'];
      const soundCustom = new CustomSelect({
        options: SOUND_OPTIONS.map((snd) => ({
          value: snd,
          label: t(`editor.inspector.options.burstSound.${snd}`) || formatOptionLabelFallback(snd)
        })),
        value: activeChild.burstSound || 'standard',
        fieldName: 'burstSound',
        onChange: (val) => {
          this.triggerUpdate('beforeChange');
          activeChild.burstSound = val;
          this.triggerUpdate();
        }
      });

      soundWrapper.appendChild(soundLbl);
      soundWrapper.appendChild(soundCustom.element);
      card.appendChild(soundWrapper);

      // Row: Active Effects Chips
      const effectsWrapper = document.createElement('div');
      effectsWrapper.style.display = 'flex';
      effectsWrapper.style.flexDirection = 'column';
      effectsWrapper.style.gap = '4px';

      const effLbl = document.createElement('label');
      effLbl.className = 'inspector-label';
      effLbl.style.fontSize = '10px';
      effLbl.textContent = t('editor.inspector.fields.activeEffects') || 'Active Effects';

      const chipsWrapper = document.createElement('div');
      chipsWrapper.style.display = 'flex';
      chipsWrapper.style.flexWrap = 'wrap';
      chipsWrapper.style.gap = '4px';

      const currentChildEffects = Array.isArray(activeChild.effects) ? activeChild.effects : [];
      AVAILABLE_EFFECT_TAGS.forEach((eff) => {
        const isEffectActive = currentChildEffects.includes(eff.key);
        const chip = document.createElement('span');
        chip.className = 'effect-chip';
        chip.style.fontSize = '10px';
        chip.style.padding = '3px 7px';
        chip.style.cursor = 'pointer';
        chip.style.borderRadius = '4px';
        chip.style.userSelect = 'none';
        chip.style.border = isEffectActive
          ? '1px solid #3498db'
          : '1px solid rgba(255, 255, 255, 0.15)';
        chip.style.background = isEffectActive
          ? 'rgba(52, 152, 219, 0.25)'
          : 'rgba(255, 255, 255, 0.04)';
        chip.style.color = isEffectActive ? '#ffffff' : '#8a9ba8';
        chip.style.fontWeight = isEffectActive ? 'bold' : 'normal';
        const labelKeyPath = `editor.inspector.fields.${eff.labelKey}`;
        const translatedLabel = t(labelKeyPath);
        chip.textContent =
          translatedLabel && translatedLabel !== labelKeyPath
            ? translatedLabel
            : formatOptionLabelFallback(eff.key);

        EffectPreviewTooltip.getInstance().bindElement(
          chip,
          eff.key,
          PREVIEW_CATEGORIES.OPTICAL_EFFECT
        );

        chip.addEventListener('click', () => {
          this.triggerUpdate('beforeChange');
          if (isEffectActive) {
            activeChild.effects = currentChildEffects.filter((k) => k !== eff.key);
          } else {
            activeChild.effects = [...currentChildEffects, eff.key];
          }
          this.triggerUpdate();
          this.render();
        });
        chipsWrapper.appendChild(chip);
      });

      effectsWrapper.appendChild(effLbl);
      effectsWrapper.appendChild(chipsWrapper);
      card.appendChild(effectsWrapper);

      container.appendChild(card);
    }

    parent.appendChild(container);
  }
}

