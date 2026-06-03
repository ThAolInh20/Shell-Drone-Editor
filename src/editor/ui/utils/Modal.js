import { t } from '../../../config/lang/i18n.js';

export function customAlert(message) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';

    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('pointerup', (e) => e.stopPropagation());
    overlay.addEventListener('mouseup', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    // Create modal container
    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #333';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '320px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '15px';

    // Message
    const msgEl = document.createElement('div');
    msgEl.textContent = message;
    msgEl.style.color = '#fff';
    msgEl.style.fontSize = '13px';
    msgEl.style.lineHeight = '1.5';
    modal.appendChild(msgEl);

    // Buttons Container
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';

    const okBtn = document.createElement('button');
    okBtn.textContent = t('editor.okBtn') || 'OK';
    okBtn.style.background = '#3a86ff';
    okBtn.style.border = 'none';
    okBtn.style.color = '#fff';
    okBtn.style.padding = '6px 16px';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = 'bold';

    const dismiss = () => {
      window.removeEventListener('keydown', handleKey);
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve();
      }, 200);
    };

    okBtn.addEventListener('click', dismiss);
    btns.appendChild(okBtn);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '1';
      okBtn.focus();
    }, 50);

    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKey, true);
  });
}

export function customPrompt(title, defaultValue = "") {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';

    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('pointerup', (e) => e.stopPropagation());
    overlay.addEventListener('mouseup', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    // Create modal container
    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #333';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '320px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '15px';

    // Title
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '14px';
    modal.appendChild(titleEl);

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    input.style.width = '100%';
    input.style.background = '#222';
    input.style.border = '1px solid #555';
    input.style.color = '#fff';
    input.style.padding = '8px';
    input.style.borderRadius = '4px';
    input.style.boxSizing = 'border-box';
    input.style.outline = 'none';
    input.style.userSelect = 'text';
    input.style.webkitUserSelect = 'text';
    input.autocomplete = 'off';

    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        submit();
      } else if (e.key === 'Escape') {
        cleanup(null);
      }
    });
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('keypress', (e) => e.stopPropagation());

    modal.appendChild(input);

    // Buttons Container
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('editor.cancelBtn') || 'Cancel';
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    
    cancelBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    cancelBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cleanup(null);
    });

    const okBtn = document.createElement('button');
    okBtn.textContent = t('editor.okBtn') || 'OK';
    okBtn.style.background = '#3a86ff';
    okBtn.style.border = 'none';
    okBtn.style.color = '#fff';
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = 'bold';
    
    const submit = () => {
      const val = input.value.trim();
      cleanup(val);
    };

    okBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    okBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    okBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      submit();
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(okBtn);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    input.focus();
    input.select();

    setTimeout(() => {
      overlay.style.opacity = '1';
      input.focus();
      input.select();
    }, 50);

    function cleanup(value) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(value);
      }, 200);
    }
  });
}

export function customChoicePrompt(title, options) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';

    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());

    const modal = document.createElement('div');
    modal.style.background = '#1e1e1e';
    modal.style.border = '1px solid #333';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.width = '350px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '10px';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.color = '#fff';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '14px';
    titleEl.style.marginBottom = '5px';
    modal.appendChild(titleEl);

    // Render options as buttons
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.style.width = '100%';
      btn.style.background = '#2a2a2a';
      btn.style.border = '1px solid #444';
      btn.style.color = '#fff';
      btn.style.padding = '10px';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.textAlign = 'left';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '500';
      btn.style.transition = 'background 0.2s, border-color 0.2s';
      
      btn.addEventListener('mouseover', () => {
        btn.style.background = '#333';
        btn.style.borderColor = '#3a86ff';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.background = '#2a2a2a';
        btn.style.borderColor = '#444';
      });
      btn.addEventListener('click', () => {
        cleanup(opt.value);
      });
      modal.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('editor.cancelBtn') || 'Cancel';
    cancelBtn.style.background = '#333';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.padding = '6px 12px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '12px';
    cancelBtn.style.alignSelf = 'flex-end';
    cancelBtn.style.marginTop = '5px';
    
    cancelBtn.addEventListener('click', () => {
      cleanup(null);
    });
    modal.appendChild(cancelBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 50);

    function cleanup(value) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        resolve(value);
      }, 200);
    }
  });
}
