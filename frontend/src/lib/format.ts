export function money(value: number | string, currency = 'PKR') {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n || 0);
}
