import { t } from '../config/lang/i18n.js';
import { globalEventBus } from '../core/EventBus.js';

export class TimelineTourGuide {
  constructor(timelineEditor) {
    this.timelineEditor = timelineEditor;
    this.currentStepIndex = 0;
    this.isActive = false;
    this.overlayElement = null;
    this.highlightBox = null;
    this.tooltipCard = null;
    this.promptBanner = null;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundResizeHandler = this.updatePosition.bind(this);

    // Allow QA or developers to reset tour state via browser console
    if (typeof window !== 'undefined') {
      window.resetTimelineTour = () => {
        localStorage.removeItem('timeline_tour_status');
        console.log('[TimelineTourGuide] Tour status reset. Reopen timeline to trigger.');
      };
    }

    // Listen for global tour request events
    globalEventBus.on(
      'timeline:request-tour',
      () => {
        this.startTour();
      }
    );
  }

  getSteps() {
    return [
      {
        id: 'toolbar',
        title: t('editor.timelineTour.step1Title') || 'Thanh điều khiển Toolbar',
        desc: t('editor.timelineTour.step1Desc') ||
          'Chứa các nút phát hoặc tạm dừng kịch bản, bật tắt tự động bám theo Playhead và thêm sự kiện mới vào dòng thời gian.',
        shortcut: t('editor.timelineTour.step1Shortcut') || 'Phím tắt: Space để Phát hoặc Tạm dừng',
        getTarget: () => this.timelineEditor.toolbar
      },
      {
        id: 'ruler',
        title: t('editor.timelineTour.step2Title') || 'Thước Ruler và Kim mốc',
        desc: t('editor.timelineTour.step2Desc') ||
          'Nhấp chuột vào Ruler để đặt kim neo Anchor Head làm mốc chèn khối. Vạch Playhead biểu thị vị trí thời gian đang phát.',
        shortcut: t('editor.timelineTour.step2Shortcut') || 'Phím tắt: Nhấp chuột trên Ruler để dời Anchor Head',
        getTarget: () => this.timelineEditor.ruler
      },
      {
        id: 'dataActions',
        title: t('editor.timelineTour.step3Title') || 'Thêm và Nhập dữ liệu',
        desc: t('editor.timelineTour.step3Desc') ||
          'Cụm 3 nút giúp bạn chèn sự kiện pháo hoa mới tại Anchor Head, mở kịch bản từ tệp JSON dự án hoặc nạp tệp nhạc nền MP3 và dữ liệu drone.',
        shortcut: t('editor.timelineTour.step3Shortcut') ||
          'Gợi ý: Dùng nút Thêm Drone Audio để nạp nhạc nền hoặc dữ liệu bay',
        getTarget: () => this.timelineEditor.dataActionsGroup || this.timelineEditor.toolbar
      },
      {
        id: 'tracks',
        title: t('editor.timelineTour.step4Title') || 'Khu vực đường track',
        desc: t('editor.timelineTour.step4Desc') ||
          'Nơi sắp xếp Audio Sequence, Drone Show Sequence và Effect Sequence. Kéo chuột để dời mốc thời gian hoặc kéo mép để đổi thời lượng.',
        shortcut: t('editor.timelineTour.step4Shortcut') || 'Phím tắt: Giữ chuột và kéo để di chuyển khối sự kiện',
        getTarget: () => this.timelineEditor.trackContainer || this.timelineEditor.tracksArea
      },
      {
        id: 'beat',
        title: t('editor.timelineTour.step5Title') || 'Nhịp phách âm thanh',
        desc: t('editor.timelineTour.step5Desc') ||
          'Đánh dấu nhịp điệu bài hát trực tiếp bằng Tap Beat khi nghe nhạc. Snap-to-beat sẽ tự động hút khối sự kiện vào điểm nhịp gần nhất.',
        shortcut: t('editor.timelineTour.step5Shortcut') || 'Phím tắt: Nhấn phím B để đánh dấu Beat',
        getTarget: () => {
          const tracksArea = this.timelineEditor.tracksArea;
          if (!tracksArea) {
            return this.timelineEditor.trackContainer;
          }
          const audioBlock =
            (typeof tracksArea.querySelector === 'function' &&
              (tracksArea.querySelector('.timeline-block-audio') ||
                tracksArea.querySelector('[data-event-type="audio"]'))) ||
            tracksArea.firstElementChild;
          if (audioBlock) {
            const blockLeft = parseFloat(audioBlock.style.left) || 0;
            if (this.timelineEditor.trackContainer) {
              this.timelineEditor.trackContainer.scrollLeft = Math.max(0, blockLeft - 80);
            }
            return audioBlock;
          }
          return tracksArea;
        }
      },
      {
        id: 'block',
        title: t('editor.timelineTour.step6Title') || 'Khối sự kiện và Tinh chỉnh',
        desc: t('editor.timelineTour.step6Desc') ||
          'Nhấp chuột vào khối sự kiện trên track để chọn và mở bảng thuộc tính Inspector bên phải, nơi bạn có thể tinh chỉnh màu sắc, preset và cao độ.',
        shortcut: t('editor.timelineTour.step6Shortcut') || 'Thao tác: Nhấp chọn khối để xem thuộc tính chi tiết',
        getTarget: () => {
          const tracksArea = this.timelineEditor.tracksArea;
          if (!tracksArea) {
            return this.timelineEditor.inspectorContainer;
          }
          const eventBlock =
            (typeof tracksArea.querySelector === 'function' &&
              (tracksArea.querySelector('.timeline-event-block:not(.timeline-block-audio)') ||
                tracksArea.querySelector('.timeline-event-block:not([data-event-type="audio"])') ||
                tracksArea.querySelector('.timeline-event-block'))) ||
            tracksArea.firstElementChild;
          if (eventBlock) {
            const blockLeft = parseFloat(eventBlock.style.left) || 0;
            if (this.timelineEditor.trackContainer) {
              this.timelineEditor.trackContainer.scrollLeft = Math.max(0, blockLeft - 80);
            }
            return eventBlock;
          }
          return tracksArea;
        }
      }
    ];
  }

