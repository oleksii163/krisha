import { polygonArea, hasSelfIntersection, polygonPerimeter } from './polygon.js';

export function validateModel(state) {
  const issues = [];
  const { geometry, global } = state;

  if (!state.roof_type) {
    issues.push({ type: 'error', message: 'Оберіть тип даху' });
  }

  if (geometry.planes.length === 0) {
    issues.push({ type: 'error', message: 'Додайте хоча б одну площину даху' });
  }

  geometry.planes.forEach((plane) => {
    const points = plane.boundary.map((id) => geometry.nodes.find((n) => n.id === id)).filter(Boolean);
    if (points.length < 3) {
      issues.push({ type: 'error', message: `Площина ${plane.id} має містити мінімум 3 вузли` });
      return;
    }
    const area = Math.abs(polygonArea(points));
    if (area < 10000) {
      issues.push({ type: 'error', message: `Площина ${plane.id} має замалу площу (<0.01 м²)` });
    }
    if (hasSelfIntersection(points)) {
      issues.push({ type: 'error', message: `Площина ${plane.id} має самоперетин` });
    }
    const perimeter = polygonPerimeter(points);
    if (perimeter / points.length < 150) {
      issues.push({ type: 'warning', message: `Є сторони коротші за 150 мм на площині ${plane.id}` });
    }

    plane.openings?.forEach((opId) => {
      const opening = geometry.openings.find((o) => o.id === opId);
      if (!opening) return;
      const within =
        opening.x >= Math.min(...points.map((p) => p.x)) + 100 &&
        opening.x + opening.w <= Math.max(...points.map((p) => p.x)) - 100 &&
        opening.y >= Math.min(...points.map((p) => p.y)) + 100 &&
        opening.y + opening.h <= Math.max(...points.map((p) => p.y)) - 100;
      if (!within) {
        issues.push({ type: 'error', message: `Отвір ${opening.id} виходить за межі площини ${plane.id}` });
      }
    });
  });

  if (global.pitch.value < 5 || global.pitch.value > 60) {
    issues.push({ type: 'warning', message: 'Ухил поза рекомендованим діапазоном 5–60°' });
  }

  geometry.openings.forEach((opening) => {
    if (opening.w < 150 || opening.h < 150) {
      issues.push({ type: 'warning', message: `Отвір ${opening.id} замалий (<150 мм)` });
    }
  });

  const ok = !issues.some((issue) => issue.type === 'error');
  return { ok, issues };
}
