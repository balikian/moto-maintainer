export const CURRENT_MOTORCYCLE_YEAR = new Date().getFullYear();
export const NEXT_MOTORCYCLE_YEAR = CURRENT_MOTORCYCLE_YEAR + 1;
export const MOTORCYCLE_YEAR_OPTIONS = buildMotorcycleYearOptions();

export const MOTORCYCLE_MODELS_FALLBACK: Record<string, string[]> = {
  BMW: ['R 1250 GS', 'S 1000 RR', 'F 850 GS', 'G 310 GS', 'K 1600 GTL', 'R nineT', 'C 400 GT'],
  Ducati: ['Panigale V4', 'Monster', 'Multistrada V4', 'Diavel', 'Scrambler', 'Streetfighter V4'],
  'Harley-Davidson': ['Sportster', 'Street Glide', 'Road King', 'Fat Boy', 'Nightster', 'Pan America'],
  Honda: ['CBR1000RR', 'CRF450L', 'Africa Twin', 'Gold Wing', 'CB500X', 'XL750 Transalp'],
  Husqvarna: ['Norden 901', 'Vitpilen 401', 'Svartpilen 401', 'TE 300', 'FE 350'],
  Kawasaki: ['Ninja ZX-6R', 'Versys 1000', 'KLR650', 'Z900', 'Concours 14', 'Vulcan S'],
  KTM: ['1290 Super Duke R', '890 Adventure', '390 Adventure', 'RC 390', '690 Enduro R'],
  'Royal Enfield': ['Interceptor 650', 'Classic 350', 'Himalayan', 'Meteor 350', 'Continental GT 650'],
  Suzuki: ['GSX-R1000', 'V-Strom 1050', 'DR-Z400S', 'Hayabusa', 'SV650'],
  Triumph: ['Street Triple', 'Speed Triple 1200', 'Tiger 900', 'Bonneville T120', 'Rocket 3'],
  Yamaha: ['YZF-R1', 'MT-09', 'Tenere 700', 'Tracer 9 GT', 'R7'],
  Aprilia: ['RS 660', 'Tuono 660', 'Tuareg 660', 'RSV4'],
  'Moto Guzzi': ['V7 Stone', 'V85 TT', 'Necktail', 'Griso 1100'],
  'Zero Motorcycles': ['SR/F', 'DSR/X', 'FX', 'S', 'ZT'],
  Beta: ['RR 300', '390', '350 RR', '200 RR'],
  GasGas: ['EC 300', 'EX 250', 'MC 125'],
  Sherco: ['300 SE', '250 Factory', '125 Factory'],
  'MV Agusta': ['Brutale 1000', 'Turismo Veloce', 'F3', 'Rush 1000']
};

export const MOTORCYCLE_MAKES = Object.keys(MOTORCYCLE_MODELS_FALLBACK).sort((a, b) => a.localeCompare(b));

export function buildMotorcycleYearOptions(): number[] {
  const years: number[] = [];

  for (let year = NEXT_MOTORCYCLE_YEAR; year >= 1970; year -= 1) {
    years.push(year);
  }

  return years;
}

export async function fetchMotorcycleMakes(): Promise<string[]> {
  try {
    const response = await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/motorcycle?format=json');
    if (!response.ok) {
      throw new Error(`NHTSA makes request failed with status ${response.status}`);
    }

    const data = await response.json();
    const makes = Array.isArray(data?.Results)
      ? data.Results
          .map((entry: { Make_Name?: string }) => entry.Make_Name)
          .filter((make: string | undefined): make is string => Boolean(make && make.trim()))
          .sort((a: string, b: string) => a.localeCompare(b))
      : [];

    return makes.length > 0 ? makes : MOTORCYCLE_MAKES;
  } catch {
    return MOTORCYCLE_MAKES;
  }
}

export async function fetchMotorcycleModelsForMake(make: string, year: number): Promise<string[]> {
  const normalizedMake = make.trim();
  if (!normalizedMake) {
    return [];
  }

  const staticFallback = MOTORCYCLE_MODELS_FALLBACK[normalizedMake] ?? [];

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakenameyear/make/${encodeURIComponent(normalizedMake)}/modelyear/${year}/vehicletype/motorcycle?format=json`
    );

    if (!response.ok) {
      throw new Error(`NHTSA models request failed with status ${response.status}`);
    }

    const data = await response.json();
    const models = Array.isArray(data?.Results)
      ? data.Results
          .map((entry: { Model_Name?: string }) => entry.Model_Name)
          .filter((model: string | undefined): model is string => Boolean(model && model.trim()))
          .sort((a: string, b: string) => a.localeCompare(b))
      : [];

    return models.length > 0 ? models : staticFallback;
  } catch {
    return staticFallback;
  }
}