  promptFirstTimeTour() {
    if (typeof localStorage === 'undefined') return;
    const status = localStorage.getItem('timeline_tour_status');
    if (status) return;

    if (this.promptBanner) {
      this.promptBanner.remove();
      this.promptBanner = null;
    }

    const banner = document.createElement('div');
    banner.className = 'timeline-tour-prompt-banner';
    banner.style.position = 'fixed';
    banner.style.bottom = '36%';
    banner.style.left = '20px';
    banner.style.maxWidth = '420px';
    banner.style.background = 'rgba(13, 20, 28, 0.95)';
    banner.style.backdropFilter = 'blur(8px)';
    banner.style.border = '1px solid rgba(0, 229, 255, 0.4)';
    banner.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
    banner.style.borderRadius = '6px';
    banner.style.padding = '14px 18px';
    banner.style.zIndex = '10005';
    banner.style.color = '#f0f4f8';
    banner.style.fontFamily = 'sans-serif';
    banner.style.fontSize = '13px';
    banner.style.lineHeight = '1.5';
    banner.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    const titleEl = document.createElement('div');
    titleEl.textContent = t('editor.timelineTour.welcomeTitle') || 'Khám phá Timeline Editor';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '14px';
    titleEl.style.color = '#00e5ff';
    titleEl.style.marginBottom = '6px';

    const descEl = document.createElement('div');
    descEl.textContent = t('editor.timelineTour.welcomeDesc') ||
      'Dòng thời gian giúp bạn biên đạo hiệu ứng pháo hoa, quỹ đạo drone và nhịp phách âm nhạc. Bạn có muốn xem nhanh các tính năng cơ bản trong 1 phút?';
    descEl.style.marginBottom = '12px';
    descEl.style.color = '#cbd5e1';

    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.justifyContent = 'flex-end';
    actionsRow.style.gap = '10px';

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = t('editor.timelineTour.dismissBtn') || 'Để sau';
    dismissBtn.style.background = 'transparent';
    dismissBtn.style.border = '1px solid #555';
    dismissBtn.style.color = '#aaa';
    dismissBtn.style.padding = '5px 12px';
    dismissBtn.style.borderRadius = '4px';
    dismissBtn.style.cursor = 'pointer';
    dismissBtn.style.fontSize = '12px';
    dismissBtn.addEventListener('click', () => {
      localStorage.setItem('timeline_tour_status', 'dismissed');
      banner.remove();
      this.promptBanner = null;
    });

    const startBtn = document.createElement('button');
    startBtn.textContent = t('editor.timelineTour.startTourBtn') || 'Xem hướng dẫn';
    startBtn.style.background = '#00bcd4';
    startBtn.style.border = 'none';
    startBtn.style.color = '#000';
    startBtn.style.fontWeight = 'bold';
    startBtn.style.padding = '5px 14px';
    startBtn.style.borderRadius = '4px';
    startBtn.style.cursor = 'pointer';
    startBtn.style.fontSize = '12px';
    startBtn.addEventListener('click', () => {
      banner.remove();
      this.promptBanner = null;
      this.startTour();
    });

    actionsRow.appendChild(dismissBtn);
    actionsRow.appendChild(startBtn);

    banner.appendChild(titleEl);
    banner.appendChild(descEl);
    banner.appendChild(actionsRow);

    document.body.appendChild(banner);
    this.promptBanner = banner;
  }

