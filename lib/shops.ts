import { normalizeShop, SHOP_MAX_LENGTH } from './serviceVisits';
import type { Shop } from './types';

// A rider's shops and mechanics (the `shops` table), typed in by hand, and
// the links that call one, email it, find it on a map or open its website.

/** The longest each field can be; the same limits are check constraints in the database. */
export const SHOP_FIELD_LIMITS = {
  name: SHOP_MAX_LENGTH,
  phone: 40,
  email: 254,
  address: 200,
  website: 300,
  notes: 1000,
} as const;

export type ShopFields = Pick<Shop, 'name' | 'phone' | 'email' | 'address' | 'website' | 'notes'>;

/** What the shop form sends: each field as typed, blank for none. */
export type ShopInput = Record<keyof ShopFields, string>;

const oneLine = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

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

/** The shop as saved: trimmed, blanks as null, the website made a full address; or what's wrong with it. */
export function cleanShop(input: Partial<Record<keyof ShopFields, unknown>>): { shop: ShopFields } | { error: string } {
  const name = normalizeShop(typeof input.name === 'string' ? input.name : '');
  if (!name) return { error: 'Please enter the shop’s name.' };

  const phone = oneLine(input.phone);
  if (phone && (phone.length > SHOP_FIELD_LIMITS.phone || (phone.match(/\d/g)?.length ?? 0) < 3 || /[^\d\s()+.\-#*,;/xext]/i.test(phone))) {
    return { error: 'Please enter a phone number with digits only, like (555) 123-4567.' };
  }

  const email = oneLine(input.email);
  if (email && (email.length > SHOP_FIELD_LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: 'Please enter an email address like service@example.com.' };
  }

  const address = oneLine(input.address);
  if (address.length > SHOP_FIELD_LIMITS.address) return { error: `Please keep the address under ${SHOP_FIELD_LIMITS.address} characters.` };

  const websiteText = oneLine(input.website);
  const website = websiteText ? normalizeWebsite(websiteText) : null;
  if (websiteText && (!website || website.length > SHOP_FIELD_LIMITS.website)) {
    return { error: 'Please enter a website like example.com.' };
  }

  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes.length > SHOP_FIELD_LIMITS.notes) return { error: `Please keep the notes under ${SHOP_FIELD_LIMITS.notes} characters.` };

  return {
    shop: { name, phone: phone || null, email: email || null, address: address || null, website, notes: notes || null },
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

/** The website as a link, only if it's an http(s) address. */
export function websiteHref(website: string): string | null {
  return normalizeWebsite(website);
}

/** "https://www.example.com/service" → "example.com" */
export function websiteLabel(website: string): string {
  const href = normalizeWebsite(website);
  return href ? new URL(href).hostname.replace(/^www\./, '') : website;
}
