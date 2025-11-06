let counter = 1;
export function nextId(prefix = 'ID') {
  counter += 1;
  return `${prefix}${String(counter).padStart(3, '0')}`;
}
