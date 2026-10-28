'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  removePushDeviceAction,
  saveAppPushDeviceAction,
  savePushDeviceAction,
  sendTestPushAction,
} from '@/lib/actions/push';
import { trackEvent } from '@/lib/analytics';
import { isNativeApp } from '@/lib/nativeApp';
import { APP_NOTIFICATION_CHANNEL } from '@/lib/pushMessage';
import { decodeVapidKey, pushAvailability, type PushAvailability } from '@/lib/pushSupport';

// Push notifications on this device, for More's switch. Turning them on asks
// permission to notify, gets this device's push address and saves it for the
// daily reminder job. In a browser that's web push: register the service
// worker (public/sw.js) and subscribe with the app's VAPID public key. The
// phone app's web view has no web push, so the app registers with Firebase
// instead (@capacitor/push-notifications) and saves its token. A device counts
// as on only if its address is saved for this rider: the job deletes
// addresses the push service says are gone, and another account may have
// turned push on here.

export type PushStatus = 'loading' | 'unsupported' | 'home-screen' | 'blocked' | 'off' | 'on';

type Permission = 'granted' | 'denied' | 'prompt';

/** Push on this device, in a browser or the phone app. */
type DevicePush = {
  availability: () => PushAvailability;
  permission: () => Promise<Permission>;
  /** Asks to show notifications. Call it first thing in a tap: iPhones only show the prompt then. */
  requestPermission: () => Promise<Permission>;
  /** This device's push address, or null if it has none. */
  address: () => Promise<string | null>;
  /** Gets this device's push address and saves it for the signed-in rider. Needs permission. Returns the address. */
  subscribe: () => Promise<string>;
  /** Stops pushes to this device's address, once it's deleted from the rider's devices. */
  unsubscribe: () => Promise<void>;
};

async function currentSubscription(): Promise<PushSubscription | null> {
  if (webPush.availability() !== 'available') return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

const browserPermission = (permission: NotificationPermission): Permission => (permission === 'default' ? 'prompt' : permission);

const webPush: DevicePush = {
  availability: () =>
    pushAvailability({
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
      runningInstalled:
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
    }),
  permission: async () => browserPermission(Notification.permission),
  requestPermission: async () => browserPermission(await Notification.requestPermission()),
  address: async () => (await currentSubscription())?.endpoint ?? null,
  subscribe: async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) throw new Error('Push notifications aren’t set up on this site yet.');

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    // Start fresh: an old address may have expired or belong to another account.
    await (await registration.pushManager.getSubscription())?.unsubscribe();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(publicKey),
    });

    const keys = subscription.toJSON().keys ?? {};
    const saved = await savePushDeviceAction({ endpoint: subscription.endpoint, p256dh: keys.p256dh ?? '', auth: keys.auth ?? '' });
    if (saved.error) {
      await subscription.unsubscribe();
      throw new Error(saved.error);
    }
    return subscription.endpoint;
  },
  unsubscribe: async () => {
    await (await currentSubscription())?.unsubscribe();
  },
};

const appPermission = (state: PermissionState | 'prompt-with-rationale'): Permission =>
  state === 'granted' || state === 'denied' ? state : 'prompt';

// The app's Firebase token, from registering with Firebase: once per page.
let appToken: Promise<string> | null = null;

function appPushToken(): Promise<string> {
  appToken ??= (async () => {
    const listeners: Promise<{ remove: () => Promise<void> }>[] = [];
    try {
      return await new Promise<string>((resolve, reject) => {
        listeners.push(
          PushNotifications.addListener('registration', ({ value }) => resolve(value)),
          PushNotifications.addListener('registrationError', ({ error }) =>
            reject(new Error(`This phone couldn’t sign up for notifications: ${error}`))
          )
        );
        setTimeout(() => reject(new Error('This phone didn’t answer. Try again in a moment.')), 20_000);
        Promise.all(listeners)
          .then(() => PushNotifications.register())
          .catch(reject);
      });
    } finally {
      for (const listener of listeners) void listener.then((handle) => handle.remove());
    }
  })().catch((error: unknown) => {
    appToken = null;
    throw error;
  });
  return appToken;
}

const appPush: DevicePush = {
  availability: () => 'available',
  permission: async () => appPermission((await PushNotifications.checkPermissions()).receive),
  requestPermission: async () => appPermission((await PushNotifications.requestPermissions()).receive),
  // Before Android 13 apps may always notify, so this registers even if push was never turned on; nothing is saved.
  address: async () => ((await appPush.permission()) === 'granted' ? appPushToken() : null),
  subscribe: async () => {
    // Reminders get their own entry in the phone's notification settings.
    await PushNotifications.createChannel({
      id: APP_NOTIFICATION_CHANNEL,
      name: 'Maintenance reminders',
      description: 'Tasks coming due and odometer check-ins',
      importance: 3,
    }).catch(() => {});
    const token = await appPushToken();
    const saved = await saveAppPushDeviceAction(token);
    if (saved.error) throw new Error(saved.error);
    return token;
  },
  // Deleting the saved token is enough: nothing sends to it then.
  unsubscribe: async () => {},
};

