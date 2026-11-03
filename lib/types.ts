import type { TaskCategory } from './taskCategories';

// Row shapes for the Supabase tables. Distances are always stored in miles;
// dates are stored as calendar days ("YYYY-MM-DD").

export type UnitSystem = 'imperial' | 'metric';
/** 'system' is Auto: follow the device's light or dark setting. */
export type Theme = 'system' | 'light' | 'dark';

/** Which reminder emails a rider wants; the `email_*` columns on `profiles`. */
export interface ReminderPreferences {
  taskReminders: boolean;
  odometerReminders: boolean;
  monthlySummary: boolean;
}

/** Which reminders go by push, to the devices the rider turned push on for; the `push_*` columns on `profiles`. */
export interface PushPreferences {
  taskReminders: boolean;
  odometerReminders: boolean;
}

export interface Motorcycle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  /** Null until the rider enters a reading. */
  current_mileage: number | null;
  /** When the rider bought the bike, with the odometer then (miles); both null if not given. */
  purchased_on?: string | null;
  purchase_mileage?: number | null;
  /** The rider's preferred shop for this bike (`shops`); null if none. */
  shop_id?: string | null;
  /** The day the bike went into storage; null while it's on the road (lib/storage.ts). */
  stored_on?: string | null;
  /** 'standard' or 'lithium'; read through cleanBatteryType. */
  battery_type?: string | null;
  /** Ticked storage and back-on-the-road checklist items; read through cleanStorageChecklist. */
  storage_checklist?: string[];
  /** The rider's own spec values, over the manual's (lib/specs.ts). Read through cleanBikeSpecs. */
  specs?: unknown;
  created_at?: string;
  updated_at?: string;
}

/** A shop or mechanic the rider typed in (lib/shops.ts). Blank fields are null. */
export interface Shop {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  /** A Google or Apple Maps link the rider pasted, which Directions opens. */
  map_url: string | null;
  created_at?: string;
}

/** Service booked for a bike (lib/bookings.ts), until it's logged or cancelled. */
export interface ServiceBooking {
  id: string;
  user_id: string;
  motorcycle_id: string;
  /** Null for a booking without a shop (at home), or whose shop was removed. */
  shop_id: string | null;
  booked_on: string;
  /** Local time, "HH:MM:SS" from the database; null for just the day. */
  booked_time: string | null;
  /** The bike's tasks it covers; may include ids of tasks deleted since. */
  task_ids: string[];
  notes: string | null;
  created_at?: string;
}

export interface MaintenanceTask {
  id: string;
  motorcycle_id: string;
  user_id: string;
  task_name: string;
  interval_mileage: number;
  interval_months: number;
  /** Null, with the date, while the task has no start point; see NO_START in lib/maintenance.ts. */
  last_performed_mileage: number | null;
  last_performed_date: string | null;
  is_diy: boolean;
  /** Null on older rows; see taskCategory() in lib/taskCategories.ts. */
  category?: TaskCategory | null;
  notes?: string | null;
  created_at?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** Shared reference data, matched to a bike by make, model, and model-year range. */
export interface ModelEntry {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  status: ReviewStatus;
  submitted_by: string | null;
  created_at: string;
}

export interface BikeManual extends ModelEntry {
  url: string;
  label: string;
}

export interface ScheduleTask {
  task_name: string;
  interval_distance: number;
  /** The unit the manufacturer's schedule uses; converted to miles when tasks are created. */
  distance_unit: 'mi' | 'km';
  interval_months: number;
  is_diy: boolean;
  /** Null on older rows; see taskCategory() in lib/taskCategories.ts. */
  category?: TaskCategory | null;
  sort_order: number;
}

export interface ModelSchedule extends ModelEntry {
  source: string | null;
  model_schedule_tasks: ScheduleTask[];
}

export interface ModelSpecs extends ModelEntry {
  /** Read through cleanSpecValues in lib/specs.ts. */
  specs: unknown;
  source: string | null;
}

export interface ServiceLog {
  id: string;
  motorcycle_id: string;
  task_id: string | null;
  task_name: string;
  performed_at: string;
  /** Null when the rider logged it without a reading. */
  odometer_at_service: number | null;
  /** Miles the task counted from when this was logged (the bike's odometer if no reading); null on older records. */
  baseline_mileage?: number | null;
  cost: number | null;
  notes: string | null;
  /** Where it was done ("Home", a shop's name); null if not given, missing on older shared data. */
  shop?: string | null;
  created_at?: string;
}
