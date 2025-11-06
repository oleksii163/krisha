import { validateModel } from '../geometry/validation.js';
import { getState } from '../state/store.js';

export function refreshValidation() {
  const statusEl = document.getElementById('validation-status');
  if (!statusEl) return;
  const state = getState();
  const validation = validateModel(state);
  state.validation = validation;
  statusEl.innerHTML = '';
  if (validation.ok) {
    statusEl.className = 'status success';
    statusEl.textContent = 'Модель валідна. Можна експортувати.';
  } else {
    statusEl.className = 'status error';
    statusEl.innerHTML = `
      <div><strong>Помилки:</strong></div>
      <div class="validation-list">
        ${validation.issues
          .map((issue) => `<div class="${issue.type === 'error' ? 'fail' : 'ok'}">${issue.message}</div>`)
          .join('')}
      </div>
    `;
  }
  const exportBtn = document.getElementById('export-button');
  if (exportBtn) {
    exportBtn.disabled = !validation.ok;
  }
}
