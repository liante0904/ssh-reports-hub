export function parseFinancialNumber(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value)
    .replaceAll(',', '')
    .replaceAll('원', '')
    .trim();

  if (!normalized) return null;
  if (normalized.startsWith('-')) return null;

  const numericMatch = normalized.match(/\d+(?:\.\d+)?/);
  if (!numericMatch) return null;

  const number = Number(numericMatch[0]);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function calculateUpsidePercent(targetPrice, previousClose) {
  const target = parseFinancialNumber(targetPrice);
  const close = parseFinancialNumber(previousClose);

  if (target === null || close === null) return null;
  return ((target - close) / close) * 100;
}

export function formatUpsidePercent(value) {
  if (!Number.isFinite(value)) return '';

  const normalized = Math.abs(value) < 0.05 ? 0 : value;
  const sign = normalized > 0 ? '+' : '';
  return `${sign}${normalized.toFixed(1)}%`;
}
