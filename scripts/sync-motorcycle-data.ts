import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CURATED_MAKES = [
  'Aprilia',
  'BMW',
  'Ducati',
  'Harley-Davidson',
  'Honda',
  'Husqvarna',
  'Indian',
  'Kawasaki',
  'KTM',
  'Moto Guzzi',
  'Royal Enfield',
  'Suzuki',
  'Triumph',
  'Yamaha',
  'Zero'
] as const;

const START_YEAR = 2000;
const END_YEAR = new Date().getFullYear() + 1;

type NhtsaModelResult = {
  Model_Name?: string | null;
};

type NhtsaModelsResponse = {
  Results?: NhtsaModelResult[];
};

type MotorcycleData = Record<string, { years: number[]; models: string[] }>;

const normalizeValue = (value: string) => value.replace(/\s+/g, ' ').trim();

const isClearlyNonMotorcycleModel = (value: string) => {
  const normalized = value.toLowerCase();

  if (!normalized || ['unknown', 'n/a', 'na'].includes(normalized)) {
    return true;
  }

  const nonMotorcyclePatterns = [
    'accord', 'civic', 'pilot', 'ridgeline', 'odyssey', 'cr-v', 'crv', 'corolla', 'camry', 'prius',
    'rav4', 'highlander', 'outback', 'forester', 'wrangler', 'mustang', 'charger', 'challenger',
    'silverado', 'f-150', 'f150', 'ranger', 'tundra', 'explorer', 'escape', 'focus', 'fit', 'passport',
    'crosstrek', 'impreza', 'legacy', 'outback', 'a4', 'a5', '3 series', '5 series', 'x5', 'x3', 'g35',
    'pickup', 'truck', 'sedan', 'van', 'suv', 'wagon', 'hatchback', 'minivan', 'coupe'
  ];

  return nonMotorcyclePatterns.some((pattern) => normalized.includes(pattern));
};

const sanitizeModelName = (value: string) => {
  const cleaned = normalizeValue(value)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*[-–—]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return null;
  }

  if (isClearlyNonMotorcycleModel(cleaned)) {
    return null;
  }

  return cleaned;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
};

const fetchModelsForMake = async (make: string, year: number): Promise<string[]> => {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/VehicleType/motorcycle?format=json`;

  try {
    const data = await fetchJson<NhtsaModelsResponse>(url);
    const models = (data.Results ?? [])
      .map((entry) => entry.Model_Name)
      .map((modelName) => sanitizeModelName(modelName ?? ''))
      .filter((modelName): modelName is string => Boolean(modelName));

    return [...new Set(models)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  } catch (error) {
    console.warn(`Failed to fetch models for ${make} (${year}):`, error);
    return [];
  }
};

const buildMotorcycleData = async (): Promise<MotorcycleData> => {
  const output: MotorcycleData = {};

  for (const make of CURATED_MAKES) {
    const modelSet = new Set<string>();
    const yearsWithModels = new Set<number>();

    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
      const models = await fetchModelsForMake(make, year);

      if (models.length === 0) {
        continue;
      }

      yearsWithModels.add(year);
      models.forEach((model) => modelSet.add(model));
    }

    if (modelSet.size === 0) {
      continue;
    }

    output[make] = {
      years: [...yearsWithModels].sort((a, b) => a - b),
      models: [...modelSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    };
  }

  return output;
};

const main = async () => {
  const motorcycleData = await buildMotorcycleData();
  const filePath = path.resolve(process.cwd(), 'lib/data/motorcycles.json');

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(motorcycleData, null, 2)}\n`, 'utf8');

  console.log(`Synced ${Object.keys(motorcycleData).length} motorcycle makes to ${filePath}`);
};

void main();
