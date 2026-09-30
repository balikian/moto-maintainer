// Row shapes for the Supabase tables. Distances are always stored in miles;
// dates are stored as calendar days ("YYYY-MM-DD").

export type UnitSystem = 'imperial' | 'metric';
export type Theme = 'dark' | 'light';

export interface Motorcycle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  current_mileage: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceTask {
  id: string;
  motorcycle_id: string;
  user_id: string;
  task_name: string;
  interval_mileage: number;
  interval_months: number;
  last_performed_mileage: number;
  last_performed_date: string | null;
  is_diy: boolean;
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
  sort_order: number;
}

export interface ModelSchedule extends ModelEntry {
  source: string | null;
  model_schedule_tasks: ScheduleTask[];
}

export interface ServiceLog {
  id: string;
  motorcycle_id: string;
  task_id: string | null;
  task_name: string;
  performed_at: string;
  odometer_at_service: number;
  cost: number | null;
  notes: string | null;
  created_at?: string;
}
