export interface PredefinedTask {
  task_name: string;
  interval_mileage: number;
  is_diy: boolean;
}

export interface BikeModel {
  name: string;
  tasks: PredefinedTask[];
}

export interface BikeDatabase {
  [year: number]: {
    [make: string]: BikeModel[];
  };
}

export const bikeDatabase: BikeDatabase = {
  2024: {
    "Husqvarna": [
      { name: "Norden 901", tasks: [
        { task_name: "Engine Oil & Filter", interval_mileage: 9300, is_diy: true },
        { task_name: "Valve Clearance Check", interval_mileage: 28000, is_diy: false },
        { task_name: "Chain Clean & Tension", interval_mileage: 600, is_diy: true }
      ]},
      { name: "701 Enduro", tasks: [
        { task_name: "Engine Oil & Filter", interval_mileage: 6200, is_diy: true }
      ]}
    ],
    "Yamaha": [
      { name: "Tenere 700", tasks: [
        { task_name: "Engine Oil & Filter", interval_mileage: 6000, is_diy: true },
        { task_name: "Spark Plugs Replacement", interval_mileage: 12000, is_diy: true }
      ]}
    ]
  },
  2023: {
    "Husqvarna": [
      { name: "Norden 901", tasks: [
        { task_name: "Engine Oil & Filter", interval_mileage: 9300, is_diy: true }
      ]}
    ]
  }
};