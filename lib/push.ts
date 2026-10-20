import webpush from 'web-push';
import type { PushMessage } from './pushMessage';
import type { PushDevice } from './reminders';
import { SUPPORT_EMAIL } from './site';

// Server-only: sends web push messages through each browser's push service
// (Google's for Chrome and Android, Apple's for Safari and iPhones, Mozilla's
// for Firefox), signed with the app's VAPID keys. The public key is
// NEXT_PUBLIC_VAPID_PUBLIC_KEY (browsers subscribe with it); the private key
// is VAPID_PRIVATE_KEY, never prefixed with NEXT_PUBLIC_. Devices subscribe
// to one key pair, so each database's environments share theirs: local and
// Preview use test's, Production its own.

/** A reminder older than this isn't worth showing; the push service drops it. */
const TIME_TO_LIVE_SECONDS = 24 * 60 * 60;

export type PushSendResult = {
  error?: string;
  /** The push service says this device is gone for good; delete it. */
  gone?: boolean;
};

export async function sendPush(device: PushDevice, message: PushMessage): Promise<PushSendResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { error: 'The VAPID keys are not set.' };

  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      JSON.stringify(message),
      {
        vapidDetails: { subject: `mailto:${SUPPORT_EMAIL}`, publicKey, privateKey },
        TTL: TIME_TO_LIVE_SECONDS,
      }
    );
    return {};
  } catch (error) {
    if (error instanceof webpush.WebPushError) {
      return {
        error: `Push service ${error.statusCode}: ${error.body?.slice(0, 200) ?? error.message}`,
        gone: error.statusCode === 404 || error.statusCode === 410,
      };
    }
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
