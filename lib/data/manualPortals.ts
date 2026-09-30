// Official owner's-manual pages, by make (lowercase). Checked 2026-10-01.
// Makes not listed here fall back to a web search.

export const MANUAL_PORTALS: Record<string, { name: string; url: string }> = {
  bmw: { name: 'BMW Motorrad', url: 'https://manuals.bmw-motorrad.com/en/rider-manual' },
  ducati: { name: 'Ducati', url: 'https://www.ducati.com/ww/en/service-maintenance/owner-manuals' },
  honda: { name: 'Honda Powersports', url: 'https://powersports.honda.com/downloads/owners-manuals' },
  husqvarna: { name: 'Husqvarna Motorcycles', url: 'https://www.husqvarna-motorcycles.com/en-us/service/user-manuals.html' },
  indian: { name: 'Indian Motorcycle', url: 'https://www.indianmotorcycle.com/en-us/owners-manuals/' },
  kawasaki: { name: 'Kawasaki', url: 'https://www.kawasaki.com/en-us/owner-center/service-manuals' },
  ktm: { name: 'KTM', url: 'https://www.ktm.com/en-us/service/manuals.html' },
  'royal enfield': { name: 'Royal Enfield', url: 'https://www.royalenfield.com/us/en/support/owners-manual/' },
  triumph: { name: 'Triumph', url: 'https://www.triumphmotorcycles.com/owners/manuals' },
  yamaha: { name: 'Yamaha', url: 'https://www.yamaha-owners-manuals.com/' },
};

export function manualPortalFor(make: string) {
  return MANUAL_PORTALS[make.trim().toLowerCase()] ?? null;
}

export function manualSearchUrl(bike: { year: number; make: string; model: string }): string {
  const query = `${bike.year} ${bike.make} ${bike.model} owner's manual PDF`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
