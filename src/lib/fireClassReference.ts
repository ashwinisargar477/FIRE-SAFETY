/**
 * Fire extinguisher class legend (matches label text after QR scan / view).
 * Line order: 1–7; use with `<ol>` so numbers render automatically.
 */
export const FIRE_CLASS_REFERENCE_LINES = [
  'Class A -Solids (Wood, paper, cloth, plastics etc.)',
  'Class B -Liquids (Petrol, diesel, solvents, paints etc.)',
  'Class C- Gases (LPG, propane, butane, natural gas etc.)',
  'Class D-Metals (Magnesium, sodium, aluminium, titanium etc.)',
  'Class E - Electrical (Energized electrical equipment etc.)',
  'Class F- Cooking Oils & Fats (Deep fryers, commercial kitchens etc.)',
  'Class L - Lithium-Ion (EVs, power banks, smartphones, battery storage etc.)',
] as const;

export const FIRE_CLASS_TYPE_OPTIONS = [
  'Class A',
  'Class B',
  'Class C',
  'Class D',
  'Class E',
  'Class F',
  'Class L',
] as const;

/** 1-based line indices in `FIRE_CLASS_REFERENCE_LINES` that match the dropdown Type. */
export function fireClassLineIndicesForType(type: unknown): Set<number> {
  const raw = String(type ?? '').trim();
  const low = raw.toLowerCase();
  const u = raw.toUpperCase();

  const classIdx = FIRE_CLASS_TYPE_OPTIONS.findIndex((o) => o.toLowerCase() === low);
  if (classIdx >= 0) return new Set([classIdx + 1]);

  if (u === 'ABC') return new Set([1, 2, 3]);
  if (u === 'BC') return new Set([2, 3]);
  if (u === 'D') return new Set([4]);

  return new Set();
}
