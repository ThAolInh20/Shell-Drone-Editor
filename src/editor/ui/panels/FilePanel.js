export function renderFilePanel() {
  return `
    <div class="panel-section">
      <h3>File</h3>
      <div class="input-group">
        <label>Format Name</label>
        <input type="text" id="ui-name" value="NewFormat" style="width: 120px;" />
      </div>
      <button class="btn" id="btn-export">Export JSON</button>
      <input type="file" id="file-import" accept=".json" style="display: none;" />
      <button class="btn btn-secondary" id="btn-import">Import JSON</button>
    </div>
  `;
}

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
          alert(`Đã lưu file thành công: ${res.filename}`);
        }
      } catch (err) {
        alert("Lỗi khi lưu file qua Electron: " + err.message);
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
          alert(`Import thành công từ file: ${filename}`);
        }
      } catch (err) {
        alert("Lỗi khi đọc file qua Electron: " + err.message);
      }
    } else {
      document.getElementById('file-import').click();
    }
  });

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        state.loadFormat(data);
        document.getElementById('ui-name').value = state.name;
        
        const uiCount = document.getElementById('ui-count');
        if (uiCount) uiCount.value = state.droneCount;
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  });
}
