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
  document.getElementById('btn-export').addEventListener('click', () => {
    state.name = document.getElementById('ui-name').value;
    const data = state.exportFormat();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
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
        
        // This ui-count exists in ShapePanel, but updating it here is fine since it's global UI state
        const uiCount = document.getElementById('ui-count');
        if (uiCount) uiCount.value = state.droneCount;
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  });
}
