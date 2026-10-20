import { isIosDevice } from './install';

// Whether this browser can get push notifications (see app/hooks/usePush.ts).

/**
 * 'available'; 'home-screen' on an iPhone or iPad outside the Home Screen
 * app, where Safari has no push (it does inside, from iOS 16.4); or
 * 'unsupported'.
 */
export type PushAvailability = 'available' | 'home-screen' | 'unsupported';

export function pushAvailability(browser: {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  runningInstalled: boolean;
  userAgent: string;
  maxTouchPoints: number;
}): PushAvailability {
  if (browser.hasServiceWorker && browser.hasPushManager && browser.hasNotification) return 'available';
  if (isIosDevice(browser.userAgent, browser.maxTouchPoints) && !browser.runningInstalled) return 'home-screen';
  return 'unsupported';
}

/** The VAPID public key (URL-safe base64, as web-push prints it) as the bytes `pushManager.subscribe` takes. */
export function decodeVapidKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
