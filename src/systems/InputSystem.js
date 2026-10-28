import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { sequences } from '../config/sequences/index.js';
import { globalEventBus } from '../core/EventBus.js';
import { t } from '../config/lang/i18n.js';
import {
  SETTINGS_DEFINITION,
  applySetting,
  resetSettings,
  resetCategorySettings,
  getSettingsSnapshot,
  revertSettings
} from '../config/settings.js';
import { DOCS_CONFIG } from '../config/docs.js';

export class InputSystem {
  constructor(
    camera,
    domElement,
    fireworkSystem = null,
    renderer = null,
    postProcessing = null,
    audioSystem = null,
    sceneManager = null,
    smokeSystem = null
  ) {
    this.camera = camera;
    this.controls = new PointerLockControls(
      camera,
      domElement
    );
    this.fireworkSystem = fireworkSystem;
    this.renderer = renderer;
    this.postProcessing = postProcessing;
    this.audioSystem = audioSystem;
    this.sceneManager = sceneManager;
    this.smokeSystem = smokeSystem || (fireworkSystem ? fireworkSystem.smokeSystem : null);

    this.settingsContext = {
      renderer: this.renderer,
      postProcessing: this.postProcessing,
      audioSystem: this.audioSystem,
      sceneManager: this.sceneManager,
      smokeSystem: this.smokeSystem,
      fireworkSystem: this.fireworkSystem
    };

    this.paused = false;
    this.selectedPresetKey = 'random';
    this.eventSubscriptions = [];
    
    this.sequenceOptions = sequences;
    this.selectedSequenceKey = sequences.length > 0 ? sequences[0].key : null;
    
    // Movement state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shift: false
    };
    this.status = {
      moving: false,
      direction: 'idle',
      looking: false,
      firework: 'none',
      effect: 'none',
      diagnostics: {
        launched: 0,
        bursted: 0,
        shapeFallbacks: 0,
        effectFallbacks: 0,
        warnings: 0,
        lastWarning: 'none'
      }
    };

    this.presetOptions = this.fireworkSystem?.shellPresetFactory?.getPresetMenuEntries?.() ?? [
      { key: 'random', label: 'Random' }
    ];
    
    // Click to lock cursor
    domElement.addEventListener('click', () => {
      if (!this.controls.isLocked && !this.paused) {
        this.controls.lock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === domElement) {
        this.instructions.style.display = 'none';
        this.updateStatusOverlay();
      } else {
        this.instructions.style.display = '';
      }
    });

