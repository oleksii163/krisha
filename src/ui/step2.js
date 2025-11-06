import { getState, updateState } from '../state/store.js';
import { roofTypeMeta, getTemplate } from '../state/templates.js';
import { showToast } from './toast.js';

export function renderStep2(container) {
  const state = getState();
  container.innerHTML = `
    <h2>2. Швидке налаштування геометрії</h2>
    <p>Вкажіть основні параметри для вибраного типу даху. Значення застосовуються миттєво.</p>
    <div class="form-grid">
      <div class="form-field">
        <label>Назва проєкту</label>
        <input id="project-name" type="text" value="${state.project.name}" />
      </div>
      <div class="form-field">
        <label>Дата</label>
        <input id="project-date" type="date" value="${state.project.date_iso}" />
      </div>
      <div class="form-field">
        <label>Ухил (°)</label>
        <input id="pitch" type="number" min="5" max="60" step="0.1" value="${state.global.pitch.value}" />
      </div>
      <div class="form-field">
        <label>Одиниці</label>
        <select id="units">
          <option value="mm" ${state.units === 'mm' ? 'selected' : ''}>Міліметри</option>
          <option value="m" ${state.units === 'm' ? 'selected' : ''}>Метри</option>
        </select>
      </div>
      <div class="form-field">
        <label>Звис фронтальний (мм)</label>
        <input id="eaves-front" type="number" value="${state.global.eaves.front}" />
      </div>
      <div class="form-field">
        <label>Звис тильний (мм)</label>
        <input id="eaves-back" type="number" value="${state.global.eaves.back}" />
      </div>
      <div class="form-field">
        <label>Звис лівий (мм)</label>
        <input id="eaves-left" type="number" value="${state.global.eaves.left}" />
      </div>
      <div class="form-field">
        <label>Звис правий (мм)</label>
        <input id="eaves-right" type="number" value="${state.global.eaves.right}" />
      </div>
      <div class="form-field">
        <label>Матеріал покриття</label>
        <input id="material-code" type="text" value="${state.materials.cover.code}" />
      </div>
      <div class="form-field">
        <label>Колір (RAL)</label>
        <input id="material-color" type="text" value="${state.materials.cover.color}" />
      </div>
      <div class="form-field">
        <label>Товщина покриття (мм)</label>
        <input id="material-thickness" type="number" step="0.01" value="${state.materials.cover.thickness_mm}" />
      </div>
    </div>
    <div class="panel-section">
      <h4>Швидкі шаблони</h4>
      <div class="legend">
        ${roofTypeMeta
          .map(
            (type) => `
              <button class="btn" data-template="${type.id}">${type.label}</button>
            `
          )
          .join('')}
      </div>
    </div>
    <div class="panel-section">
      <h4>Примітки</h4>
      <textarea id="project-notes" placeholder="Додайте короткі нотатки">${state.notes ?? ''}</textarea>
    </div>
  `;

  container.querySelectorAll('input, select, textarea').forEach((input) => {
    input.addEventListener('change', handleChange);
  });

  container.querySelectorAll('[data-template]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.template;
      const tpl = getTemplate(type);
      if (!tpl) return;
      updateState((state) => {
        state.roof_type = type === 'custom' ? 'custom' : mapType(type);
        state.geometry.nodes = tpl.nodes;
        state.geometry.planes = tpl.planes;
        state.geometry.openings = [];
      });
      showToast(`Застосовано шаблон ${btn.textContent}`);
    });
  });
}

function handleChange(event) {
  const { id, value } = event.target;
  updateState((state) => {
    switch (id) {
      case 'project-name':
        state.project.name = value;
        break;
      case 'project-date':
        state.project.date_iso = value;
        break;
      case 'pitch':
        if (value !== '') {
          state.global.pitch.value = Number(value);
        }
        break;
      case 'units':
        state.units = value;
        break;
      case 'eaves-front':
        if (value !== '') {
          state.global.eaves.front = Number(value);
        }
        break;
      case 'eaves-back':
        if (value !== '') {
          state.global.eaves.back = Number(value);
        }
        break;
      case 'eaves-left':
        if (value !== '') {
          state.global.eaves.left = Number(value);
        }
        break;
      case 'eaves-right':
        if (value !== '') {
          state.global.eaves.right = Number(value);
        }
        break;
      case 'material-code':
        state.materials.cover.code = value;
        break;
      case 'material-color':
        state.materials.cover.color = value;
        break;
      case 'material-thickness':
        if (value !== '') {
          state.materials.cover.thickness_mm = Number(value);
        }
        break;
      case 'project-notes':
        state.notes = value;
        break;
    }
  }, { recordHistory: false });
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
