import { t } from '../../../config/lang/i18n.js';
import { customAlert } from '../utils/Modal.js';

import { renderFilePanel } from '../templates/EditorTemplates.js';
export { renderFilePanel };

export function setupFilePanel(state) {
  document.getElementById('btn-export').addEventListener('click', async () => {
    state.name = document.getElementById('ui-name').value;
    const data = state.exportFormat();
    const content = JSON.stringify(data, null, 2);

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.saveFileDialog(content, `${state.name}.json`);
        if (res) {
          state.currentFilePath = res.filePath;
          state.name = res.filename.replace('.json', '');
          document.getElementById('ui-name').value = state.name;
          await customAlert(t('editor.filePanel.alertExportSuccess', { filename: res.filename }));
        }
      } catch (err) {
        await customAlert(t('editor.filePanel.alertExportError', { error: err.message }));
      }
    } else {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  document.getElementById('btn-import').addEventListener('click', async () => {
    if (window.electronAPI) {
      try {
        const fileData = await window.electronAPI.openFileDialog();
        if (fileData) {
          const { filePath, content, filename } = fileData;
          const data = JSON.parse(content);
          state.loadFormat(data, filePath);
          document.getElementById('ui-name').value = state.name;

          const uiCount = document.getElementById('ui-count');
          if (uiCount) uiCount.value = state.droneCount;
          await customAlert(t('editor.filePanel.alertImportSuccess', { filename }));
        }
      } catch (err) {
        await customAlert(t('editor.filePanel.alertImportError', { error: err.message }));
      }
    } else {
      document.getElementById('file-import').click();
    }
  });

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        state.loadFormat(data);
        document.getElementById('ui-name').value = state.name;

        const uiCount = document.getElementById('ui-count');
        if (uiCount) uiCount.value = state.droneCount;
      } catch (err) {
        await customAlert(t('editor.filePanel.alertInvalidJson'));
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-import-append')?.addEventListener('click', async () => {
    if (window.electronAPI) {
      try {
        const fileData = await window.electronAPI.openFileDialog();
        if (fileData) {
          const { filePath, content, filename } = fileData;
          const data = JSON.parse(content);
          state.appendFormat(data);
          await customAlert(t('editor.filePanel.alertImportAppendSuccess', { filename }));
        }
      } catch (err) {
        await customAlert(t('editor.filePanel.alertImportError', { error: err.message }));
      }
    } else {
      document.getElementById('file-import-append').click();
    }
  });

  document.getElementById('file-import-append')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        state.appendFormat(data);
        await customAlert(t('editor.filePanel.alertImportAppendSuccess', { filename: file.name }));
      } catch (err) {
        await customAlert(t('editor.filePanel.alertInvalidJson'));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
}