    document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));

    this.eventSubscriptions.push(
      globalEventBus.on('firework:launch', (detail) => {
        this.status.firework = detail.shellType;
        this.status.effect = detail.effectType;
        this.updateStatusOverlay();
      }),

      globalEventBus.on('firework:burst', (detail) => {
        this.status.firework = detail.shellType;
        this.status.effect = detail.effectType;
        this.updateStatusOverlay();
      }),

      globalEventBus.on('firework:diagnostics', (detail) => {
        this.status.diagnostics = detail;
        this.updateStatusOverlay();
      })
    );
    
    // Instruction overlay
    this.setupInstructions();
    this.setupPauseMenu();
  }
  
  setupInstructions() {
    // Crosshair dot
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.width = '4px';
    crosshair.style.height = '4px';
    crosshair.style.marginLeft = '-2px';
    crosshair.style.marginTop = '-2px';
    crosshair.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    crosshair.style.borderRadius = '50%';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '100';
    document.body.appendChild(crosshair);

    this.instructions = document.createElement('div');
    this.instructions.style.display = 'none';

    this.statusOverlay = document.createElement('div');
    this.statusOverlay.className = 'system-status-overlay';
    this.statusOverlay.style.position = 'fixed';
    this.statusOverlay.style.top = '112px';
    this.statusOverlay.style.left = '12px';
    this.statusOverlay.style.width = '240px';
    this.statusOverlay.style.boxSizing = 'border-box';
    this.statusOverlay.style.padding = '8px 12px';
    this.statusOverlay.style.background = 'rgba(12, 16, 24, 0.85)';
    this.statusOverlay.style.backdropFilter = 'blur(10px)';
    this.statusOverlay.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    this.statusOverlay.style.color = '#fff';
    this.statusOverlay.style.fontFamily = 'monospace';
    this.statusOverlay.style.fontSize = '12px';
    this.statusOverlay.style.lineHeight = '1.4';
    this.statusOverlay.style.borderRadius = '8px';
    this.statusOverlay.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)';
    this.statusOverlay.style.zIndex = '999';
    this.statusOverlay.style.pointerEvents = 'none';
    document.body.appendChild(this.statusOverlay);
    this.updateStatusOverlay();

    this.controls.addEventListener('lock', () => {
      this.instructions.style.display = 'none';
      this.status.looking = false;
      this.updateStatusOverlay();
    });
    this.controls.addEventListener('unlock', () => {
      this.instructions.style.display = this.paused ? 'none' : '';
      this.status.moving = false;
      this.status.direction = 'idle';
      if (this.paused) {
        this.showPauseMenu();
      }
      this.updateStatusOverlay();
    });
  }

  setupPauseMenu() {
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'firework-pause-overlay';
    this.pauseOverlay.style.display = 'none';

    const panel = document.createElement('div');
    panel.className = 'firework-pause-panel';

    const header = document.createElement('div');
    header.className = 'settings-modal-header';

    const headerText = document.createElement('div');
    headerText.className = 'settings-modal-header-text';

    const title = document.createElement('div');
    title.className = 'firework-pause-title';
    title.textContent = t('editor.settingsTitle') || 'Settings & Controls';

    const description = document.createElement('div');
    description.className = 'firework-pause-description';
    description.textContent = t('editor.settingsDescription') || 'Press ESC to resume. Adjust settings below:';

    headerText.appendChild(title);
    headerText.appendChild(description);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'settings-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute(
      'aria-label',
      'Close'
    );
    closeBtn.addEventListener('click', () => this.resume());

    header.appendChild(headerText);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'settings-body-container';

    const sidebar = document.createElement('div');
    sidebar.className = 'settings-tabs-sidebar';

    const navList = document.createElement('div');
    navList.className = 'settings-nav-list';

    const tabs = [
      {
        key: 'system',
        label: t('editor.settingsTab_system') || 'System'
      },
      {
        key: 'entities',
        label: t('editor.settingsTab_entities') || 'Entities & Environment'
      },
      {
        key: 'audio',
        label: t('editor.settingsTab_audio') || 'Audio'
      },
      {
        key: 'tools',
        label: t('editor.settingsTab_tools') || 'Tools & Editors'
      }
    ];

    const tabButtons = [];
    const tabPanes = [];

    const contentArea = document.createElement('div');
    contentArea.className = 'settings-tabs-content';

    this.activeSettingsTab = 'system';
    this.switchSettingsTab = (tabKey) => {
      this.activeSettingsTab = tabKey;
      for (const btn of tabButtons) {
        if (btn.dataset.tab === tabKey) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
      for (const pane of tabPanes) {
        if (pane.dataset.tab === tabKey) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      }
    };

    for (let i = 0; i < tabs.length; i++) {
      const tabDef = tabs[i];

      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = 'settings-tab-btn' + (i === 0 ? ' active' : '');
      tabBtn.dataset.tab = tabDef.key;

      const indicator = document.createElement('span');
      indicator.className = 'settings-tab-indicator';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'settings-tab-text';
      labelSpan.textContent = tabDef.label;

      tabBtn.appendChild(indicator);
      tabBtn.appendChild(labelSpan);

      tabBtn.addEventListener('click', () => {
        this.switchSettingsTab(tabDef.key);
      });

      tabButtons.push(tabBtn);
      navList.appendChild(tabBtn);

      const pane = document.createElement('div');
      pane.className = 'settings-tab-pane' + (i === 0 ? ' active' : '');
      pane.dataset.tab = tabDef.key;

      if (tabDef.key !== 'tools') {
        const paneHeader = document.createElement('div');
        paneHeader.className = 'settings-pane-header';

        const paneTitle = document.createElement('div');
        paneTitle.className = 'settings-pane-title';
        paneTitle.textContent = tabDef.label;

        const tabResetBtn = document.createElement('button');
        tabResetBtn.type = 'button';
        tabResetBtn.className = 'settings-tab-reset-btn';
        tabResetBtn.textContent = t('editor.settingsResetCategory') || 'Reset Current Tab';
        tabResetBtn.addEventListener('click', () => {
          const confirmMsg = t('editor.settingsConfirmResetCategory')
            || 'Are you sure you want to reset settings in this category?';
          if (
            typeof window !== 'undefined' &&
            window.confirm &&
            !window.confirm(confirmMsg)
          ) {
            return;
          }
          resetCategorySettings(
            tabDef.key,
            this.settingsContext
          );
          if (tabDef.key === 'system') {
            if (this.qualitySelect) {
              this.qualitySelect.value = 'medium';
              localStorage.setItem(
                'graphics_quality',
                'medium'
              );
              globalEventBus.emit(
                'graphics:quality',
                'medium'
              );
            }
          }
          this.updateSettingsUI();
        });

        paneHeader.appendChild(paneTitle);
        paneHeader.appendChild(tabResetBtn);
        pane.appendChild(paneHeader);
      }

      if (tabDef.key === 'tools') {
        const toolsList = [
          {
            title: t('editor.settingsTimelineEditor') || 'Timeline Editor',
            description: 'Advanced multi-track timeline sequencer with audio waveforms and keyframes.',
            btnText: t('editor.settingsTimelineEditor') || 'Timeline Editor',
            bg: 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)',
            border: 'rgba(0, 243, 255, 0.3)',
            action: () => {
              window.location.href = 'editor.html';
            }
          },
          {
            title: t('editor.settingsStaticEditor') || 'Static Formation Editor',
            description: '3D point cloud editor for creating custom drone shapes and holograms.',
            btnText: t('editor.settingsStaticEditor') || 'Static Editor',
            bg: 'linear-gradient(180deg, #aa3bff 0%, #8a1bef 100%)',
            border: 'rgba(170, 59, 255, 0.3)',
            action: () => {
              window.location.href = 'formation.html';
            }
          },
          {
            title: t('editor.settingsUserGuide') || 'User Guide',
            description: 'Complete user manual, shortcuts, and documentation for the system.',
            btnText: t('editor.settingsUserGuide') || 'User Guide',
            bg: 'linear-gradient(180deg, #11998e 0%, #38ef7d 100%)',
            border: 'rgba(56, 239, 125, 0.3)',
            action: () => {
              if (
                window.electronAPI &&
                typeof window.electronAPI.openExternal === 'function'
              ) {
                window.electronAPI.openExternal(DOCS_CONFIG.userGuideUrl);
              } else {
                window.open(
                  DOCS_CONFIG.userGuideUrl,
                  '_blank',
                  'noopener,noreferrer'
                );
              }
            }
          }
        ];

        for (const tool of toolsList) {
          const toolCard = document.createElement('div');
          toolCard.className = 'settings-tool-card';

          const toolHeader = document.createElement('div');
          toolHeader.className = 'settings-tool-header';

          const toolTitle = document.createElement('div');
          toolTitle.className = 'settings-tool-title';
          toolTitle.textContent = tool.title;

          toolHeader.appendChild(toolTitle);
          toolCard.appendChild(toolHeader);

          const toolDesc = document.createElement('div');
          toolDesc.className = 'settings-tool-desc';
          toolDesc.textContent = tool.description;
          toolCard.appendChild(toolDesc);

          const toolBtn = document.createElement('button');
          toolBtn.type = 'button';
          toolBtn.className = 'firework-pause-button';
          toolBtn.style.background = tool.bg;
          toolBtn.style.border = `1px solid ${tool.border}`;
          toolBtn.style.color = '#fff';
          toolBtn.style.alignSelf = 'flex-start';
          toolBtn.style.marginTop = '4px';
          toolBtn.textContent = tool.btnText;
          toolBtn.addEventListener('click', tool.action);

          toolCard.appendChild(toolBtn);
          pane.appendChild(toolCard);
        }
      } else {
        const catItems = SETTINGS_DEFINITION.filter(
          (s) => s.category === tabDef.key
        );

        const subgroups = {};
        for (const item of catItems) {
          const subKey = item.subgroup || 'default';
          if (!subgroups[subKey]) {
            subgroups[subKey] = [];
          }
          subgroups[subKey].push(item);
        }

        for (const [subKey, items] of Object.entries(subgroups)) {
          const card = document.createElement('div');
          card.className = 'settings-subgroup';

          const subTitleText = t(`editor.subgroup_${subKey}`);
          if (subTitleText) {
            const subHeader = document.createElement('div');
            subHeader.className = 'settings-subgroup-header';

            const badge = document.createElement('span');
            badge.className = 'settings-subgroup-badge';

            const subTitle = document.createElement('span');
            subTitle.className = 'settings-subgroup-title';
            subTitle.textContent = subTitleText;

            subHeader.appendChild(badge);
            subHeader.appendChild(subTitle);
            card.appendChild(subHeader);
          }

          for (const item of items) {
            const row = this.renderSettingItem(item);
            card.appendChild(row);
          }

          pane.appendChild(card);
        }

        if (tabDef.key === 'system') {
          const profileCard = document.createElement('div');
          profileCard.className = 'settings-subgroup';

          const profileHeader = document.createElement('div');
          profileHeader.className = 'settings-subgroup-header';

          const badge = document.createElement('span');
          badge.className = 'settings-subgroup-badge';

          const subTitle = document.createElement('span');
          subTitle.className = 'settings-subgroup-title';
          subTitle.textContent = t('editor.subgroup_profile') || 'Quality Profile Preset';

          profileHeader.appendChild(badge);
          profileHeader.appendChild(subTitle);
          profileCard.appendChild(profileHeader);

          const row = document.createElement('div');
          row.className = 'settings-row';

          const qLabel = document.createElement('div');
          qLabel.className = 'settings-label';
          qLabel.style.marginBottom = '6px';
          qLabel.textContent = t('editor.graphicsQuality') || 'Graphics Quality';
          row.appendChild(qLabel);

          this.qualitySelect = document.createElement('select');
          this.qualitySelect.className = 'firework-pause-select';

          const qualityOptions = [
            {
              key: 'low',
              label: t('editor.graphicsLow') || 'Low'
            },
            {
              key: 'medium',
              label: t('editor.graphicsMedium') || 'Medium'
            },
            {
              key: 'high',
              label: t('editor.graphicsHigh') || 'High'
            }
          ];

          for (const option of qualityOptions) {
            const optionElement = document.createElement('option');
            optionElement.value = option.key;
            optionElement.textContent = option.label;
            this.qualitySelect.appendChild(optionElement);
          }

          this.qualitySelect.value = localStorage.getItem('graphics_quality') || 'medium';
          this.qualitySelect.addEventListener('change', () => {
            const quality = this.qualitySelect.value;
            localStorage.setItem(
              'graphics_quality',
              quality
            );
            globalEventBus.emit(
              'graphics:quality',
              quality
            );
          });

          row.appendChild(this.qualitySelect);
          profileCard.appendChild(row);
          pane.appendChild(profileCard);
        }
      }

      tabPanes.push(pane);
      contentArea.appendChild(pane);
    }

    const sidebarFooter = document.createElement('div');
    sidebarFooter.className = 'settings-sidebar-footer';

    const revertBtn = document.createElement('button');
    revertBtn.type = 'button';
    revertBtn.className = 'settings-footer-btn settings-revert-btn';
    revertBtn.textContent = t('editor.settingsRevertChanges') || 'Revert Changes';
    revertBtn.addEventListener('click', () => {
      if (this.initialSettingsSnapshot) {
        revertSettings(
          this.initialSettingsSnapshot,
          this.settingsContext
        );
        if (this.initialSettingsSnapshot.graphicsQuality) {
          globalEventBus.emit(
            'graphics:quality',
            this.initialSettingsSnapshot.graphicsQuality
          );
        }
        this.updateSettingsUI();
      }
    });

    const resetCategoryBtn = document.createElement('button');
    resetCategoryBtn.type = 'button';
    resetCategoryBtn.className = 'settings-footer-btn settings-reset-category-btn';
    resetCategoryBtn.textContent = t('editor.settingsResetCategory') || 'Reset Current Tab';
    resetCategoryBtn.addEventListener('click', () => {
      const activeTab = this.activeSettingsTab || 'system';
      if (activeTab === 'tools') {
        return;
      }
      const confirmMsg = t('editor.settingsConfirmResetCategory')
        || 'Are you sure you want to reset settings in this category?';
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm(confirmMsg)
      ) {
        return;
      }
      resetCategorySettings(
        activeTab,
        this.settingsContext
      );
      if (activeTab === 'system') {
        if (this.qualitySelect) {
          this.qualitySelect.value = 'medium';
          localStorage.setItem(
            'graphics_quality',
            'medium'
          );
          globalEventBus.emit(
            'graphics:quality',
            'medium'
          );
        }
      }
      this.updateSettingsUI();
    });

    const resetAllBtn = document.createElement('button');
    resetAllBtn.type = 'button';
    resetAllBtn.className = 'settings-footer-btn settings-reset-all-btn';
    resetAllBtn.textContent = t('editor.settingsResetAll') || t('editor.settingsReset') || 'Reset All Settings';
    resetAllBtn.addEventListener('click', () => {
      const confirmMsg = t('editor.settingsConfirmResetAll')
        || 'Are you sure you want to reset all settings to defaults?';
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm(confirmMsg)
      ) {
        return;
      }
      resetSettings(this.settingsContext);

      if (this.qualitySelect) {
        this.qualitySelect.value = 'medium';
        localStorage.setItem(
          'graphics_quality',
          'medium'
        );
        globalEventBus.emit(
          'graphics:quality',
          'medium'
        );
      }
      this.updateSettingsUI();
    });

    sidebarFooter.appendChild(revertBtn);
    sidebarFooter.appendChild(resetCategoryBtn);
    sidebarFooter.appendChild(resetAllBtn);
    sidebar.appendChild(navList);
    sidebar.appendChild(sidebarFooter);

    bodyContainer.appendChild(sidebar);
    bodyContainer.appendChild(contentArea);
    panel.appendChild(bodyContainer);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'firework-pause-actions';

    this.timelineButton = document.createElement('button');
    this.timelineButton.type = 'button';
    this.timelineButton.className = 'firework-pause-button';
    this.timelineButton.textContent = t('editor.settingsTimeline') || 'Timeline Ctrl+T';
    this.timelineButton.style.backgroundColor = '#1976d2';
    this.timelineButton.style.boxShadow = '0 8px 20px rgba(25, 118, 210, 0.22)';
    this.timelineButton.addEventListener('click', () => {
      if (this.timelineEditor) {
        this.timelineEditor.toggle();
      }
    });

    this.resumeButton = document.createElement('button');
    this.resumeButton.type = 'button';
    this.resumeButton.className = 'firework-pause-button';
    this.resumeButton.textContent = t('editor.settingsResume') || 'Resume';
    this.resumeButton.addEventListener('click', () => this.resume());

    buttonRow.appendChild(this.timelineButton);
    buttonRow.appendChild(this.resumeButton);
    panel.appendChild(buttonRow);

    this.pauseOverlay.appendChild(panel);
    document.body.appendChild(this.pauseOverlay);
  }

  renderSettingItem(item) {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const saved = localStorage.getItem(`settings_${item.key}`);
    let currentVal = item.default;
    if (saved !== null) {
      currentVal = item.type === 'checkbox'
        ? saved === 'true'
        : (item.type === 'select' ? saved : parseFloat(saved));
    }

    if (item.type === 'slider') {
      const header = document.createElement('div');
      header.className = 'settings-slider-header';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'settings-label';
      labelSpan.textContent = t(`editor.${item.key}`) || item.label;

      const isInteger = item.step >= 1;
      const valSpan = document.createElement('span');
      valSpan.className = 'settings-value';
      valSpan.textContent = isInteger
        ? Math.round(currentVal).toString()
        : currentVal.toFixed(2);

      header.appendChild(labelSpan);
      header.appendChild(valSpan);
      row.appendChild(header);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'settings-slider';
      slider.min = item.min;
      slider.max = item.max;
      slider.step = item.step;
      slider.value = currentVal;

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        valSpan.textContent = isInteger
          ? Math.round(val).toString()
          : val.toFixed(2);
        item.apply(val, this.settingsContext);
      });

      slider.addEventListener('change', () => {
        const val = parseFloat(slider.value);
        localStorage.setItem(
          `settings_${item.key}`,
          val.toString()
        );
      });

      row.appendChild(slider);

      item.inputElement = slider;
      item.valueDisplayElement = valSpan;
    } else if (item.type === 'checkbox') {
      const cbLabel = document.createElement('label');
      cbLabel.className = 'settings-checkbox-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'settings-checkbox';
      checkbox.checked = currentVal;

      checkbox.addEventListener('change', () => {
        const val = checkbox.checked;
        localStorage.setItem(
          `settings_${item.key}`,
          val.toString()
        );
        item.apply(val, this.settingsContext);
      });

      const labelText = document.createTextNode(' ' + (t(`editor.${item.key}`) || item.label));

      cbLabel.appendChild(checkbox);
      cbLabel.appendChild(labelText);
      row.appendChild(cbLabel);

      item.inputElement = checkbox;
    } else if (item.type === 'select') {
      const header = document.createElement('div');
      header.className = 'settings-slider-header';
      header.style.marginBottom = '6px';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'settings-label';
      labelSpan.textContent = t(`editor.${item.key}`) || item.label;
      header.appendChild(labelSpan);
      row.appendChild(header);

      const select = document.createElement('select');
      select.className = 'firework-pause-select';

      for (const optKey of (item.options || [])) {
        const optionElement = document.createElement('option');
        optionElement.value = optKey;
        const fullKey = `editor.${item.key}_${optKey}`;
        const transVal = t(fullKey);
        let optText = '';

        if (transVal && transVal !== fullKey) {
          optText = transVal;
        } else {
          const graphicsKey = `editor.graphics${optKey.charAt(0).toUpperCase() + optKey.slice(1)}`;
          const transGraphics = t(graphicsKey);
          if (transGraphics && transGraphics !== graphicsKey) {
            optText = transGraphics;
          } else {
            const shortKey = `editor.${optKey}`;
            const transShort = t(shortKey);
            if (transShort && transShort !== shortKey) {
              optText = transShort;
            } else {
              optText = optKey.charAt(0).toUpperCase() + optKey.slice(1);
            }
          }
        }

        optionElement.textContent = optText;
        if (optKey === currentVal) {
          optionElement.selected = true;
        }
        select.appendChild(optionElement);
      }

      select.addEventListener('change', () => {
        const val = select.value;
        localStorage.setItem(
          `settings_${item.key}`,
          val
        );
        item.apply(val, this.settingsContext);
      });

      row.appendChild(select);
      item.inputElement = select;
    }

    return row;
  }

  getSelectedPresetKey() {
    return this.selectedPresetKey;
  }

  getSelectedPreset() {
    if (!this.fireworkSystem?.shellPresetFactory) {
      return null;
    }

    return this.selectedPresetKey === 'random'
      ? null
      : this.fireworkSystem.shellPresetFactory.createPresetByKey(this.selectedPresetKey);
  }

  getSelectedPresetLabel() {
    return this.presetOptions.find(option => option.key === this.selectedPresetKey)?.label ?? 'Random';
  }

  isPaused() {
    return this.paused;
  }

  pause() {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.instructions.style.display = 'none';
    this.showPauseMenu();
    if (this.controls.isLocked) {
      this.controls.unlock();
    }
    this.updateStatusOverlay();
  }

  resume() {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    this.hidePauseMenu();
    this.instructions.style.display = '';
    this.updateStatusOverlay();
  }

  togglePause() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  updateSettingsUI() {
    for (const item of SETTINGS_DEFINITION) {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`settings_${item.key}`)
        : null;
      let currentVal = item.default;
      if (saved !== null) {
        currentVal = item.type === 'checkbox'
          ? saved === 'true'
          : (item.type === 'select' ? saved : parseFloat(saved));
      }

      if (item.type === 'slider' && item.inputElement) {
        item.inputElement.value = currentVal;
        if (item.valueDisplayElement) {
          const isInt = item.step >= 1;
          item.valueDisplayElement.textContent = isInt
            ? Math.round(currentVal).toString()
            : currentVal.toFixed(2);
        }
      } else if (item.type === 'checkbox' && item.inputElement) {
        item.inputElement.checked = currentVal;
      } else if (item.type === 'select' && item.inputElement) {
        item.inputElement.value = currentVal;
      }
    }

    if (this.qualitySelect && typeof localStorage !== 'undefined') {
      this.qualitySelect.value = localStorage.getItem('graphics_quality') || 'medium';
    }
  }

  showPauseMenu() {
    if (!this.pauseOverlay) {
      return;
    }

    this.initialSettingsSnapshot = getSettingsSnapshot();
    this.updateSettingsUI();

    this.pauseOverlay.style.display = 'flex';
  }

  hidePauseMenu() {
    if (!this.pauseOverlay) {
      return;
    }

    this.pauseOverlay.style.display = 'none';
  }

  updateStatusOverlay() {
    if (!this.statusOverlay) return;
    const locked = this.controls.isLocked ? 'Yes' : 'No';
    const moving = this.status.moving ? 'Yes' : 'No';
    const d = this.status.diagnostics;
    const warningText = d.lastWarning === 'none' ? 'none' : d.lastWarning;
    const pauseState = this.paused ? 'Paused' : 'Live';
    const selectedSeqLabel = this.sequenceOptions.find(o => o.key === this.selectedSequenceKey)?.label ?? 'None';
    this.statusOverlay.innerHTML = `Mode: ${pauseState}<br>Locked: ${locked}<br>Moving: ${moving} (${this.status.direction})<br>Looking: ${this.status.looking ? 'Yes' : 'No'}<br>Preset: ${this.getSelectedPresetLabel()}<br>Sequence: ${selectedSeqLabel}<br>Shell: ${this.status.firework}<br>Effect: ${this.status.effect}<br>Launch/Burst: ${d.launched}/${d.bursted}<br>Fallback S/E: ${d.shapeFallbacks}/${d.effectFallbacks}<br>Warnings: ${d.warnings}<br>Last Warn: ${warningText}`;
  }

  onMouseMove(event) {
    if (!this.controls.isLocked) return;
    this.status.looking = true;
    this.updateStatusOverlay();
    clearTimeout(this.lookTimer);
    this.lookTimer = setTimeout(() => {
      this.status.looking = false;
      this.updateStatusOverlay();
    }, 150);
  }

  onKeyDown(event) {
    const target = event.target;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }

    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.controls && this.controls.isLocked) {
        this.controls.unlock();
      }
      if (this.timelineEditor && this.timelineEditor.visible) {
        this.timelineEditor.toggle();
      } else {
        this.togglePause();
      }
      return;
    }

    const isTimelineKey = event.code === 'KeyF' ||
      ((event.ctrlKey || event.metaKey) && event.code === 'KeyT');

    if (isTimelineKey) {
      if (this.timelineEditor && this.timelineEditor.visible) {
        event.preventDefault();
        this.timelineEditor.toggle();
        return;
      }
      const camPos = this.camera?.position ||
        (this.controls?.getObject ? this.controls.getObject().position : null);
      const isNearDesk = this.sceneManager?.isNearWorkstation?.(
        camPos
      );
      if (isNearDesk && this.timelineEditor) {
        event.preventDefault();
        if (this.sceneManager.workstationDesk) {
          this.sceneManager.workstationDesk.interact(
            this.timelineEditor,
            this.controls
          );
        } else {
          this.timelineEditor.toggle();
          if (this.controls && this.controls.isLocked) {
            this.controls.unlock();
          }
        }
        return;
      }
    }

    if (!this.controls.isLocked || this.paused) return;
    switch (event.code) {
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'Enter':
        if (this.showDirector) {
          if (this.showDirector.isPlaying) {
            this.showDirector.stop();
            console.log('Show stopped.');
          } else {
            const selectedSeq = this.sequenceOptions.find(o => o.key === this.selectedSequenceKey);
            if (selectedSeq && selectedSeq.script) {
              this.showDirector.loadScript(selectedSeq.script);
              this.showDirector.play();
              console.log(`Started Sequence: ${selectedSeq.label}`);
            } else {
              console.warn('No valid sequence selected.');
            }
          }
        }
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
    }
  }

  setMovementStatus(direction) {
    const moving = direction !== '' && direction !== 'idle';
    this.status.moving = moving;
    this.status.direction = moving ? direction : 'idle';
    this.updateStatusOverlay();
  }

  destroy() {
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
  }
}
