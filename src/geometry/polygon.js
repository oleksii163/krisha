export function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area / 2;
}

export function polygonPerimeter(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += distance(p1, p2);
  }
  return total;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;
  return false;
}

function direction(p1, p2, p3) {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1, p2, p) {
  return (
    Math.min(p1.x, p2.x) <= p.x &&
    p.x <= Math.max(p1.x, p2.x) &&
    Math.min(p1.y, p2.y) <= p.y &&
    p.y <= Math.max(p1.y, p2.y)
  );
}

export function hasSelfIntersection(points) {
  for (let i = 0; i < points.length; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      const b1 = points[j];
      const b2 = points[(j + 1) % points.length];
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

export function snapToGrid(value, grid = 50) {
  return Math.round(value / grid) * grid;
}

export function rotatePoint(point, center, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}
