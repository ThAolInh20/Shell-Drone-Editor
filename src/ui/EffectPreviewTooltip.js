import {
  getEffectPreview,
  PREVIEW_CATEGORIES
} from '../config/effectPreviews.js';

export class EffectPreviewTooltip {
  constructor() {
    if (EffectPreviewTooltip.instance) {
      return EffectPreviewTooltip.instance;
    }
    EffectPreviewTooltip.instance = this;

    this.currentKey = null;
    this.currentCategory = null;
    this.showTimer = null;
    this.isVisible = false;
    this.hasVideoError = false;

    this._createDOM();
    this._bindGlobalEvents();
  }

  static getInstance() {
    if (!EffectPreviewTooltip.instance) {
      EffectPreviewTooltip.instance = new EffectPreviewTooltip();
    }
    return EffectPreviewTooltip.instance;
  }

  _createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'effect-preview-tooltip';
    this.container.style.cssText = `
      position: fixed;
      z-index: 99999;
      width: 240px;
      background: #0f141f;
      border: 1px solid #28334a;
      border-radius: 8px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.75);
      padding: 10px;
      color: #e5e7eb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: none;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.18s ease, transform 0.18s ease;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-sizing: border-box;
      visibility: hidden;
    `;

    // Header (Category Badge + Title)
    this.header = document.createElement('div');
    this.header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    `;

    this.titleEl = document.createElement('div');
    this.titleEl.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    this.categoryBadge = document.createElement('span');
    this.categoryBadge.style.cssText = `
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #1f293d;
      color: #60a5fa;
      font-weight: 600;
    `;

    this.header.appendChild(this.titleEl);
    this.header.appendChild(this.categoryBadge);

    // Media Container
    this.mediaContainer = document.createElement('div');
    this.mediaContainer.style.cssText = `
      width: 100%;
      height: 140px;
      background: #080b11;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #1a2233;
    `;

    // HTML5 Video Element
    this.videoEl = document.createElement('video');
    this.videoEl.autoplay = true;
    this.videoEl.loop = true;
    this.videoEl.muted = true;
    this.videoEl.playsInline = true;
    if (typeof this.videoEl.setAttribute === 'function') {
      this.videoEl.setAttribute('autoplay', '');
      this.videoEl.setAttribute('loop', '');
      this.videoEl.setAttribute('muted', '');
      this.videoEl.setAttribute('playsinline', '');
    }
    this.videoEl.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    `;

    // Video Error and Missing Video Fallback
    this.fallbackEl = document.createElement('div');
    this.fallbackEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #131926 0%, #0d121c 100%);
      padding: 12px;
      text-align: center;
      box-sizing: border-box;
      gap: 6px;
    `;

    this.fallbackIcon = document.createElement('div');
    this.fallbackIcon.style.cssText = `
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    `;
    this.fallbackIcon.textContent = 'Preview Pending';

    this.fallbackText = document.createElement('div');
    this.fallbackText.style.cssText = `
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    `;
    this.fallbackText.textContent = 'Video sample recording in progress';

    this.fallbackEl.appendChild(this.fallbackIcon);
    this.fallbackEl.appendChild(this.fallbackText);

    this.videoEl.preload = 'auto';
    this.videoEl.addEventListener('error', () => {
      // Ignore spurious error events if tooltip is not visible or src was cleared
      const activeSrc = typeof this.videoEl.getAttribute === 'function'
        ? this.videoEl.getAttribute('src')
        : this.videoEl.src;
      if (!this.isVisible || !activeSrc) {
        return;
      }
      const err = this.videoEl.error;
      console.warn('[EffectPreviewTooltip] Video load error:', this.videoEl.src, 'Error code:', err?.code, 'Message:', err?.message);
      this._showFallback();
    });

    this.videoEl.addEventListener('loadeddata', () => {
      if (this.isVisible) {
        this._showVideo();
      }
    });

    this.videoEl.addEventListener('canplay', () => {
      if (this.isVisible) {
        this._showVideo();
      }
    });

    this.mediaContainer.appendChild(this.videoEl);
    this.mediaContainer.appendChild(this.fallbackEl);

    // Tags list
    this.tagsContainer = document.createElement('div');
    this.tagsContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    `;

