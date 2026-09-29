import type { TaskDefaults } from '../maintenance';

// Manufacturer service intervals for specific models, keyed by year → make → model.
// Bikes that aren't listed here get GENERIC_MAINTENANCE_TASKS instead.
export const BIKE_SCHEDULES: Record<number, Record<string, Record<string, TaskDefaults[]>>> = {
  2024: {
    Husqvarna: {
      'Norden 901': [
        { task_name: 'Engine Oil & Filter', interval_mileage: 9300, interval_months: 12, is_diy: true },
        { task_name: 'Valve Clearance Check', interval_mileage: 28000, interval_months: 24, is_diy: false },
        { task_name: 'Chain Clean & Tension', interval_mileage: 600, interval_months: 1, is_diy: true },
      ],
      '701 Enduro': [
        { task_name: 'Engine Oil & Filter', interval_mileage: 6200, interval_months: 12, is_diy: true },
      ],
    },
    Yamaha: {
      'Tenere 700': [
        { task_name: 'Engine Oil & Filter', interval_mileage: 6000, interval_months: 12, is_diy: true },
        { task_name: 'Spark Plugs Replacement', interval_mileage: 12000, interval_months: 24, is_diy: true },
      ],
    },
  },
  2023: {
    Husqvarna: {
      'Norden 901': [
        { task_name: 'Engine Oil & Filter', interval_mileage: 9300, interval_months: 12, is_diy: true },
      ],
    },
  },
};
