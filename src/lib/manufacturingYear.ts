/**
 * Manufacturing is captured as calendar year in the UI but stored as DATE (YYYY-01-01).
 */
export function formatManufacturingYear(isoDate: string | undefined | null): string {
  if (isoDate == null || String(isoDate).trim() === '') return '—';
  const s = String(isoDate).trim();
  if (/^\d{4}$/.test(s)) return s;
  const isoYear = /^(\d{4})-\d{2}-\d{2}/.exec(s);
  if (isoYear) return isoYear[1];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return String(d.getFullYear());
  return s;
}