/** Push on this device. Browser-only; don't call while rendering. */
const devicePush = (): DevicePush => (isNativeApp() ? appPush : webPush);

// Signing out turns push off on the device, so whoever signs in next doesn't
// get this rider's reminders. The device remembers whose push was on, and
// turns it back on when that rider signs in here again. Only the last rider is
// remembered; it isn't account data, so it lives in localStorage.
const RESTORE_KEY = 'moto-maintain:push-restore-user';

function rememberPushFor(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(RESTORE_KEY, userId);
    else window.localStorage.removeItem(RESTORE_KEY);
  } catch {
    // Storage unavailable (e.g. private browsing): the rider turns push back on themselves.
  }
}

function rememberedPushUser(): string | null {
  try {
    return window.localStorage.getItem(RESTORE_KEY);
  } catch {
    return null;
  }
}

/** Whether this device may push: push works here and notifications are allowed. */
async function canPush(device: DevicePush): Promise<boolean> {
  return device.availability() === 'available' && (await device.permission()) === 'granted';
}

/**
 * Turns push off here without asking: for signing out, so the next person on
 * this device doesn't get this rider's reminders. Remembers that it was on, so
 * signing back in turns it on again. Never throws.
 */
export async function turnOffPushOnThisDevice(userId: string): Promise<void> {
  try {
    const device = devicePush();
    if (!(await canPush(device))) return;
    const address = await device.address();
    if (!address) return;
    const removed = await removePushDeviceAction(address);
    if (removed.data) rememberPushFor(userId);
    await device.unsubscribe();
  } catch {
    // Signing out goes ahead regardless.
  }
}

/**
 * On sign-in: if this rider had push on here when they signed out, turns it
 * back on, without asking again (permission is still granted). If the browser
 * won't allow it without a tap, push stays off until they turn it on in More.
 * Never throws.
 */
export async function restorePushAfterSignIn(userId: string): Promise<void> {
  try {
    if (rememberedPushUser() !== userId) return;
    const device = devicePush();
    if (!(await canPush(device))) return;
    await device.subscribe();
    rememberPushFor(null);
  } catch {
    // Left off; the switch on More still works.
  }
}

type PushState = { status: PushStatus; endpoint: string | null; otherDevices: number; inApp: boolean };

async function readStatus(supabase: SupabaseClient): Promise<PushState> {
  const saved = await supabase.from('push_subscriptions').select('endpoint');
  const savedEndpoints = (saved.data ?? []).map((row: { endpoint: string }) => row.endpoint);

  const device = devicePush();
  const inApp = isNativeApp();
  const available = device.availability();
  const permission = available === 'available' ? await device.permission() : 'prompt';
  const address = permission === 'granted' ? await device.address() : null;
  const endpoint = address && savedEndpoints.includes(address) ? address : null;
  const otherDevices = savedEndpoints.filter((other) => other !== endpoint).length;

  if (available !== 'available') return { status: available, endpoint: null, otherDevices, inApp };
  if (permission === 'denied') return { status: 'blocked', endpoint: null, otherDevices, inApp };
  if (endpoint) return { status: 'on', endpoint, otherDevices, inApp };
  return { status: 'off', endpoint: null, otherDevices, inApp };
}

export function usePush(supabase: SupabaseClient) {
  const [state, setState] = useState<PushState>({ status: 'loading', endpoint: null, otherDevices: 0, inApp: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    let active = true;
    readStatus(supabase)
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState({ status: 'unsupported', endpoint: null, otherDevices: 0, inApp: isNativeApp() });
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setTestSent(false);
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const turnOn = () =>
    run(async () => {
      if (!isNativeApp() && !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error('Push notifications aren’t set up on this site yet.');
      }
      const device = devicePush();

      const permission = await device.requestPermission();
      if (permission !== 'granted') {
        setState((previous) => ({ ...previous, status: permission === 'denied' ? 'blocked' : 'off' }));
        return;
      }

      const endpoint = await device.subscribe();
      rememberPushFor(null);
      setState((previous) => ({ ...previous, status: 'on', endpoint }));
      trackEvent('Push turned on');
    });

  const turnOff = () =>
    run(async () => {
      const device = devicePush();
      const endpoint = state.endpoint ?? (await device.address());
      if (endpoint) {
        const removed = await removePushDeviceAction(endpoint);
        if (removed.error) throw new Error(removed.error);
      }
      await device.unsubscribe();
      // Turned off on purpose: don't turn it back on at the next sign-in.
      rememberPushFor(null);
      setState((previous) => ({ ...previous, status: 'off', endpoint: null }));
    });

  const sendTest = () =>
    run(async () => {
      if (!state.endpoint) return;
      const sent = await sendTestPushAction(state.endpoint);
      if (sent.error) throw new Error(sent.error);
      setTestSent(true);
    });

  return { ...state, busy, error, testSent, turnOn, turnOff, sendTest };
}
