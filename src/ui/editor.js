import { getState, updateState } from '../state/store.js';
import { getActiveTool } from './toolbar.js';
import { snapToGrid } from '../geometry/polygon.js';
import { nextId } from '../utils/id.js';
import { polygonArea } from '../geometry/polygon.js';
import { showToast } from './toast.js';

let svg;
let cursorInfo;
let actionHint;
let canvasStatus;
let scale = 1;
let panX = 0;
let panY = 0;
let draggingNodeId = null;
let selectedNodeId = null;
let selectedEdge = null;
let dragSnapshot = null;
let dragMoved = false;

export function initEditor({ canvasEl, cursorInfoEl, hintEl, statusEl }) {
  svg = canvasEl;
  cursorInfo = cursorInfoEl;
  actionHint = hintEl;
  canvasStatus = statusEl;
  svg.innerHTML = '';
  const state = getState();
  scale = state.view?.zoom ?? 1;
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('mouseleave', onPointerUp);
  draw();
}

export function draw() {
  if (!svg) return;
  const state = getState();
  svg.innerHTML = '';
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${panX}) scale(${scale}) translate(${-panX})`);

  state.geometry.planes.forEach((plane) => {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const points = plane.boundary
      .map((id) => state.geometry.nodes.find((node) => node.id === id))
      .filter(Boolean)
      .map((node) => `${node.x},${node.y}`)
      .join(' ');
    polygon.setAttribute('class', 'plane');
    polygon.setAttribute('points', points);
    group.appendChild(polygon);
  });

  state.geometry.planes.forEach((plane) => {
    const nodes = plane.boundary.map((id) => state.geometry.nodes.find((n) => n.id === id));
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      if (!a || !b) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.x);
      line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x);
      line.setAttribute('y2', b.y);
      line.dataset.edge = `${plane.id}:${a.id}-${b.id}`;
      line.setAttribute('class', `edge eave`);
      line.addEventListener('pointerdown', (event) => onEdgePointerDown(event, plane, a, b));
      group.appendChild(line);
    }
  });

  state.geometry.openings.forEach((opening) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', opening.x);
    rect.setAttribute('y', opening.y);
    rect.setAttribute('width', opening.w);
    rect.setAttribute('height', opening.h);
    rect.setAttribute('class', 'opening');
    rect.dataset.id = opening.id;
    rect.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      selectedEdge = null;
      selectedNodeId = null;
      updateState((state) => {
        state.geometry.openings = state.geometry.openings.filter((o) => o.id !== opening.id);
        state.geometry.planes.forEach((plane) => {
          plane.openings = plane.openings?.filter((id) => id !== opening.id) || [];
        });
      });
      showToast(`Видалено отвір ${opening.id}`);
    });
    group.appendChild(rect);
  });

  state.geometry.nodes.forEach((node) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', 12);
    circle.setAttribute('class', `node ${selectedNodeId === node.id ? 'selected' : ''}`);
    circle.dataset.id = node.id;
    circle.addEventListener('pointerdown', (event) => onNodePointerDown(event, node));
    group.appendChild(circle);
  });

  svg.appendChild(group);
  updateStatus();
}

function updateStatus() {
  const state = getState();
  const area = state.geometry.planes.reduce((sum, plane) => {
    const points = plane.boundary.map((id) => state.geometry.nodes.find((n) => n.id === id)).filter(Boolean);
    return sum + Math.abs(polygonArea(points));
  }, 0);
  canvasStatus.textContent = `Площин: ${state.geometry.planes.length} · Нод: ${state.geometry.nodes.length} · Площа: ${(area / 1_000_000).toFixed(2)} м²`;
}

function onPointerMove(event) {
  const point = getCanvasCoordinates(event);
  cursorInfo.textContent = `X: ${Math.round(point.x)} мм, Y: ${Math.round(point.y)} мм`;
  if (draggingNodeId) {
    event.preventDefault();
    updateState((state) => {
      const node = state.geometry.nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        node.x = snapToGrid(point.x, 10);
        node.y = snapToGrid(point.y, 10);
      }
    }, { recordHistory: false });
    dragMoved = true;
  }
}

function onPointerDown(event) {
  const tool = getActiveTool();
  const point = getCanvasCoordinates(event);
  if (tool === 'add-node') {
    addNodeAt(point);
  } else if (tool === 'add-opening') {
    addOpeningAt(point);
  } else {
    selectedNodeId = null;
    selectedEdge = null;
    draw();
  }
}

function onPointerUp() {
  if (draggingNodeId) {
    draggingNodeId = null;
    if (dragMoved && dragSnapshot) {
      updateState((state) => {
        state.undoStack.push(dragSnapshot);
        if (state.undoStack.length > 50) {
          state.undoStack.shift();
        }
        state.redoStack = [];
      }, { recordHistory: false });
    }
    dragSnapshot = null;
    dragMoved = false;
  }
}

function onNodePointerDown(event, node) {
  event.stopPropagation();
  const tool = getActiveTool();
  if (tool === 'delete') {
    removeNode(node.id);
    return;
  }
  if (tool === 'split-edge') {
    selectedNodeId = node.id;
    draw();
    return;
  }
  dragSnapshot = structuredClone(getState());
  dragMoved = false;
  draggingNodeId = node.id;
  selectedNodeId = node.id;
  draw();
}

function onEdgePointerDown(event, plane, a, b) {
  event.stopPropagation();
  const tool = getActiveTool();
  if (tool === 'split-edge') {
    insertNodeOnEdge(plane, a, b);
  } else if (tool === 'delete') {
    selectedEdge = { planeId: plane.id, a: a.id, b: b.id };
    removeEdge(selectedEdge);
  }
}

function addNodeAt(point) {
  updateState((state) => {
    const id = nextId('N');
    const node = { id, x: snapToGrid(point.x, 10), y: snapToGrid(point.y, 10) };
    state.geometry.nodes.push(node);
    if (!state.geometry.planes.length) {
      state.geometry.planes.push({ id: nextId('P'), boundary: [id], pitch_deg: state.global.pitch.value, type: 'custom', openings: [] });
    } else {
      const plane = state.geometry.planes[0];
      plane.boundary.push(id);
    }
  });
  draw();
}

function removeNode(id) {
  updateState((state) => {
    state.geometry.nodes = state.geometry.nodes.filter((node) => node.id !== id);
    state.geometry.planes.forEach((plane) => {
      plane.boundary = plane.boundary.filter((nodeId) => nodeId !== id);
    });
  });
  draw();
}

function insertNodeOnEdge(plane, a, b) {
  updateState((state) => {
    const nodeA = plane.boundary.indexOf(a.id);
    const insertIndex = (nodeA + 1) % plane.boundary.length;
    const id = nextId('N');
    const newNode = {
      id,
      x: snapToGrid((a.x + b.x) / 2, 10),
      y: snapToGrid((a.y + b.y) / 2, 10),
    };
    state.geometry.nodes.push(newNode);
    plane.boundary.splice(insertIndex, 0, id);
  });
  draw();
}

function addOpeningAt(point) {
  const state = getState();
  const plane = state.geometry.planes.find((plane) => isPointInsidePlane(point, plane, state.geometry.nodes));
  if (!plane) {
    showToast('Отвір має бути всередині площини', { type: 'warning' });
    return;
  }
  updateState((state) => {
    const id = nextId('O');
    const opening = { id, type: 'skylight', x: snapToGrid(point.x - 200, 10), y: snapToGrid(point.y - 200, 10), w: 400, h: 400, rotation_deg: 0 };
    state.geometry.openings.push(opening);
    plane.openings = plane.openings || [];
    plane.openings.push(id);
  });
  draw();
}

function removeEdge(edge) {
  updateState((state) => {
    const plane = state.geometry.planes.find((p) => p.id === edge.planeId);
    if (!plane) return;
    plane.boundary = plane.boundary.filter((nodeId) => nodeId !== edge.a && nodeId !== edge.b);
  });
  draw();
}

function isPointInsidePlane(point, plane, nodes) {
  const polygon = plane.boundary.map((id) => nodes.find((n) => n.id === id)).filter(Boolean);
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function getCanvasCoordinates(event) {
  const rect = svg.getBoundingClientRect();
  const x = (event.clientX - rect.left) / scale;
  const y = (event.clientY - rect.top) / scale;
  return { x: x * 10, y: y * 10 };
}

export function setZoom(newZoom) {
  const clamped = Math.min(Math.max(newZoom, 0.25), 3);
  scale = clamped;
  updateState((state) => {
    state.view.zoom = clamped;
  }, { recordHistory: false });
  draw();
}

export function resetView() {
  scale = 1;
  panX = 0;
  panY = 0;
  updateState((state) => {
    state.view.zoom = 1;
  }, { recordHistory: false });
  draw();
}

export function fitToScreen() {
  const state = getState();
  if (!state.geometry.nodes.length) return;
  const minX = Math.min(...state.geometry.nodes.map((n) => n.x));
  const maxX = Math.max(...state.geometry.nodes.map((n) => n.x));
  const minY = Math.min(...state.geometry.nodes.map((n) => n.y));
  const maxY = Math.max(...state.geometry.nodes.map((n) => n.y));
  const width = maxX - minX;
  const height = maxY - minY;
  const canvasRect = svg.getBoundingClientRect();
  const zoomX = canvasRect.width / (width + 400);
  const zoomY = canvasRect.height / (height + 400);
  scale = Math.min(Math.max(Math.min(zoomX, zoomY), 0.2), 3);
  updateState((state) => {
    state.view.zoom = scale;
  }, { recordHistory: false });
  draw();
}
