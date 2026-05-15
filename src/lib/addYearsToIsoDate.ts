/** ISO `YYYY-MM-DD` with calendar years added (UTC components). */
export function addYearsToIsoDate(isoDate: string, years: number): string {
  const raw = isoDate.trim().slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return raw;
    d.setUTCFullYear(d.getUTCFullYear() + years);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const [py, pm, pd] = parts;
  const d = new Date(Date.UTC(py, pm - 1, pd));
  d.setUTCFullYear(d.getUTCFullYear() + years);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
