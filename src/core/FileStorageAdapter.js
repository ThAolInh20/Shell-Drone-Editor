export class FileStorageAdapter {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  }

  async listSequences() {
    if (this.isElectron) {
      return await window.electronAPI.listSequences();
    }
    
    try {
      const res = await fetch('./api/list-sequences');
      if (res.ok) {
        const data = await res.json();
        return data.files || [];
      }
    } catch (err) {
      console.warn(
        'Failed to fetch from list-sequences dev API:',
        err
      );
    }

    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('seq:')) {
        files.push(key.replace(
          'seq:',
          ''
        ) + '.json');
      }
    }
    return files;
  }

  async saveSequence(
    filename,
    content
  ) {
    if (this.isElectron) {
      return await window.electronAPI.saveSequence(
        filename,
        content
      );
    }

    try {
      const res = await fetch(
        './api/save-sequence',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename,
            content
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
    } catch (err) {
      console.warn(
        'Failed to save sequence to dev API:',
        err
      );
    }

    localStorage.setItem(
      `seq:${filename.replace(
        '.json',
        ''
      )}`,
      content
    );
    return true;
  }

  async openFileDialog() {
    if (this.isElectron) {
      return await window.electronAPI.openFileDialog();
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            content: event.target.result,
            filename: file.name,
            filePath: null
          });
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async saveFileDialog(
    content,
    defaultName
  ) {
    if (this.isElectron) {
      return await window.electronAPI.saveFileDialog(
        content,
        defaultName
      );
    }

    try {
      const blob = new Blob(
        [content],
        {
          type: 'application/json'
        }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        filePath: defaultName
      };
    } catch (err) {
      console.error(
        'Failed to trigger web file download:',
        err
      );
      return {
        success: false
      };
    }
  }

  async saveFileAbsolute(
    filePath,
    content
  ) {
    if (this.isElectron) {
      return await window.electronAPI.saveFileAbsolute(
        filePath,
        content
      );
    }

    if (filePath) {
      localStorage.setItem(
        `seq:${filePath}`,
        content
      );
      return true;
    }
    return false;
  }

  onChangeLanguage(callback) {
    if (this.isElectron && window.electronAPI.onChangeLanguage) {
      window.electronAPI.onChangeLanguage(callback);
    }
  }
}

export const fileStorage = new FileStorageAdapter();
