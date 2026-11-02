import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { directionsHref, emailHref, phoneHref, websiteHref, websiteLabel } from '@/lib/shops';
import type { Shop } from '@/lib/types';
import { ui } from './ui';

const linkClass = `${ui.chipButton} min-h-11`;

/** Call, Directions, Email and Website buttons for what the shop has; `compact` shows only Call and Directions. */
export default function ShopLinks({ shop, compact = false }: { shop: Shop; compact?: boolean }) {
  const tel = shop.phone ? phoneHref(shop.phone) : null;
  const directions = directionsHref(shop);
  const website = !compact && shop.website ? websiteHref(shop.website) : null;
  if (!tel && !directions && !(shop.email && !compact) && !website) return null;

  return (
    <span className="flex flex-wrap gap-2">
      {tel && (
        <a href={tel} className={linkClass} aria-label={`Call ${shop.name}`}>
          <Phone size={15} aria-hidden="true" /> Call
        </a>
      )}
      {directions && (
        <a href={directions} target="_blank" rel="noreferrer noopener" className={linkClass} aria-label={`Directions to ${shop.name}`}>
          <MapPin size={15} aria-hidden="true" /> Directions
        </a>
      )}
      {!compact && shop.email && (
        <a href={emailHref(shop.email)} className={linkClass} aria-label={`Email ${shop.name}`}>
          <Mail size={15} aria-hidden="true" /> Email
        </a>
      )}
      {website && (
        <a href={website} target="_blank" rel="noreferrer noopener" className={`${linkClass} max-w-full`}>
          <Globe size={15} className="shrink-0" aria-hidden="true" /> <span className="truncate">{websiteLabel(website)}</span>
        </a>
      )}
    </span>
  );
}
