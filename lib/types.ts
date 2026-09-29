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
