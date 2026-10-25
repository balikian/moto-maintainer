'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { removePushDeviceAction, savePushDeviceAction, sendTestPushAction } from '@/lib/actions/push';
import { trackEvent } from '@/lib/analytics';
import { decodeVapidKey, pushAvailability } from '@/lib/pushSupport';

// Push notifications on this device, for More's switch. Turning them on asks
// the browser's permission, registers the service worker (public/sw.js),
// subscribes with the app's VAPID public key, and saves the push address for
// the daily reminder job. A device counts as on only if its address is saved
// for this rider: the job deletes addresses the push service says are gone,
// and another account may have turned push on in this browser.

export type PushStatus = 'loading' | 'unsupported' | 'home-screen' | 'blocked' | 'off' | 'on';

function availability() {
  return pushAvailability({
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    runningInstalled:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (availability() !== 'available') return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

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

/**
 * Subscribes this device and saves its push address for the signed-in rider.
 * Needs notification permission already granted. Returns the address.
 */
async function subscribeThisDevice(): Promise<string> {
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
  rememberPushFor(null);
  return subscription.endpoint;
}

/**
 * Turns push off here without asking: for signing out, so the next person on
 * this device doesn't get this rider's reminders. Remembers that it was on, so
 * signing back in turns it on again. Never throws.
 */
export async function turnOffPushOnThisDevice(userId: string): Promise<void> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    rememberPushFor(userId);
    await removePushDeviceAction(subscription.endpoint);
    await subscription.unsubscribe();
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
    if (availability() !== 'available' || Notification.permission !== 'granted') return;
    await subscribeThisDevice();
  } catch {
    // Left off; the switch on More still works.
  }
}

async function readStatus(supabase: SupabaseClient): Promise<{ status: PushStatus; endpoint: string | null; otherDevices: number }> {
  const saved = await supabase.from('push_subscriptions').select('endpoint');
  const savedEndpoints = (saved.data ?? []).map((row: { endpoint: string }) => row.endpoint);

  const available = availability();
  const subscription = available === 'available' ? await currentSubscription() : null;
  const endpoint = subscription && savedEndpoints.includes(subscription.endpoint) ? subscription.endpoint : null;
  const otherDevices = savedEndpoints.filter((other) => other !== endpoint).length;

  if (available !== 'available') return { status: available, endpoint: null, otherDevices };
  if (Notification.permission === 'denied') return { status: 'blocked', endpoint: null, otherDevices };
  if (endpoint && Notification.permission === 'granted') return { status: 'on', endpoint, otherDevices };
  return { status: 'off', endpoint: null, otherDevices };
}

export function usePush(supabase: SupabaseClient) {
  const [state, setState] = useState<{ status: PushStatus; endpoint: string | null; otherDevices: number }>({
    status: 'loading',
    endpoint: null,
    otherDevices: 0,
  });
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
        if (active) setState({ status: 'unsupported', endpoint: null, otherDevices: 0 });
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
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) throw new Error('Push notifications aren’t set up on this site yet.');

      // Ask first, while the tap still counts as the rider's: iPhones only show the prompt then.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((previous) => ({ ...previous, status: permission === 'denied' ? 'blocked' : 'off' }));
        return;
      }

      const endpoint = await subscribeThisDevice();
      setState((previous) => ({ ...previous, status: 'on', endpoint }));
      trackEvent('Push turned on');
    });

  const turnOff = () =>
    run(async () => {
      const subscription = await currentSubscription();
      const endpoint = subscription?.endpoint ?? state.endpoint;
      if (endpoint) {
        const removed = await removePushDeviceAction(endpoint);
        if (removed.error) throw new Error(removed.error);
      }
      await subscription?.unsubscribe();
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
