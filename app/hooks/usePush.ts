'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { removePushDeviceAction, savePushDeviceAction, sendTestPushAction } from '@/lib/actions/push';
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

/** Turns push off here without asking: for signing out, so the next person on this device doesn't get this rider's reminders. Never throws. */
export async function turnOffPushOnThisDevice(): Promise<void> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await removePushDeviceAction(subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // Signing out goes ahead regardless.
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
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Push notifications aren’t set up on this site yet.');

      // Ask first, while the tap still counts as the rider's: iPhones only show the prompt then.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((previous) => ({ ...previous, status: permission === 'denied' ? 'blocked' : 'off' }));
        return;
      }

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
      setState((previous) => ({ ...previous, status: 'on', endpoint: subscription.endpoint }));
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
