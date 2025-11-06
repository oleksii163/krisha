import { snapToGrid } from '../geometry/polygon.js';

const mm = (m) => Math.round(m * 1000);

function rectangleTemplate(idPrefix, width, height, pitch = 18) {
  const nodes = [
    { id: `${idPrefix}A`, x: 0, y: 0 },
    { id: `${idPrefix}B`, x: width, y: 0 },
    { id: `${idPrefix}C`, x: width, y: height },
    { id: `${idPrefix}D`, x: 0, y: height },
  ];
  const plane = {
    id: `${idPrefix}P1`,
    boundary: nodes.map((n) => n.id),
    pitch_deg: pitch,
    type: 'main',
    openings: [],
  };
  return { nodes, planes: [plane] };
}

const templates = {
  shed: rectangleTemplate('S', mm(6), mm(4), 10),
  gable: rectangleTemplate('G', mm(8), mm(6), 25),
  hip: {
    nodes: [
      { id: 'H1', x: 0, y: 0 },
      { id: 'H2', x: mm(10), y: 0 },
      { id: 'H3', x: mm(10), y: mm(6) },
      { id: 'H4', x: 0, y: mm(6) },
      { id: 'H5', x: mm(5), y: mm(3) },
    ],
    planes: [
      { id: 'HP1', boundary: ['H1', 'H2', 'H5'], pitch_deg: 28, type: 'hip', openings: [] },
      { id: 'HP2', boundary: ['H2', 'H3', 'H5'], pitch_deg: 28, type: 'hip', openings: [] },
      { id: 'HP3', boundary: ['H3', 'H4', 'H5'], pitch_deg: 28, type: 'hip', openings: [] },
      { id: 'HP4', boundary: ['H4', 'H1', 'H5'], pitch_deg: 28, type: 'hip', openings: [] },
    ],
  },
  mansard: {
    nodes: [
      { id: 'M1', x: 0, y: 0 },
      { id: 'M2', x: mm(9), y: 0 },
      { id: 'M3', x: mm(9), y: mm(6) },
      { id: 'M4', x: 0, y: mm(6) },
      { id: 'M5', x: mm(2), y: mm(1.5) },
      { id: 'M6', x: mm(7), y: mm(1.5) },
      { id: 'M7', x: mm(7), y: mm(4.5) },
      { id: 'M8', x: mm(2), y: mm(4.5) },
    ],
    planes: [
      { id: 'MP1', boundary: ['M1', 'M2', 'M6', 'M5'], pitch_deg: 60, type: 'mansard', openings: [] },
      { id: 'MP2', boundary: ['M2', 'M3', 'M7', 'M6'], pitch_deg: 35, type: 'mansard', openings: [] },
      { id: 'MP3', boundary: ['M3', 'M4', 'M8', 'M7'], pitch_deg: 60, type: 'mansard', openings: [] },
      { id: 'MP4', boundary: ['M4', 'M1', 'M5', 'M8'], pitch_deg: 35, type: 'mansard', openings: [] },
    ],
  },
  pyramid: {
    nodes: [
      { id: 'PY1', x: 0, y: 0 },
      { id: 'PY2', x: mm(6), y: 0 },
      { id: 'PY3', x: mm(6), y: mm(6) },
      { id: 'PY4', x: 0, y: mm(6) },
      { id: 'PY5', x: mm(3), y: mm(3) },
    ],
    planes: [
      { id: 'PYPA', boundary: ['PY1', 'PY2', 'PY5'], pitch_deg: 30, type: 'pyramid', openings: [] },
      { id: 'PYPB', boundary: ['PY2', 'PY3', 'PY5'], pitch_deg: 30, type: 'pyramid', openings: [] },
      { id: 'PYPC', boundary: ['PY3', 'PY4', 'PY5'], pitch_deg: 30, type: 'pyramid', openings: [] },
      { id: 'PYPS', boundary: ['PY4', 'PY1', 'PY5'], pitch_deg: 30, type: 'pyramid', openings: [] },
    ],
  },
  l: {
    nodes: [
      { id: 'L1', x: 0, y: 0 },
      { id: 'L2', x: mm(6), y: 0 },
      { id: 'L3', x: mm(6), y: mm(4) },
      { id: 'L4', x: mm(3), y: mm(4) },
      { id: 'L5', x: mm(3), y: mm(7) },
      { id: 'L6', x: 0, y: mm(7) },
    ],
    planes: [
      { id: 'LP1', boundary: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], pitch_deg: 25, type: 'complex', openings: [] },
    ],
  },
  t: {
    nodes: [
      { id: 'T1', x: 0, y: 0 },
      { id: 'T2', x: mm(8), y: 0 },
      { id: 'T3', x: mm(8), y: mm(3) },
      { id: 'T4', x: mm(5.5), y: mm(3) },
      { id: 'T5', x: mm(5.5), y: mm(7) },
      { id: 'T6', x: mm(2.5), y: mm(7) },
      { id: 'T7', x: mm(2.5), y: mm(3) },
      { id: 'T8', x: 0, y: mm(3) },
    ],
    planes: [
      { id: 'TP1', boundary: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'], pitch_deg: 25, type: 'complex', openings: [] },
    ],
  },
  custom: {
    nodes: [
      { id: 'C1', x: 0, y: 0 },
      { id: 'C2', x: mm(5), y: 0 },
      { id: 'C3', x: mm(5), y: mm(5) },
      { id: 'C4', x: 0, y: mm(5) },
    ],
    planes: [
      { id: 'CP1', boundary: ['C1', 'C2', 'C3', 'C4'], pitch_deg: 20, type: 'custom', openings: [] },
    ],
  },
};

export function getTemplate(type) {
  const tpl = templates[type];
  if (!tpl) return null;
  const clonedNodes = tpl.nodes.map((node) => ({ ...node, x: snapToGrid(node.x, 10), y: snapToGrid(node.y, 10) }));
  const clonedPlanes = tpl.planes.map((plane) => ({ ...plane, boundary: [...plane.boundary], openings: [...(plane.openings || [])] }));
  return { nodes: clonedNodes, planes: clonedPlanes };
}

export const roofTypeMeta = [
  { id: 'shed', label: 'Односкатний', description: 'Простий похилий дах', pitch: 10 },
  { id: 'gable', label: 'Двоскатний', description: 'Класичний фронтонний дах', pitch: 25 },
  { id: 'hip', label: 'Вальмовий', description: 'Чотирьохскатний дах з вальмами', pitch: 28 },
  { id: 'pyramid', label: 'Шатровий', description: 'Чотири площини, сходяться у точці', pitch: 30 },
  { id: 'mansard', label: 'Ламаний', description: 'Мансардний з подвійним ухилом', pitch: 45 },
  { id: 'l', label: 'Г-подібний', description: 'Комбінований периметр у формі Г', pitch: 25 },
  { id: 't', label: 'Т-подібний', description: 'Комбінований периметр у формі Т', pitch: 25 },
  { id: 'custom', label: 'Довільний', description: 'Порожній полотно для довільної форми', pitch: 20 },
];
