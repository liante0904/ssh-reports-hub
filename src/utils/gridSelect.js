export function hasGridSelection(value) {
  return value !== '' && value !== null && value !== undefined;
}

export function normalizeGridValue(value) {
  return hasGridSelection(value) ? value.toString() : '';
}
