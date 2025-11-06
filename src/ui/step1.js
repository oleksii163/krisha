import { roofTypeMeta, getTemplate } from '../state/templates.js';
import { updateState, getState } from '../state/store.js';
import { showToast } from './toast.js';

export function renderStep1(container) {
  const state = getState();
  const selected = state.roof_type;
  container.innerHTML = `
    <h2>1. Оберіть тип даху</h2>
    <p>Виберіть базовий шаблон. Параметри можна змінити на наступних кроках.</p>
    <div class="roof-grid">
      ${roofTypeMeta
        .map(
          (type) => `
            <div class="roof-card ${isSelected(selected, type.id) ? 'selected' : ''}" data-type="${type.id}">
              <img alt="${type.label}" src="data:image/svg+xml;utf8,${encodeURIComponent(createThumbnail(type.id))}">
              <div>
                <h3>${type.label}</h3>
                <div class="meta">${type.description}</div>
              </div>
              <div class="badge">Ухил ~${type.pitch}°</div>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  container.querySelectorAll('.roof-card').forEach((card) => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.roof-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      const type = card.dataset.type;
      const tpl = getTemplate(type);
      updateState((state) => {
        state.roof_type = type === 'custom' ? 'custom' : mapType(type);
        if (tpl) {
          state.geometry.nodes = tpl.nodes;
          state.geometry.planes = tpl.planes;
          state.geometry.openings = [];
        }
        state.global.pitch.value = roofTypeMeta.find((t) => t.id === type)?.pitch ?? state.global.pitch.value;
      });
      showToast(`Обрано тип: ${card.querySelector('h3').textContent}`);
    });
  });
}

function isSelected(current, id) {
  if (!current) return false;
  switch (id) {
    case 'l':
      return current === 'L';
    case 't':
      return current === 'T';
    default:
      return current === id;
  }
}

function mapType(type) {
  switch (type) {
    case 'shed':
      return 'shed';
    case 'gable':
      return 'gable';
    case 'hip':
      return 'hip';
    case 'pyramid':
      return 'pyramid';
    case 'mansard':
      return 'mansard';
    case 'l':
      return 'L';
    case 't':
      return 'T';
    default:
      return 'custom';
  }
}

function createThumbnail(type) {
  const size = 120;
  const base = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140' fill='none'>`;
  const end = `</svg>`;
  let content = '';
  switch (type) {
    case 'shed':
      content = "<rect x='30' y='40' width='140' height='70' rx='8' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    case 'gable':
      content = "<polygon points='30,90 100,30 170,90' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    case 'hip':
      content = "<polygon points='40,90 100,30 160,90 100,120' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    case 'pyramid':
      content = "<polygon points='60,110 100,40 140,110' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    case 'mansard':
      content = "<path d='M30 100 L70 40 L130 40 L170 100 Z' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    case 'l':
      content = "<path d='M40 50 h80 v40 h-40 v30 h-40 z' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    case 't':
      content = "<path d='M40 50 h120 v30 h-40 v40 h-40 v-40 h-40 z' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
      break;
    default:
      content = "<rect x='40' y='40' width='120' height='60' fill='rgba(71,166,255,0.35)' stroke='rgba(255,255,255,0.4)' stroke-width='3' />";
  }
  return base + content + end;
}
