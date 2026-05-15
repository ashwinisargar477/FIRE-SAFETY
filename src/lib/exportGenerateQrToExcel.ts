import * as XLSX from 'xlsx';

import { formatManufacturingYear } from '@/lib/manufacturingYear';
import { buildExtinguisherQrLabelText, inspectionLabelLine } from '@/lib/extinguisherQrLabel';
import type { ExtinguisherQrModalData } from '@/components/ExtinguisherQrViewModal';

function formatDateGb(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') return '';
  const t = new Date(String(raw));
  if (Number.isNaN(t.getTime())) return String(raw);
  return t.toLocaleDateString('en-GB');
}

function formatDateTimeGb(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') return '';
  const t = new Date(String(raw));
  if (Number.isNaN(t.getTime())) return String(raw);
  return t.toLocaleString('en-GB');
}

/**
 * Builds one worksheet row per extinguisher with the same fields shown on Generate QR
 * plus register / hierarchy columns for a full export.
 */
export function buildGenerateQrExportRows(rows: ExtinguisherQrModalData[]) {
  return rows.map((ext) => ({
    'Unique Serial Number': ext.id,
    Division: ext.division,
    'Sub Division': ext.subDivision,
    Zone: ext.zone,
    'Plant / Office': ext.plantOffice,
    'Plant ID': ext.plantId ?? '',
    'Company Code': ext.companyCode,
    'Plant Code': ext.plantCode,
    Plant: ext.plant,
    'Show Status': ext.showStatus,
    Region: ext.region,
    'Plant Unit': ext.plant_unit,
    Cluster: ext.cluster,
    'Company Name': ext.company_name,
    Make: ext.make,
    Type: ext.type,
    Media: ext.media,
    Capacity: ext.capacity,
    'Location with Elevation': ext.locationWithElevation,
    'Last UT test Date': formatDateGb(ext.lastUtTestDate),
    'Manufacturing year': formatManufacturingYear(ext.manufacturingDate),
    'Hydraulic test due Date': formatDateGb(ext.nextUtTestDate),
    'Hydraulic due': ext.hydraulicDueDate ? formatDateGb(ext.hydraulicDueDate) : '—',
    'Installed By': ext.installedBy,
    'Installed Date': formatDateTimeGb(ext.installedDate),
    'Archived At': ext.archivedAt ? formatDateTimeGb(ext.archivedAt) : '',
    'Archived Reason': ext.archivedReason ?? '',
    'Last Inspection At': ext.lastInspectionAt ? formatDateTimeGb(ext.lastInspectionAt) : '',
    'Inspection pending (3 mo.)': ext.inspectionPending ? 'Yes' : 'No',
    'Inspection summary': inspectionLabelLine(ext),
    'QR label payload': buildExtinguisherQrLabelText(ext),
  }));
}

export function downloadGenerateQrExcel(rows: ExtinguisherQrModalData[], baseName = 'generate-qr-extinguishers') {
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeName}_${dateStamp}.xlsx`;

  const data = buildGenerateQrExportRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extinguishers');
  XLSX.writeFile(wb, filename);
}
