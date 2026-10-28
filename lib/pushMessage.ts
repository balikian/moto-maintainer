import { dailySubject, dueText } from './reminderEmail';
import type { DailyReminders } from './reminders';
import type { UnitSystem } from './types';
import { formatDistance } from './units';

// The push notification for the daily reminders: what public/sw.js shows,
// and the phone app's notifications (lib/fcm.ts).
// Phones show a few lines, so the body lists the first few reminders and
// counts the rest.

export type PushMessage = {
  title: string;
  body: string;
  /** Opened when the notification is tapped; a path on the site that sent it. */
  url: string;
  /** Notifications with the same tag replace each other, so yesterday's doesn't pile up under today's. */
  tag: string;
};

const MAX_LINES = 4;

/** The Android notification channel the phone app files reminders under; its name shows in the phone's settings. */
export const APP_NOTIFICATION_CHANNEL = 'reminders';

export function dailyPush({ tasks, odometer }: DailyReminders, units: UnitSystem): PushMessage {
  const severalBikes = new Set([...tasks, ...odometer].map((entry) => entry.bike.id)).size > 1;
  const lines = [
    ...tasks.map((entry) => {
      const name = severalBikes ? `${entry.bike.model}: ${entry.task.task_name}` : entry.task.task_name;
      return `${name}, ${dueText(entry, units).toLowerCase()}`;
    }),
    ...odometer.map(({ bike, daysSince }) =>
      bike.current_mileage === null
        ? `Add an odometer reading for your ${bike.model}`
        : tasks.length === 0 && odometer.length === 1
          ? `It’s been ${daysSince} days at ${formatDistance(bike.current_mileage, units)}. Tap to enter the new reading.`
          : `Update the odometer on your ${bike.model}`
    ),
  ];

  const shown = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES - 1) : lines;
  if (shown.length < lines.length) shown.push(`And ${lines.length - shown.length} more`);

  return { title: dailySubject({ tasks, odometer }), body: shown.join('\n'), url: '/', tag: 'daily-reminders' };
}

/** What More's Test button sends. */
export function testPush(): PushMessage {
  return {
    title: 'Push notifications are on',
    body: 'SwingArm will tell you here when maintenance is coming due.',
    url: '/?view=more',
    tag: 'test',
  };
}