  startTour() {
    if (this.promptBanner) {
      this.promptBanner.remove();
      this.promptBanner = null;
    }

    if (!this.timelineEditor.visible) {
      this.timelineEditor.toggle();
    }

    this.currentStepIndex = 0;
    this.isActive = true;
    this.initDOM();
    this.showStep(0);

    window.addEventListener('keydown', this.boundKeyHandler, true);
    window.addEventListener('resize', this.boundResizeHandler);
    globalEventBus.emit('timeline:tour-start');
  }

  initDOM() {
    this.destroyDOM();

    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'timeline-tour-overlay';
    this.overlayElement.style.position = 'fixed';
    this.overlayElement.style.top = '0';
    this.overlayElement.style.left = '0';
    this.overlayElement.style.width = '100vw';
    this.overlayElement.style.height = '100vh';
    this.overlayElement.style.background = 'rgba(0, 0, 0, 0.65)';
    this.overlayElement.style.zIndex = '10010';
    this.overlayElement.style.pointerEvents = 'auto';

    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'timeline-tour-highlight-box';
    this.highlightBox.style.position = 'fixed';
    this.highlightBox.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 15px #00e5ff';
    this.highlightBox.style.border = '2px solid #00e5ff';
    this.highlightBox.style.borderRadius = '4px';
    this.highlightBox.style.pointerEvents = 'none';
    this.highlightBox.style.transition = 'all 0.2s ease-out';
    this.highlightBox.style.zIndex = '10011';

    this.tooltipCard = document.createElement('div');
    this.tooltipCard.className = 'timeline-tour-tooltip-card';
    this.tooltipCard.style.position = 'fixed';
    this.tooltipCard.style.width = '350px';
    this.tooltipCard.style.background = 'rgba(13, 20, 28, 0.98)';
    this.tooltipCard.style.backdropFilter = 'blur(10px)';
    this.tooltipCard.style.border = '1px solid rgba(0, 229, 255, 0.4)';
    this.tooltipCard.style.borderRadius = '6px';
    this.tooltipCard.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.7)';
    this.tooltipCard.style.padding = '16px';
    this.tooltipCard.style.color = '#f0f4f8';
    this.tooltipCard.style.fontFamily = 'sans-serif';
    this.tooltipCard.style.zIndex = '10012';
    this.tooltipCard.style.boxSizing = 'border-box';
    this.tooltipCard.style.transition = 'top 0.2s ease-out, left 0.2s ease-out';

    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.highlightBox);
    document.body.appendChild(this.tooltipCard);
  }

  showStep(index) {
    const steps = this.getSteps();
    if (index < 0 || index >= steps.length) {
      this.finishTour('completed');
      return;
    }

    this.currentStepIndex = index;
    const step = steps[index];
    const total = steps.length;

    this.tooltipCard.innerHTML = '';

    // Step Header
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '8px';

    const stepBadge = document.createElement('span');
    const indicatorTemplate = t('editor.timelineTour.stepIndicator') || 'Bước {current} trên {total}';
    stepBadge.textContent = indicatorTemplate
      .replace('{current}', (index + 1).toString())
      .replace('{total}', total.toString());
    stepBadge.style.fontSize = '11px';
    stepBadge.style.color = '#00e5ff';
    stepBadge.style.fontWeight = 'bold';
    stepBadge.style.letterSpacing = '0.5px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#94a3b8';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0';
    closeBtn.addEventListener('click', () => {
      this.finishTour('dismissed');
    });

    headerRow.appendChild(stepBadge);
    headerRow.appendChild(closeBtn);
    this.tooltipCard.appendChild(headerRow);

    // Step Title
    const titleEl = document.createElement('div');
    titleEl.textContent = step.title;
    titleEl.style.fontSize = '15px';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.color = '#ffffff';
    titleEl.style.marginBottom = '8px';
    this.tooltipCard.appendChild(titleEl);

    // Step Description
    const descEl = document.createElement('div');
    descEl.textContent = step.desc;
    descEl.style.fontSize = '13px';
    descEl.style.lineHeight = '1.5';
    descEl.style.color = '#cbd5e1';
    descEl.style.marginBottom = '12px';
    this.tooltipCard.appendChild(descEl);

    // Step Shortcut Hint
    if (step.shortcut) {
      const shortcutBox = document.createElement('div');
      shortcutBox.textContent = step.shortcut;
      shortcutBox.style.fontSize = '11px';
      shortcutBox.style.background = 'rgba(0, 229, 255, 0.08)';
      shortcutBox.style.borderLeft = '3px solid #00e5ff';
      shortcutBox.style.padding = '6px 10px';
      shortcutBox.style.marginBottom = '14px';
      shortcutBox.style.color = '#94a3b8';
      shortcutBox.style.borderRadius = '0 4px 4px 0';
      this.tooltipCard.appendChild(shortcutBox);
    }

    // Step Footer Buttons
    const footerRow = document.createElement('div');
    footerRow.style.display = 'flex';
    footerRow.style.justifyContent = 'space-between';
    footerRow.style.alignItems = 'center';

    const skipBtn = document.createElement('button');
    skipBtn.textContent = t('editor.timelineTour.dismissBtn') || 'Bỏ qua';
    skipBtn.style.background = 'transparent';
    skipBtn.style.border = 'none';
    skipBtn.style.color = '#94a3b8';
    skipBtn.style.fontSize = '12px';
    skipBtn.style.cursor = 'pointer';
    skipBtn.addEventListener('click', () => {
      this.finishTour('dismissed');
    });

    const navButtons = document.createElement('div');
    navButtons.style.display = 'flex';
    navButtons.style.gap = '8px';

    if (index > 0) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = t('editor.timelineTour.prevBtn') || 'Quay lại';
      prevBtn.style.background = '#273544';
      prevBtn.style.border = '1px solid #486581';
      prevBtn.style.color = '#f0f4f8';
      prevBtn.style.fontSize = '12px';
      prevBtn.style.padding = '5px 12px';
      prevBtn.style.borderRadius = '4px';
      prevBtn.style.cursor = 'pointer';
      prevBtn.addEventListener('click', () => {
        this.showStep(index - 1);
      });
      navButtons.appendChild(prevBtn);
    }

    const nextBtn = document.createElement('button');
    const isLast = index === total - 1;
    nextBtn.textContent = isLast
      ? (t('editor.timelineTour.finishBtn') || 'Hoàn tất')
      : (t('editor.timelineTour.nextBtn') || 'Tiếp theo');
    nextBtn.style.background = '#00bcd4';
    nextBtn.style.border = 'none';
    nextBtn.style.color = '#000000';
    nextBtn.style.fontWeight = 'bold';
    nextBtn.style.fontSize = '12px';
    nextBtn.style.padding = '5px 14px';
    nextBtn.style.borderRadius = '4px';
    nextBtn.style.cursor = 'pointer';
    nextBtn.addEventListener('click', () => {
      if (isLast) {
        this.finishTour('completed');
      } else {
        this.showStep(index + 1);
      }
    });
    navButtons.appendChild(nextBtn);

    footerRow.appendChild(skipBtn);
    footerRow.appendChild(navButtons);
    this.tooltipCard.appendChild(footerRow);

    this.updatePosition();
  }

  updatePosition() {
    if (!this.isActive || !this.highlightBox || !this.tooltipCard) return;

    const steps = this.getSteps();
    const currentStep = steps[this.currentStepIndex];
    if (!currentStep) return;

    const targetEl = currentStep.getTarget();
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const margin = 4;

    this.highlightBox.style.top = Math.max(0, rect.top - margin) + 'px';
    this.highlightBox.style.left = Math.max(0, rect.left - margin) + 'px';
    this.highlightBox.style.width = (rect.width + margin * 2) + 'px';
    this.highlightBox.style.height = (rect.height + margin * 2) + 'px';

    const cardWidth = 350;
    const cardHeight = this.tooltipCard.offsetHeight || 220;

    // Determine vertical placement: place above target if space permits, else below
    let top = rect.top - cardHeight - 16;
    if (top < 10) {
      top = rect.bottom + 16;
    }

    // Determine horizontal placement: align with target left, clamp within screen
    let left = rect.left;
    if (left + cardWidth > window.innerWidth - 10) {
      left = window.innerWidth - cardWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    this.tooltipCard.style.top = top + 'px';
    this.tooltipCard.style.left = left + 'px';
  }

  handleKeyDown(e) {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      this.finishTour('dismissed');
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      const steps = this.getSteps();
      if (this.currentStepIndex < steps.length - 1) {
        this.showStep(this.currentStepIndex + 1);
      } else {
        this.finishTour('completed');
      }
    } else if (e.key === 'ArrowLeft') {
      e.stopPropagation();
      e.preventDefault();
      if (this.currentStepIndex > 0) {
        this.showStep(this.currentStepIndex - 1);
      }
    }
  }

  finishTour(status = 'completed') {
    this.isActive = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('timeline_tour_status', status);
    }
    window.removeEventListener('keydown', this.boundKeyHandler, true);
    window.removeEventListener('resize', this.boundResizeHandler);
    this.destroyDOM();
    globalEventBus.emit('timeline:tour-finish', { status });
  }

  destroyDOM() {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
    }
    if (this.tooltipCard) {
      this.tooltipCard.remove();
      this.tooltipCard = null;
    }
  }
}
