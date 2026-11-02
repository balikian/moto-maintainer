import { serviceType } from './historyExport';
import { cleanBikeSpecs } from './specs';
import { categoryLabel, taskCategory } from './taskCategories';
import type { MaintenanceTask, Motorcycle, ServiceLog, Shop } from './types';

// "Download all my data": everything a rider has in SwingArm as one JSON file,
// laid out for a person to read (each bike holds its tasks and history).
// Distances stay in miles, as stored, and the field names say so.

export type AccountExportInput = {
  email: string | null;
  /** The rider's `profiles` row, or null if they never saved a setting. */
  profile: Record<string, unknown> | null;
  bikes: Motorcycle[];
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  shops: Shop[];
  /** "YYYY-MM-DD" */
  exportedOn: string;
};

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function cost(value: number | string | null): number | null {
  if (value === null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function buildAccountExport({ email, profile, bikes, tasks, logs, shops, exportedOn }: AccountExportInput) {
  const saved = profile ?? {};
  return {
    app: 'SwingArm',
    // Bump when the layout changes, so a future import can read older files.
    format_version: 1,
    exported_on: exportedOn,
    note: 'Distances are in miles. Dates are calendar days (YYYY-MM-DD). Specs keep the unit they were entered in.',
    account: {
      email,
      distance_units: saved.unit_system === 'metric' ? 'kilometers' : 'miles',
      theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : 'auto',
      reminder_emails: {
        tasks_coming_due: flag(saved.email_task_reminders, true),
        odometer_check_in: flag(saved.email_odometer_reminders, true),
        monthly_summary: flag(saved.email_monthly_summary, false),
      },
      push_notifications: {
        tasks_coming_due: flag(saved.push_task_reminders, true),
        odometer_check_in: flag(saved.push_odometer_reminders, true),
      },
    },
    shops: shops.map((shop) => ({
      name: shop.name,
      phone: shop.phone,
      email: shop.email,
      address: shop.address,
      website: shop.website,
      notes: shop.notes,
      map_link: shop.map_url,
    })),
    bikes: bikes.map((bike) => ({
      year: bike.year,
      make: bike.make,
      model: bike.model,
      odometer_miles: bike.current_mileage,
      bought_on: bike.purchased_on ?? null,
      odometer_when_bought_miles: bike.purchase_mileage ?? null,
      // The name of one of the shops above.
      shop: shops.find((shop) => shop.id === bike.shop_id)?.name ?? null,
      added_on: bike.created_at?.slice(0, 10) ?? null,
      // The rider's own specs, as saved (lib/specs.ts); the manual's are shared, not the rider's data.
      specs: cleanBikeSpecs(bike.specs),
      maintenance_tasks: tasks
        .filter((task) => task.motorcycle_id === bike.id)
        .map((task) => ({
          name: task.task_name,
          category: categoryLabel(taskCategory(task)),
          every_miles: task.interval_mileage || null,
          every_months: task.interval_months || null,
          last_done_miles: task.last_performed_mileage,
          last_done_on: task.last_performed_date,
          do_it_yourself: task.is_diy,
          notes: task.notes ?? null,
        })),
      service_history: logs
        .filter((log) => log.motorcycle_id === bike.id)
        .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
        .map((log) => ({
          date: log.performed_at.slice(0, 10),
          service: log.task_name,
          type: serviceType(log),
          odometer_miles: log.odometer_at_service,
          where: log.shop ?? null,
          cost: cost(log.cost),
          notes: log.notes,
        })),
    })),
  };
}

/** e.g. "swingarm-data-2026-10-16.json" */
export function accountExportFileName(exportedOn: string): string {
  return `swingarm-data-${exportedOn}.json`;
}
