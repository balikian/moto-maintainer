import { normalizeShop, SHOP_MAX_LENGTH } from './serviceVisits';
import type { Shop } from './types';

// A rider's shops and mechanics (the `shops` table), typed in by hand, and
// the links that call one, email it, find it on a map or open its website.
//
// Riders often copy a shop's details from Google, where the phone, address and
// website are buttons, so a long-press copies a link (`tel:…`, `sms:…`, a Google Maps
// link, a google.com/url redirect). Each field takes those as well as plain
// text, and the read* functions pull out what's inside.

/** The longest each field can be; the same limits are check constraints in the database. */
export const SHOP_FIELD_LIMITS = {
  name: SHOP_MAX_LENGTH,
  phone: 40,
  email: 254,
  address: 200,
  website: 300,
  notes: 1000,
  mapUrl: 500,
} as const;

export type ShopFields = Pick<Shop, 'name' | 'phone' | 'email' | 'address' | 'website' | 'notes' | 'map_url'>;

/** What the shop form sends: each field as typed, blank for none. */
export type ShopInput = Record<keyof ShopFields, string>;

const oneLine = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** Drops a label copied along with the value, like "Phone: " from Google's business panel. */
const unlabel = (text: string, label: RegExp) => text.replace(label, '');

function parseUrl(text: string): URL | null {
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

/** Undoes %-escapes; `plusIsSpace` for map links' paths, where "+" stands for a space (in tel: links it's the + of +1). */
function decode(text: string, plusIsSpace = false): string {
  try {
    return decodeURIComponent(plusIsSpace ? text.replace(/\+/g, ' ') : text);
  } catch {
    return text;
  }
}

/** "(555) 123-4567" for a North American number, else the number as it came. */
function formatPhone(number: string): string {
  const digits = number.replace(/\D/g, '');
  let local: string | null = null;
  if (number.startsWith('+')) local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : null;
  else if (digits.length === 10) local = digits;
  else if (digits.length === 11 && digits.startsWith('1')) local = digits.slice(1);
  return local ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}` : number;
}

/** A phone number as typed or pasted: a `tel:` or `sms:` link (Google's Call and text buttons) becomes the number. */
export function readPhone(text: string): string {
  const value = unlabel(oneLine(text), /^phone\s*:\s*/i);
  const scheme = value.match(/^(?:tel|sms|smsto):(?:\/\/)?/i)?.[0];
  if (!scheme) return value;
  return formatPhone(decode(value.slice(scheme.length)).split(/[;?&]/)[0].replace(/[^\d+*#,]/g, ''));
}

/** An email as typed or pasted: a `mailto:` link becomes the address. */
export function readEmail(text: string): string {
  const value = unlabel(oneLine(text), /^e-?mail\s*:\s*/i);
  return /^mailto:/i.test(value) ? decode(value.slice(7)).split('?')[0] : value;
}

const isGoogleHost = (host: string) => /^(?:www\.)?google\.[a-z.]+$/.test(host);

/** A website as typed or pasted: Google's redirect (google.com/url?q=…) becomes the site, without utm_ tracking. */
export function readWebsite(text: string): string {
  let value = unlabel(oneLine(text), /^(?:website|web|site)\s*:\s*/i);
  let url = parseUrl(value);
  const target = url && isGoogleHost(url.hostname) && url.pathname === '/url' ? (url.searchParams.get('q') ?? url.searchParams.get('url')) : null;
  if (target) {
    value = target;
    url = parseUrl(target);
  }
  if (!url) return value;
  for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
  return url.href.replace(/\?$/, '');
}

/** A Google or Apple Maps link, including the short ones Share gives (maps.app.goo.gl, share.google). */
export function isMapLink(text: string): boolean {
  const url = parseUrl(text.trim());
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return (
    host === 'maps.app.goo.gl' ||
    host === 'share.google' ||
    (host === 'goo.gl' && url.pathname.startsWith('/maps')) ||
    (host === 'g.co' && url.pathname.startsWith('/kgs')) ||
    /^maps\.google\.[a-z.]+$/.test(host) ||
    (isGoogleHost(host) && url.pathname.startsWith('/maps')) ||
    host === 'maps.apple.com' ||
    host === 'maps.apple'
  );
}

/** The address spelled out in a map link, if it has one; a leading shop name is left off. */
function addressInMapLink(url: URL, shopName: string): string {
  const place = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/)?.[1];
  const raw = place ?? url.searchParams.get('address') ?? url.searchParams.get('q') ?? url.searchParams.get('query') ?? '';
  const text = oneLine(place ? decode(raw, true) : raw);
  // A place link also holds the shop's name, as its first part.
  const parts = text.split(/\s*,\s*/);
  const name = normalizeShop(shopName)?.toLowerCase();
  const address = parts.length > 1 && name && parts[0].toLowerCase() === name ? parts.slice(1).join(', ') : text;
  // Coordinates and bare names aren't an address.
  return /\d/.test(address) && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(address) ? address : '';
}

/**
 * An address as typed or pasted. Lines are joined with commas. A map link is kept
 * for Directions, with the address spelled out in it, if any (short share links have none).
 */
export function readAddress(text: string, shopName = ''): { address: string; mapUrl: string | null } {
  const value = unlabel(text.trim(), /^address\s*:\s*/i);
  if (isMapLink(value)) {
    const url = new URL(value);
    return { address: addressInMapLink(url, shopName), mapUrl: url.href };
  }
  const lines = value.split(/\s*\n\s*/).filter(Boolean);
  return { address: lines.join(', ').replace(/\s+/g, ' ').replace(/,(\s*,)+/g, ',').trim(), mapUrl: null };
}

/**
 * Why a link pasted into the phone, email or address (after reading it, above)
 * can't be used there, or null. Google's long-press on a phone number in search
 * copies a link to the search page itself, which has no number in it.
 */
export function pastedLinkProblem(field: 'phone' | 'email' | 'address', value: string): string | null {
  const url = parseUrl(value.trim());
  if (!url) return null;
  const google = isGoogleHost(url.hostname);
  if (field === 'phone') {
    return google
      ? 'That link goes to Google’s search page, and the number isn’t in it. In Google, press and hold the shop’s text (message) button instead and copy that link. No text button? Tap Call, then copy the number from your phone’s dialer.'
      : 'That’s a link, not a phone number. Please type the number.';
  }
  if (field === 'address') {
    return google
      ? 'That link goes to Google’s search page, not the address. Copy the address itself, or a Google Maps link.'
      : 'That’s a link, not an address. Paste the address, or a Google or Apple Maps link.';
  }
  return 'That’s a link, not an email address.';
}

/** "example.com" or "http://example.com/x" → a full http(s) address; null if it isn't one. */
export function normalizeWebsite(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname.includes('.')) return null;
  return url.href;
}

/**
 * The shop as saved: Google's links read (see above), trimmed, blanks as null,
 * the website made a full address; or what's wrong with it.
 */
export function cleanShop(input: Partial<Record<keyof ShopFields, unknown>>): { shop: ShopFields } | { error: string } {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const name = normalizeShop(text(input.name));
  if (!name) return { error: 'Please enter the shop’s name.' };

  const phone = readPhone(text(input.phone));
  const phoneLink = pastedLinkProblem('phone', phone);
  if (phoneLink) return { error: phoneLink };
  if (phone && (phone.length > SHOP_FIELD_LIMITS.phone || (phone.match(/\d/g)?.length ?? 0) < 3 || /[^\d\s()+.\-#*,;/xext]/i.test(phone))) {
    return { error: 'Please enter a phone number with digits only, like (555) 123-4567.' };
  }

  const email = readEmail(text(input.email));
  const emailLink = pastedLinkProblem('email', email);
  if (emailLink) return { error: emailLink };
  if (email && (email.length > SHOP_FIELD_LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: 'Please enter an email address like service@example.com.' };
  }

  // A map link pasted into the address, or the one kept from before.
  const pasted = readAddress(text(input.address), name);
  const address = pasted.address;
  const addressLink = pastedLinkProblem('address', address);
  if (addressLink) return { error: addressLink };
  if (address.length > SHOP_FIELD_LIMITS.address) return { error: `Please keep the address under ${SHOP_FIELD_LIMITS.address} characters.` };
  const mapText = pasted.mapUrl ?? oneLine(input.map_url);
  const mapUrl = mapText && isMapLink(mapText) ? new URL(mapText).href : null;
  if (mapText && (!mapUrl || mapUrl.length > SHOP_FIELD_LIMITS.mapUrl)) return { error: 'That map link isn’t one SwingArm can open.' };

  const websiteText = readWebsite(text(input.website));
  const website = websiteText ? normalizeWebsite(websiteText) : null;
  if (websiteText && (!website || website.length > SHOP_FIELD_LIMITS.website)) {
    return { error: 'Please enter a website like example.com.' };
  }

  const notes = text(input.notes).trim();
  if (notes.length > SHOP_FIELD_LIMITS.notes) return { error: `Please keep the notes under ${SHOP_FIELD_LIMITS.notes} characters.` };

  return {
    shop: { name, phone: phone || null, email: email || null, address: address || null, website, notes: notes || null, map_url: mapUrl },
  };
}

/** The form's starting values: a saved shop's, or all blank for a new one. */
export function shopInput(shop?: ShopFields | null): ShopInput {
  return {
    name: shop?.name ?? '',
    phone: shop?.phone ?? '',
    email: shop?.email ?? '',
    address: shop?.address ?? '',
    website: shop?.website ?? '',
    notes: shop?.notes ?? '',
    map_url: shop?.map_url ?? '',
  };
}

/** A tel: link that dials the number; an extension ("x 12") waits for the call to connect. */
export function phoneHref(phone: string): string | null {
  const [main, extension] = phone.split(/\s*(?:ext\.?|x)\s*/i);
  const digits = main.replace(/[^\d+*#]/g, '');
  if ((digits.match(/\d/g)?.length ?? 0) < 3) return null;
  const extensionDigits = extension?.replace(/\D/g, '');
  return `tel:${digits}${extensionDigits ? `,${extensionDigits}` : ''}`;
}

export function emailHref(email: string): string {
  return `mailto:${email}`;
}

/** Opens the address in the phone's maps app (Google Maps' link works on every platform). */
export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Where Directions goes: the map link the rider pasted, else a search for the address; null with neither. */
export function directionsHref(shop: Pick<Shop, 'address' | 'map_url'>): string | null {
  if (shop.map_url && isMapLink(shop.map_url)) return shop.map_url;
  return shop.address ? mapsHref(shop.address) : null;
}

/** The website as a link, only if it's an http(s) address. */
export function websiteHref(website: string): string | null {
  return normalizeWebsite(website);
}

/** "https://www.example.com/service" → "example.com" */
export function websiteLabel(website: string): string {
  const href = normalizeWebsite(website);
  return href ? new URL(href).hostname.replace(/^www\./, '') : website;
}
