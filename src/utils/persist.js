const STORAGE_KEY = 'roof_planner_state_v1';

export function saveState(state) {
  try {
    const serializable = structuredClone(state);
    serializable.undoStack = [];
    serializable.redoStack = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('Не вдалося зберегти', error);
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Не вдалося завантажити', error);
    return null;
  }
}
