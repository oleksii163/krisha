import { getState } from '../state/store.js';

export function exportJson() {
  const state = getState();
  const serializable = structuredClone(state);
  serializable.undoStack = [];
  serializable.redoStack = [];
  const blob = new Blob([JSON.stringify(serializable, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${formatFileName(serializable.project.name)}_${serializable.project.date_iso}_roof.json`);
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'project';
}
