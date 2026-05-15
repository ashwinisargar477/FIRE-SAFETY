import { formatManufacturingYear } from '@/lib/manufacturingYear';

/** Minimal row shape for QR encoding (label table columns). */
export type ExtinguisherQrLabelRow = {
  id: string;
  plant: string;
  companyCode: string;
  plantCode: string;
  make: string;
  type: string;
  media: string;
  capacity: string;
  locationWithElevation: string;
  lastUtTestDate: string;
  manufacturingDate: string;
  nextUtTestDate: string;
  hydraulicDueDate?: string | null;
  archivedAt?: string | null;
  lastInspectionAt?: string | null;
  inspectionPending?: boolean;
};

export function buildExtinguisherQrLabelText(ext: ExtinguisherQrLabelRow): string {
  const inspectionLine = inspectionLabelLine(ext);
  return [
    'NUVOCO FIRE SAFETY - EXTINGUISHER',
    `Unique Serial Number: ${ext.id}`,
    `Plant: ${ext.plant} (${ext.companyCode} / ${ext.plantCode})`,
    `Make: ${ext.make}`,
    `Type: ${ext.type}`,
    `Media: ${ext.media}`,
    `Capacity: ${ext.capacity}`,
    `Location with Elevation: ${ext.locationWithElevation}`,
    `Last UT test Date: ${formatUtDate(ext.lastUtTestDate)}`,
    `Manufacturing year: ${formatManufacturingYear(ext.manufacturingDate)}`,
    `Hydraulic test due Date: ${formatUtDate(ext.nextUtTestDate)}`,
    `Hydraulic due: ${ext.hydraulicDueDate ? formatUtDate(ext.hydraulicDueDate) : '—'}`,
    `Inspection (pending if none in 3 months): ${inspectionLine}`,
  ].join('\n');
}

function formatUtDate(raw: string): string {
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return raw || '—';
  return t.toLocaleDateString('en-GB');
}

export function inspectionLabelLine(ext: ExtinguisherQrLabelRow): string {
  if (ext.archivedAt) return '— (archived)';
  if (ext.inspectionPending) {
    if (ext.lastInspectionAt) {
      return `Inspection pending · last inspection ${formatUtDate(ext.lastInspectionAt)}`;
    }
    return 'Inspection pending · no inspection on record';
  }
  if (ext.lastInspectionAt) {
    return `Up to date · last ${formatUtDate(ext.lastInspectionAt)}`;
  }
  return 'Up to date · new install (within 3 mo.)';
}
