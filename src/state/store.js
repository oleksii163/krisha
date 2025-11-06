const listeners = new Set();

const initialState = {
  project: {
    name: 'Новий проєкт',
    date_iso: new Date().toISOString().slice(0, 10),
  },
  units: 'mm',
  roof_type: null,
  global: {
    pitch: { value: 18, unit: 'deg' },
    eaves: { front: 300, back: 300, left: 200, right: 200 },
    rounding_mm: 1,
  },
  geometry: {
    nodes: [],
    planes: [],
    openings: [],
  },
  materials: {
    cover: { code: 'metal_tile_X', thickness_mm: 0.5, color: 'RAL7016' },
  },
  notes: '',
  view: {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  },
  undoStack: [],
  redoStack: [],
  validation: {
    issues: [],
    ok: true,
  },
};

let state = structuredClone(initialState);

export function getState() {
  return state;
}

export function setState(partial, { recordHistory = true } = {}) {
  const prev = structuredClone(state);
  state = { ...state, ...partial };
  emit();
  if (recordHistory) {
    pushHistory(prev);
  }
}

export function updateState(mutate, { recordHistory = true } = {}) {
  const prev = structuredClone(state);
  mutate(state);
  emit();
  if (recordHistory) {
    pushHistory(prev);
  }
}

function pushHistory(prev) {
  state.undoStack.push(prev);
  state.redoStack = [];
  if (state.undoStack.length > 50) {
    state.undoStack.shift();
  }
}

export function undo() {
  if (!state.undoStack.length) return;
  const prev = state.undoStack.pop();
  state.redoStack.push(structuredClone(state));
  state = prev;
  emit();
}

export function redo() {
  if (!state.redoStack.length) return;
  const next = state.redoStack.pop();
  state.undoStack.push(structuredClone(state));
  state = next;
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn(state));
}

export function resetState() {
  state = structuredClone(initialState);
  state.undoStack = [];
  state.redoStack = [];
  emit();
}

export function replaceState(nextState, { keepHistory = false } = {}) {
  state = structuredClone(nextState);
  if (!keepHistory) {
    state.undoStack = [];
    state.redoStack = [];
  }
  emit();
}