    // Summary Text
    this.summaryEl = document.createElement('div');
    this.summaryEl.style.cssText = `
      font-size: 11px;
      line-height: 1.4;
      color: #94a3b8;
    `;

    this.container.appendChild(this.header);
    this.container.appendChild(this.mediaContainer);
    this.container.appendChild(this.tagsContainer);
    this.container.appendChild(this.summaryEl);

    document.body.appendChild(this.container);
  }

  _showVideo() {
    this.hasVideoError = false;
    this.videoEl.style.display = 'block';
    this.fallbackEl.style.display = 'none';
  }

  _showFallback() {
    this.hasVideoError = true;
    this.videoEl.style.display = 'none';
    this.fallbackEl.style.display = 'flex';
  }

  _bindGlobalEvents() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('scroll', () => this.hide(), true);
    }
  }

  _loadVideo(url) {
    if (!url) {
      this._showFallback();
      return;
    }

    const resolvedUrl = url.startsWith('http') ||
      url.startsWith('/') ||
      url.startsWith('./')
      ? url
      : `./${url}`;

    this._showVideo();

    // If already set to this source, just resume playback
    const currentSrc = typeof this.videoEl.getAttribute === 'function'
      ? this.videoEl.getAttribute('src')
      : this.videoEl.src;
    if (currentSrc === resolvedUrl || (currentSrc && currentSrc.endsWith(resolvedUrl.replace('./', '')))) {
      try {
        const playPromise = this.videoEl.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('[EffectPreviewTooltip] Play error:', err);
            }
          });
        }
      } catch {
        // Safe ignore
      }
      return;
    }

    console.log('[EffectPreviewTooltip] Loading video:', resolvedUrl);
    if (typeof this.videoEl.setAttribute === 'function') {
      this.videoEl.setAttribute('src', resolvedUrl);
    }
    this.videoEl.src = resolvedUrl;
    if (typeof this.videoEl.load === 'function') {
      this.videoEl.load();
    }
    const playPromise = this.videoEl.play();
    if (playPromise !== undefined && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[EffectPreviewTooltip] Play error:', err);
        }
      });
    }
  }

  show(key, category = PREVIEW_CATEGORIES.DYNAMICS, x = 0, y = 0, referenceElement = null) {
    if (!key) {
      this.hide();
      return;
    }

    const metadata = getEffectPreview(key, category);
    if (!metadata) {
      this.hide();
      return;
    }

    this.currentKey = key;
    this.currentCategory = category;

    // Populate contents
    this.titleEl.textContent = metadata.name;
    this.categoryBadge.textContent = metadata.category || category;
    this.summaryEl.textContent = metadata.summary || '';

    // Render tags
    this.tagsContainer.innerHTML = '';
    if (metadata.tags && metadata.tags.length > 0) {
      for (const tag of metadata.tags) {
        const tagEl = document.createElement('span');
        tagEl.textContent = tag;
        tagEl.style.cssText = `
          font-size: 10px;
          background: #192233;
          color: #93c5fd;
          padding: 2px 5px;
          border-radius: 3px;
          font-weight: 500;
        `;
        this.tagsContainer.appendChild(tagEl);
      }
    }

    // Load video directly
    if (metadata.videoUrl) {
      this._loadVideo(metadata.videoUrl);
    } else {
      this._showFallback();
    }

    this.updatePosition(x, y, referenceElement);

    this.container.style.visibility = 'visible';
    this.container.style.opacity = '1';
    this.container.style.transform = 'translateY(0)';
    this.isVisible = true;
  }

  updatePosition(mouseX, mouseY, referenceElement = null) {
    const tooltipWidth = 240;
    const tooltipHeight = 250;
    const padding = 16;

    let targetX, targetY;

    if (referenceElement && typeof referenceElement.getBoundingClientRect === 'function') {
      const rect = referenceElement.getBoundingClientRect();
      if (rect.left - tooltipWidth - padding > 0) {
        targetX = rect.left - tooltipWidth - 12;
      } else {
        targetX = rect.right + 12;
      }
      targetY = rect.top - 8;
    } else {
      targetX = mouseX + padding;
      targetY = mouseY + padding;

      if (targetX + tooltipWidth > window.innerWidth - padding) {
        targetX = mouseX - tooltipWidth - padding;
      }
    }

    if (targetY + tooltipHeight > window.innerHeight - padding) {
      targetY = window.innerHeight - tooltipHeight - padding;
    }

    targetX = Math.max(padding, targetX);
    targetY = Math.max(padding, targetY);

    this.container.style.left = `${targetX}px`;
    this.container.style.top = `${targetY}px`;
  }

  hide() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    if (!this.isVisible) return;

    this.isVisible = false;
    this.currentKey = null;
    this.currentCategory = null;

    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(6px)';

    if (this.videoEl) {
      if (typeof this.videoEl.pause === 'function') {
        this.videoEl.pause();
      }
      if (typeof this.videoEl.removeAttribute === 'function') {
        this.videoEl.removeAttribute('src');
      }
      this.videoEl.src = '';
      if (typeof this.videoEl.load === 'function') {
        this.videoEl.load();
      }
    }

    setTimeout(() => {
      if (!this.isVisible) {
        this.container.style.visibility = 'hidden';
      }
    }, 180);
  }

  bindElement(element, effectKey, category = PREVIEW_CATEGORIES.DYNAMICS, delayMs = 60) {
    if (!element) return;

    let currentX = 0;
    let currentY = 0;

    element.addEventListener('mouseenter', (e) => {
      currentX = e.clientX;
      currentY = e.clientY;
      if (this.showTimer) clearTimeout(this.showTimer);
      this.showTimer = setTimeout(() => {
        const key = typeof effectKey === 'function' ? effectKey() : effectKey;
        this.show(key, category, currentX, currentY, element);
      }, delayMs);
    });

    element.addEventListener('mousemove', (e) => {
      currentX = e.clientX;
      currentY = e.clientY;
      if (this.isVisible) {
        this.updatePosition(currentX, currentY, element);
      }
    });

    element.addEventListener('mouseleave', () => {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this.hide();
    });
  }

  bindSelect(selectElement, category = PREVIEW_CATEGORIES.DYNAMICS, delayMs = 60) {
    if (!selectElement) return;

    let currentX = 0;
    let currentY = 0;

    const triggerPreview = (e) => {
      currentX = e?.clientX || currentX;
      currentY = e?.clientY || currentY;
      const selectedValue = selectElement.value;
      if (!selectedValue) return;
      if (this.showTimer) clearTimeout(this.showTimer);
      this.showTimer = setTimeout(() => {
        this.show(selectElement.value, category, currentX, currentY, selectElement);
      }, delayMs);
    };

    selectElement.addEventListener('mouseenter', triggerPreview);
    selectElement.addEventListener('focus', triggerPreview);
    selectElement.addEventListener('click', triggerPreview);

    selectElement.addEventListener('mousemove', (e) => {
      currentX = e.clientX;
      currentY = e.clientY;
      if (this.isVisible) {
        this.updatePosition(currentX, currentY, selectElement);
      }
    });

    selectElement.addEventListener('change', () => {
      const selectedValue = selectElement.value;
      if (selectedValue) {
        this.show(selectedValue, category, currentX, currentY, selectElement);
      }
    });

    selectElement.addEventListener('mouseleave', () => {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this.hide();
    });

    selectElement.addEventListener('blur', () => {
      this.hide();
    });
  }

  destroy() {
    this.hide();
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    EffectPreviewTooltip.instance = null;
  }
}
