import { getState, updateState } from '../state/store.js';
import { nextId } from '../utils/id.js';
import { snapToGrid } from '../geometry/polygon.js';
import { showToast } from './toast.js';

const tools = [
  { id: 'select', icon: '🖱️', label: 'Вибір' },
  { id: 'add-node', icon: '➕', label: 'Додати вузол' },
  { id: 'split-edge', icon: '✂️', label: 'Розбити ребро' },
  { id: 'add-opening', icon: '⬜', label: 'Отвір' },
  { id: 'delete', icon: '🗑️', label: 'Видалити' },
];

let activeTool = 'select';

export function renderToolbar(container) {
  container.innerHTML = `
    <h3>Інструменти</h3>
    ${tools
      .map(
        (tool) => `
        <button class="tool ${tool.id === activeTool ? 'active' : ''}" data-tool="${tool.id}">
          <span class="icon">${tool.icon}</span>
          <span>${tool.label}</span>
        </button>
      `
      )
      .join('')}
    <div class="panel-section">
      <h4>Дії</h4>
      <button class="btn" id="center-model">Центрувати</button>
      <button class="btn" id="duplicate-plane">Дублювати площину</button>
    </div>
  `;

  container.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      renderToolbar(container);
      showToast(`Інструмент: ${btn.textContent.trim()}`);
    });
  });

  container.querySelector('#center-model').addEventListener('click', () => {
    updateState((state) => {
      const nodes = state.geometry.nodes;
      if (!nodes.length) return;
      const minX = Math.min(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxX = Math.max(...nodes.map((n) => n.x));
      const maxY = Math.max(...nodes.map((n) => n.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const offsetX = 1000 - centerX;
      const offsetY = 1000 - centerY;
      state.geometry.nodes = nodes.map((n) => ({ ...n, x: snapToGrid(n.x + offsetX, 1), y: snapToGrid(n.y + offsetY, 1) }));
    });
  });

  container.querySelector('#duplicate-plane').addEventListener('click', () => {
    const state = getState();
    const plane = state.geometry.planes[0];
    if (!plane) {
      showToast('Немає площин для дублювання', { type: 'warning' });
      return;
    }
    updateState((state) => {
      const newNodes = plane.boundary.map((id) => {
        const node = state.geometry.nodes.find((n) => n.id === id);
        const idNew = nextId('N');
        return { id: idNew, x: node.x + 500, y: node.y + 500 };
      });
      state.geometry.nodes.push(...newNodes);
      state.geometry.planes.push({
        ...plane,
        id: nextId('P'),
        boundary: newNodes.map((n) => n.id),
        openings: [],
      });
    });
    showToast('Площину дубльовано');
  });
}

export function getActiveTool() {
  return activeTool;
}

export function setActiveTool(tool) {
  activeTool = tool;
}
