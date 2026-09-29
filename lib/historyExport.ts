import type { Motorcycle, ServiceLog, UnitSystem } from './types';
import { distanceUnitLabel, toDisplayDistance } from './units';

export type ReportBike = Pick<Motorcycle, 'year' | 'make' | 'model' | 'current_mileage'>;
export type ReportLog = Pick<ServiceLog, 'id' | 'task_id' | 'task_name' | 'performed_at' | 'odometer_at_service' | 'cost' | 'notes'>;

export function bikeTitle(bike: Pick<Motorcycle, 'year' | 'make' | 'model'>): string {
  return `${bike.year} ${bike.make} ${bike.model}`;
}

export function serviceType(log: Pick<ServiceLog, 'task_id'>): 'Routine' | 'One-off' {
  return log.task_id ? 'Routine' : 'One-off';
}

/** Total of all recorded costs; logs without a cost are skipped. */
export function totalCost(logs: Pick<ServiceLog, 'cost'>[]): number {
  return logs.reduce((sum, log) => {
    const cost = Number(log.cost);
    return log.cost !== null && Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
}

/** e.g. "2024-yamaha-tenere-700-service-history.csv" */
export function historyFileName(bike: Pick<Motorcycle, 'year' | 'make' | 'model'>, extension: string): string {
  const slug = bikeTitle(bike)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-service-history.${extension}`;
}

function csvField(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A spreadsheet-friendly CSV of the service history, one row per service. */
export function buildServiceHistoryCsv(bike: ReportBike, logs: ReportLog[], unitSystem: UnitSystem): string {
  const unit = distanceUnitLabel(unitSystem);
  const rows: (string | number | null)[][] = [
    ['Date', 'Type', 'Service', `Odometer (${unit})`, 'Cost', 'Notes'],
    ...logs.map((log) => [
      log.performed_at.slice(0, 10),
      serviceType(log),
      log.task_name,
      toDisplayDistance(Number(log.odometer_at_service ?? 0), unitSystem),
      log.cost !== null && Number.isFinite(Number(log.cost)) ? Number(log.cost).toFixed(2) : null,
      log.notes,
    ]),
  ];

  return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}
