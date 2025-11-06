export function updateStepper(step) {
  document.querySelectorAll('.stepper .step').forEach((el) => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s <= step);
  });
}
