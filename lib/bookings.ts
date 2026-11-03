import { daysBetween, isIsoDate, parseIsoDate } from './dates';
import type { MaintenanceTask, Motorcycle, ServiceBooking, Shop } from './types';

// Booked service (the `service_bookings` table): a visit the rider scheduled,
// at a shop or at home, for a day and maybe a time, covering some of the
// bike's tasks. It shows on Tasks until it's logged or cancelled, and goes in
// the rider's calendar with "Add to calendar" (a Google Calendar link or an
// .ics file), which also gives them a reminder. Times are the shop's local
// time as typed, so calendar events are "floating" (no time zone).

export const BOOKING_NOTES_MAX = 1000;
const MAX_TASKS = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the booking form sends. */
export type BookingInput = {
  bookedOn: string;
  /** "HH:MM", or blank for just the day. */
  bookedTime: string;
  taskIds: string[];
  notes: string;
  shopId: string | null;
};

export type BookingFields = Pick<ServiceBooking, 'booked_on' | 'booked_time' | 'task_ids' | 'notes' | 'shop_id'>;

/** The booking as saved, or what's wrong with it. */
export function cleanBooking(input: Partial<Record<keyof BookingInput, unknown>>): { booking: BookingFields } | { error: string } {
  const bookedOn = typeof input.bookedOn === 'string' ? input.bookedOn.trim() : '';
  if (!isIsoDate(bookedOn)) return { error: 'Please pick the day it’s booked for.' };

  const time = typeof input.bookedTime === 'string' ? input.bookedTime.trim() : '';
  const timeMatch = time.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (time && !timeMatch) return { error: 'Please enter the time like 9:30 AM.' };

  const taskIds = Array.isArray(input.taskIds)
    ? [...new Set(input.taskIds.filter((id): id is string => typeof id === 'string' && UUID.test(id)))]
    : [];
  if (taskIds.length > MAX_TASKS) return { error: 'That’s too many tasks for one booking.' };

  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes.length > BOOKING_NOTES_MAX) return { error: `Please keep the notes under ${BOOKING_NOTES_MAX} characters.` };

  return {
    booking: {
      booked_on: bookedOn,
      booked_time: timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null,
      task_ids: taskIds,
      notes: notes || null,
      shop_id: typeof input.shopId === 'string' && input.shopId ? input.shopId : null,
    },
  };
}

/** "09:30:00" → "9:30 AM" */
export function formatBookingTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** "Today", "Tomorrow", "Fri, Nov 14", or with the year when it isn't this year; plus the time if there is one. */
export function bookingWhen(booking: Pick<ServiceBooking, 'booked_on' | 'booked_time'>, today: Date): string {
  const date = parseIsoDate(booking.booked_on);
  if (!date) return booking.booked_on;
  const days = daysBetween(today, date);
  const day =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days === -1
          ? 'Yesterday'
          : new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
            }).format(date);
  return booking.booked_time ? `${day}, ${formatBookingTime(booking.booked_time)}` : day;
}

/** Whether the booked day has come (today or before), so it's time to log it. */
export function bookingIsDue(booking: Pick<ServiceBooking, 'booked_on'>, today: Date): boolean {
  const date = parseIsoDate(booking.booked_on);
  return date !== null && daysBetween(today, date) <= 0;
}

/** The booking's tasks that still exist, in the checklist's order. */
export function bookingTasks(booking: Pick<ServiceBooking, 'task_ids'>, tasks: MaintenanceTask[]): MaintenanceTask[] {
  return tasks.filter((task) => booking.task_ids.includes(task.id));
}

/** Each booked task's earliest booking day, by task id. */
export function bookedDates(bookings: Pick<ServiceBooking, 'booked_on' | 'task_ids'>[]): Map<string, string> {
  const dates = new Map<string, string>();
  for (const booking of bookings) {
    for (const id of booking.task_ids) {
      const known = dates.get(id);
      if (!known || booking.booked_on < known) dates.set(id, booking.booked_on);
    }
  }
  return dates;
}

const bikeName = (bike: Pick<Motorcycle, 'year' | 'make' | 'model'>) => `${bike.year} ${bike.make} ${bike.model}`;

