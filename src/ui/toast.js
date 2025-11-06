const toastEl = document.getElementById('toast');
let timeout;

export function showToast(message, { type = 'info', duration = 3000 } = {}) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.dataset.type = type;
  toastEl.classList.add('show');
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}
