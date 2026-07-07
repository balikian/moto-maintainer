export interface Bike {
  id: string;
  year: number;
  make: string;
  model: string;
  current_mileage: number;
  image_url?: string;
}

export interface MaintenanceTask {
  id: string;
  bike_id: string;
  task_name: string;
  interval_mileage: number;
  last_performed_mileage: number;
  is_diy: boolean;
  status: 'Urgent' | 'Soon' | 'Healthy';
}

export const mockBikes: Bike[] = [
  {
    id: 'bike-1',
    year: 2023,
    make: 'Husqvarna',
    model: 'Norden 901',
    current_mileage: 6200,
  },
  {
    id: 'bike-2',
    year: 2021,
    make: 'Yamaha',
    model: 'Tenere 700',
    current_mileage: 12400,
  }
];

export const mockTasks: MaintenanceTask[] = [
  {
    id: 'task-1',
    bike_id: 'bike-1',
    task_name: 'Engine Oil & Filter',
    interval_mileage: 5000,
    last_performed_mileage: 5000,
    is_diy: true,
    status: 'Healthy'
  },
  {
    id: 'task-2',
    bike_id: 'bike-1',
    task_name: 'Chain Clean & Tension',
    interval_mileage: 500,
    last_performed_mileage: 6100,
    is_diy: true,
    status: 'Urgent'
  },
  {
    id: 'task-3',
    bike_id: 'bike-1',
    task_name: 'Valve Clearance Check',
    interval_mileage: 15000,
    last_performed_mileage: 0,
    is_diy: false,
    status: 'Soon'
  }
];