/** "Oil change, chain and valve check": names joined the way a person writes them. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** A ready-made message asking the shop to book the bike in; the rider can edit it before sending. */
export function bookingRequestMessage({
  bike,
  odometer,
  taskNames,
}: {
  bike: Pick<Motorcycle, 'year' | 'make' | 'model'>;
  /** "5,200 mi", or null without a reading. */
  odometer: string | null;
  taskNames: string[];
}): string {
  const reading = odometer ? ` (about ${odometer})` : '';
  const work = taskNames.length > 0 ? `: ${joinNames(taskNames)}` : '';
  return `Hi, I’d like to book my ${bikeName(bike)}${reading} in for service${work}. When could you fit it in?\n\nThanks!`;
}

/** sms: and mailto: links with the message filled in, for the shop's number and email. */
export function textHref(phone: string, message: string): string | null {
  const number = phone.split(/\s*(?:ext\.?|x)\s*/i)[0].replace(/[^\d+]/g, '');
  if (number.replace(/\D/g, '').length < 3) return null;
  return `sms:${number}?body=${encodeURIComponent(message)}`;
}

export function emailRequestHref(email: string, bike: Pick<Motorcycle, 'year' | 'make' | 'model'>, message: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(`Service for my ${bikeName(bike)}`)}&body=${encodeURIComponent(message)}`;
}

export type CalendarEvent = {
  /** Stays the same for one booking, so adding it again updates the event. */
  uid: string;
  title: string;
  details: string;
  location: string | null;
  bookedOn: string;
  bookedTime: string | null;
};

/** The calendar event for a booking: "Norden 901 service at Scarab Werks", with the tasks and the shop's number. */
export function bookingEvent({
  booking,
  bike,
  shop,
  taskNames,
}: {
  booking: Pick<ServiceBooking, 'id' | 'booked_on' | 'booked_time' | 'notes'>;
  bike: Pick<Motorcycle, 'year' | 'make' | 'model'>;
  shop: Pick<Shop, 'name' | 'phone' | 'address'> | null;
  taskNames: string[];
}): CalendarEvent {
  const lines = [
    taskNames.length > 0 ? `Service: ${taskNames.join(', ')}` : null,
    shop?.phone ? `${shop.name}: ${shop.phone}` : null,
    booking.notes,
    `Bike: ${bikeName(bike)}`,
  ];
  return {
    uid: `${booking.id}@swingarm.app`,
    title: `${bike.model} service${shop ? ` at ${shop.name}` : ''}`,
    details: lines.filter(Boolean).join('\n'),
    location: shop?.address ?? (shop ? shop.name : null),
    bookedOn: booking.booked_on,
    bookedTime: booking.booked_time,
  };
}

const compactDate = (iso: string) => iso.replace(/-/g, '');

/** Start and end as calendar text: all day ("20261114", next day), or a floating hour ("20261114T093000"). */
function eventTimes(event: CalendarEvent): { start: string; end: string; allDay: boolean } {
  const date = parseIsoDate(event.bookedOn)!;
  if (!event.bookedTime) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const nextIso = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
    return { start: compactDate(event.bookedOn), end: nextIso, allDay: true };
  }
  const [hours, minutes] = event.bookedTime.split(':').map(Number);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  const end = new Date(start.getTime() + 60 * 60_000);
  const stamp = (value: Date) =>
    `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}00`;
  return { start: stamp(start), end: stamp(end), allDay: false };
}

/** Opens Google Calendar's new-event page, filled in. */
export function googleCalendarHref(event: CalendarEvent): string {
  const { start, end } = eventTimes(event);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${start}/${end}`, details: event.details });
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const icsText = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded, as the iCalendar format asks. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  parts.push(rest);
  return parts.join('\r\n ');
}

/** An .ics file for any calendar app (Apple, Outlook, Samsung…), with a reminder the day before. */
export function bookingIcs(event: CalendarEvent, now = new Date()): string {
  const { start, end, allDay } = eventTimes(event);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SwingArm//Service booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.details)}`,
    ...(event.location ? [`LOCATION:${icsText(event.location)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(event.title)}`,
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** "swingarm-service-2026-11-14.ics" */
export function bookingIcsFileName(bookedOn: string): string {
  return `swingarm-service-${bookedOn}.ics`;
}
