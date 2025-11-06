import { subscribe, getState, undo, redo, replaceState } from './state/store.js';
import { renderStep1 } from './ui/step1.js';
import { renderStep2 } from './ui/step2.js';
import { renderToolbar, setActiveTool } from './ui/toolbar.js';
import { renderSidePanel } from './ui/sidePanel.js';
import { initEditor, draw, setZoom, resetView, fitToScreen } from './ui/editor.js';
import { updateStepper } from './ui/stepper.js';
import { refreshValidation } from './ui/validationPanel.js';
import { exportJson } from './export/json.js';
import { exportPdf } from './export/pdf.js';
import { exportXlsx } from './export/xlsx.js';
import { saveState, loadState } from './utils/persist.js';
import { showToast } from './ui/toast.js';

let step = 1;
let unsubscribe;

function init() {
  const loaded = loadState();
  if (loaded) {
    replaceState({ ...loaded, undoStack: [], redoStack: [] }, { keepHistory: false });
    showToast('Стан відновлено з попередньої сесії');
  }

  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const toolbar = document.getElementById('toolbar');
  const sidePanel = document.getElementById('side-panel');
  const canvasEl = document.getElementById('editor-canvas');
  const cursorInfo = document.getElementById('cursor-info');
  const hint = document.getElementById('action-hint');
  const status = document.getElementById('canvas-status');
  const exportBtn = document.getElementById('export-button');
  const nextBtn = document.getElementById('next-button');
  const backBtn = document.getElementById('back-button');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const resetViewBtn = document.getElementById('reset-view');

  renderStep1(step1);
  renderStep2(step2);
  renderToolbar(toolbar);
  renderSidePanel(sidePanel);
  initEditor({ canvasEl, cursorInfoEl: cursorInfo, hintEl: hint, statusEl: status });
  refreshValidation();
  updateStepper(step);
  updateSteps();

  exportBtn.addEventListener('click', openExportModal);
  nextBtn.addEventListener('click', () => {
    if (step < 3) {
      step += 1;
      updateStepper(step);
      updateSteps();
    } else {
      openExportModal();
    }
  });
  backBtn.addEventListener('click', () => {
    if (step > 1) {
      step -= 1;
      updateStepper(step);
      updateSteps();
    }
  });

  undoBtn.addEventListener('click', () => {
    undo();
    draw();
    refreshValidation();
  });
  redoBtn.addEventListener('click', () => {
    redo();
    draw();
    refreshValidation();
  });

  zoomIn.addEventListener('click', () => setZoom(getState().view.zoom * 1.2));
  zoomOut.addEventListener('click', () => setZoom(getState().view.zoom / 1.2));
  resetViewBtn.addEventListener('click', () => {
    resetView();
    showToast('Масштаб скинуто');
  });

  window.addEventListener('fit-to-screen', () => {
    fitToScreen();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') {
      setActiveTool('delete');
      renderToolbar(toolbar);
    }
    if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      undo();
      draw();
    }
    if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      redo();
      draw();
    }
  });

  unsubscribe = subscribe((state) => {
    window.__roofState = state;
    renderStep1(step1);
    const active = document.activeElement;
    const editing =
      step === 2 &&
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') &&
      step2.contains(active);
    if (!editing) {
      renderStep2(step2);
    }
    renderSidePanel(sidePanel);
    draw();
    refreshValidation();
    undoBtn.disabled = !state.undoStack.length;
    redoBtn.disabled = !state.redoStack.length;
    saveState(state);
  });

  setInterval(() => {
    saveState(getState());
  }, 30000);
}

function updateSteps() {
  document.getElementById('step-1').classList.toggle('hidden', step !== 1);
  document.getElementById('step-2').classList.toggle('hidden', step !== 2);
  document.getElementById('step-3').classList.toggle('hidden', step !== 3);
  const exportBtn = document.getElementById('export-button');
  exportBtn.classList.toggle('hidden', step !== 3);
  document.getElementById('next-button').textContent = step === 3 ? 'Експорт' : 'Далі';
  if (step === 2) {
    renderStep2(document.getElementById('step-2'));
  }
}

function openExportModal() {
  const menu = document.createElement('div');
  menu.className = 'panel-section export-modal';
  menu.innerHTML = `
    <h3>Експорт</h3>
    <p>Оберіть формат для експорту. PDF міститиме план та специфікацію, Excel — таблиці параметрів.</p>
    <div class="legend">
      <button class="btn" data-action="pdf">PDF (A4)</button>
      <button class="btn" data-action="xlsx">Excel (.xlsx)</button>
      <button class="btn" data-action="json">JSON</button>
    </div>
  `;
  menu.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'pdf') exportPdf();
      if (action === 'xlsx') exportXlsx();
      if (action === 'json') exportJson();
      document.body.removeChild(menu);
    });
  });
  Object.assign(menu.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    width: '360px',
  });
  document.body.appendChild(menu);
  setTimeout(() => {
    const handleClick = (event) => {
      if (!menu.contains(event.target)) {
        document.body.removeChild(menu);
        document.removeEventListener('mousedown', handleClick);
      }
    };
    document.addEventListener('mousedown', handleClick);
  }, 0);
}

init();
