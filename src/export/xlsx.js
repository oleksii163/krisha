import { getState } from '../state/store.js';
import { polygonArea, polygonPerimeter, distance } from '../geometry/polygon.js';
import { createZip } from '../utils/zip.js';

export function exportXlsx() {
  const state = getState();
  const workbook = buildWorkbook(state);
  const blob = new Blob([workbook], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const name = `${formatFileName(state.project.name)}_${state.project.date_iso}_params.xlsx`;
  triggerDownload(url, name);
}

function buildWorkbook(state) {
  const sharedStrings = [];
  const summary = buildSummarySheet(state, sharedStrings);
  const planes = buildPlanesSheet(state, sharedStrings);
  const edges = buildEdgesSheet(state, sharedStrings);
  const nodes = buildNodesSheet(state, sharedStrings);
  const openings = buildOpeningsSheet(state, sharedStrings);

  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>\n  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n</Types>`
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n</Relationships>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>\n  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>\n  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>\n  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/>\n  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>\n  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n</Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <sheets>\n    <sheet name="Summary" sheetId="1" r:id="rId1"/>\n    <sheet name="Planes" sheetId="2" r:id="rId2"/>\n    <sheet name="Edges" sheetId="3" r:id="rId3"/>\n    <sheet name="Nodes" sheetId="4" r:id="rId4"/>\n    <sheet name="Openings" sheetId="5" r:id="rId5"/>\n  </sheets>\n</workbook>`
    },
    { name: 'xl/worksheets/sheet1.xml', data: summary },
    { name: 'xl/worksheets/sheet2.xml', data: planes },
    { name: 'xl/worksheets/sheet3.xml', data: edges },
    { name: 'xl/worksheets/sheet4.xml', data: nodes },
    { name: 'xl/worksheets/sheet5.xml', data: openings },
    { name: 'xl/sharedStrings.xml', data: buildSharedStrings(sharedStrings) },
    { name: 'xl/styles.xml', data: buildStyles() },
  ];

  return createZip(files);
}

function buildSummarySheet(state, sharedStrings) {
  const rows = [
    ['Проєкт', state.project.name],
    ['Тип', state.roof_type ?? '—'],
    ['Площа_загальна_м2', totalArea(state).toFixed(2)],
    ['Периметр_мм', totalPerimeter(state).toFixed(0)],
    ['Ухил_середній_град', averagePitch(state).toFixed(1)],
    ['Матеріал_код', state.materials.cover.code],
    ['Колір', state.materials.cover.color],
  ];
  return worksheetFromRows(rows, sharedStrings);
}

function buildPlanesSheet(state, sharedStrings) {
  const header = ['PlaneID', 'Площа_м2', 'Ухил_град', 'Периметр_мм', 'Кількість_ребер', 'EdgeIDs'];
  const rows = state.geometry.planes.map((plane) => {
    const points = plane.boundary.map((id) => state.geometry.nodes.find((n) => n.id === id)).filter(Boolean);
    const area = Math.abs(polygonArea(points)) / 1_000_000;
    const perimeter = polygonPerimeter(points);
    const edges = plane.boundary.map((nodeId, index) => {
      const next = plane.boundary[(index + 1) % plane.boundary.length];
      return `${nodeId}-${next}`;
    });
    return [plane.id, area.toFixed(3), plane.pitch_deg.toFixed(1), perimeter.toFixed(0), plane.boundary.length, edges.join(', ')];
  });
  return worksheetFromRows([header, ...rows], sharedStrings);
}

function buildEdgesSheet(state, sharedStrings) {
  const header = ['EdgeID', 'From', 'To', 'Тип', 'Довжина_мм'];
  const rows = [];
  state.geometry.planes.forEach((plane, planeIndex) => {
    plane.boundary.forEach((nodeId, index) => {
      const nextId = plane.boundary[(index + 1) % plane.boundary.length];
      const from = state.geometry.nodes.find((n) => n.id === nodeId);
      const to = state.geometry.nodes.find((n) => n.id === nextId);
      if (!from || !to) return;
      rows.push([
        `${plane.id}-${index + 1}`,
        nodeId,
        nextId,
        plane.type ?? 'edge',
        Math.round(distance(from, to)),
      ]);
    });
  });
  return worksheetFromRows([header, ...rows], sharedStrings);
}

function buildNodesSheet(state, sharedStrings) {
  const header = ['NodeID', 'X_мм', 'Y_мм'];
  const rows = state.geometry.nodes.map((node) => [node.id, node.x, node.y]);
  return worksheetFromRows([header, ...rows], sharedStrings);
}

function buildOpeningsSheet(state, sharedStrings) {
  const header = ['ID', 'Тип', 'X_мм', 'Y_мм', 'W_мм', 'H_мм', 'Rotation_град'];
  const rows = state.geometry.openings.map((opening) => [
    opening.id,
    opening.type,
    opening.x,
    opening.y,
    opening.w,
    opening.h,
    opening.rotation_deg ?? 0,
  ]);
  return worksheetFromRows([header, ...rows], sharedStrings);
}

function worksheetFromRows(rows, sharedStrings) {
  let sheetData = '<?xml version="1.0" encoding="UTF-8"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  rows.forEach((row, rowIndex) => {
    sheetData += `<row r="${rowIndex + 1}">`;
    row.forEach((value, colIndex) => {
      const cellRef = `${columnLetter(colIndex + 1)}${rowIndex + 1}`;
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (isFinite(Number(value))) {
        sheetData += `<c r="${cellRef}"><v>${Number(value)}</v></c>`;
      } else {
        const idx = sharedStringIndex(String(value), sharedStrings);
        sheetData += `<c r="${cellRef}" t="s"><v>${idx}</v></c>`;
      }
    });
    sheetData += '</row>';
  });
  sheetData += '</sheetData></worksheet>';
  return sheetData;
}

function sharedStringIndex(value, sharedStrings) {
  const existing = sharedStrings.indexOf(value);
  if (existing !== -1) return existing;
  sharedStrings.push(value);
  return sharedStrings.length - 1;
}

function columnLetter(n) {
  let s = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildSharedStrings(sharedStrings) {
  const items = sharedStrings
    .map((value) => `<si><t>${escapeXml(value)}</t></si>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${items}</sst>`;
}

function buildStyles() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function totalArea(state) {
  return state.geometry.planes.reduce((sum, plane) => {
    const points = plane.boundary.map((id) => state.geometry.nodes.find((n) => n.id === id)).filter(Boolean);
    return sum + Math.abs(polygonArea(points)) / 1_000_000;
  }, 0);
}

function totalPerimeter(state) {
  return state.geometry.planes.reduce((sum, plane) => {
    const points = plane.boundary.map((id) => state.geometry.nodes.find((n) => n.id === id)).filter(Boolean);
    return sum + polygonPerimeter(points);
  }, 0);
}

function averagePitch(state) {
  if (!state.geometry.planes.length) return state.global.pitch.value;
  const total = state.geometry.planes.reduce((acc, plane) => acc + (plane.pitch_deg ?? state.global.pitch.value), 0);
  return total / state.geometry.planes.length;
}

function escapeXml(value) {
  return value.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
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
