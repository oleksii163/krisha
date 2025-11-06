import { getState } from '../state/store.js';
import { polygonArea } from '../geometry/polygon.js';

export function exportPdf() {
  const state = getState();
  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const nodes = state.geometry.nodes;
  if (!nodes.length) return;
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const scaleX = contentWidth / (maxX - minX || 1);
  const scaleY = contentHeight / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);

  const transform = (pt) => ({
    x: margin + (pt.x - minX) * scale,
    y: pageHeight - margin - (pt.y - minY) * scale,
  });

  const lines = [];
  const text = [];
  text.push(`BT /F1 18 Tf ${margin} ${pageHeight - margin + 10} Td (${escapeText(state.project.name)}) Tj ET`);
  text.push(`BT /F1 12 Tf ${margin} ${pageHeight - margin - 10} Td (Тип: ${state.roof_type ?? '—'} | Дата: ${state.project.date_iso}) Tj ET`);

  state.geometry.planes.forEach((plane) => {
    const pts = plane.boundary.map((id) => state.geometry.nodes.find((n) => n.id === id)).filter(Boolean);
    if (pts.length < 2) return;
    for (let i = 0; i < pts.length; i++) {
      const a = transform(pts[i]);
      const b = transform(pts[(i + 1) % pts.length]);
      lines.push(`${a.x.toFixed(2)} ${a.y.toFixed(2)} m ${b.x.toFixed(2)} ${b.y.toFixed(2)} l S`);
    }
    const area = Math.abs(polygonArea(pts)) / 1_000_000;
    text.push(`BT /F1 10 Tf ${transform(pts[0]).x.toFixed(2)} ${transform(pts[0]).y.toFixed(2)} Td (Площина ${plane.id} · ${area.toFixed(2)} м2) Tj ET`);
  });

  state.geometry.openings.forEach((opening) => {
    const x = transform({ x: opening.x, y: opening.y });
    const w = opening.w * scale;
    const h = opening.h * scale;
    lines.push(`${x.x.toFixed(2)} ${x.y.toFixed(2)} ${w.toFixed(2)} ${(-h).toFixed(2)} re S`);
  });

  const contentStream = [
    'q 0.9 w 0 0 0 RG',
    ...lines,
    'Q',
    ...text,
  ].join('\n');

  const pdf = createPdf([contentStream]);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const name = `${formatFileName(state.project.name)}_${state.project.date_iso}_roof.pdf`;
  triggerDownload(url, name);
}

function createPdf(streams) {
  const objects = [];
  const offsets = [];

  const pushObject = (content) => {
    objects.push(content);
  };

  pushObject('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  pushObject('2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj');

  const contentStream = streams.join('\n');
  const length = contentStream.length;
  pushObject('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj');
  pushObject(`4 0 obj << /Length ${length} >> stream\n${contentStream}\nendstream endobj`);
  pushObject('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

  let pdf = '%PDF-1.4\n';
  objects.forEach((obj, index) => {
    offsets[index] = pdf.length;
    pdf += obj + '\n';
  });
  const xrefPosition = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n';
  pdf += '0000000000 65535 f \n';
  objects.forEach((_, index) => {
    pdf += String(offsets[index]).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
  return pdf;
}

function formatFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'project';
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeText(text) {
  return text.replace(/[()\\]/g, (m) => `\\${m}`);
}
