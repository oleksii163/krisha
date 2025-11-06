import { getState, updateState } from '../state/store.js';
import { polygonArea, polygonPerimeter } from '../geometry/polygon.js';

export function renderSidePanel(container) {
  const state = getState();
  const { geometry } = state;
  container.innerHTML = `
    <h3>Параметри</h3>
    <div class="panel-section">
      <h4>Загальні</h4>
      <div class="table-like">
        <span>Одиниці</span>
        <span>${state.units}</span>
        <span>Ухил</span>
        <span>${state.global.pitch.value.toFixed(1)}°</span>
        <span>Матеріал</span>
        <span>${state.materials.cover.code} (${state.materials.cover.color})</span>
      </div>
    </div>
    <div class="panel-section">
      <h4>Площини (${geometry.planes.length})</h4>
      <div class="table-like">
        ${geometry.planes
          .map((plane) => {
            const points = plane.boundary
              .map((id) => geometry.nodes.find((n) => n.id === id))
              .filter(Boolean);
            const area = Math.abs(polygonArea(points));
            const perimeter = polygonPerimeter(points);
            return `
              <span>${plane.id}</span>
              <span>${(area / 1_000_000).toFixed(2)} м² · ${(perimeter / 1000).toFixed(2)} м</span>
            `;
          })
          .join('')}
      </div>
    </div>
    <div class="panel-section">
      <h4>Отвори (${geometry.openings.length})</h4>
      <div class="table-like">
        ${geometry.openings
          .map(
            (opening) => `
              <span>${opening.id}</span>
              <span>${opening.type} · ${opening.w}×${opening.h} мм</span>
            `
          )
          .join('') || '<span>Немає</span><span></span>'}
      </div>
    </div>
    <div class="panel-section">
      <h4>Управління</h4>
      <button class="btn" id="fit-to-screen">До меж полотна</button>
      <button class="btn" id="clear-openings">Очистити отвори</button>
    </div>
  `;

  container.querySelector('#fit-to-screen')?.addEventListener('click', () => {
    const event = new CustomEvent('fit-to-screen');
    window.dispatchEvent(event);
  });

  container.querySelector('#clear-openings')?.addEventListener('click', () => {
    updateState((state) => {
      state.geometry.openings = [];
      state.geometry.planes.forEach((plane) => (plane.openings = []));
    });
  });
}
