'use server';

import { sendPush } from '../push';
import { testPush } from '../pushMessage';
import type { PushDevice } from '../reminders';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// This device's push address (see app/hooks/usePush.ts), saved for the
// signed-in rider so the daily reminder job can push to it.

function isDevice(value: unknown): value is PushDevice {
  const device = value as Partial<PushDevice> | null;
  return (
    typeof device?.endpoint === 'string' &&
    device.endpoint.startsWith('https://') &&
    device.endpoint.length <= 1000 &&
    typeof device.p256dh === 'string' &&
    device.p256dh.length > 0 &&
    device.p256dh.length <= 200 &&
    typeof device.auth === 'string' &&
    device.auth.length > 0 &&
    device.auth.length <= 100
  );
}

export async function savePushDeviceAction(device: PushDevice): Promise<ActionResult> {
  if (!isDevice(device)) return { error: 'This browser gave an unexpected push address.' };
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase.rpc('save_push_subscription', {
    push_endpoint: device.endpoint,
    push_p256dh: device.p256dh,
    push_auth: device.auth,
  });
  if (error) return { error: `Couldn't turn on push notifications: ${error.message}` };
  return {};
}

export async function removePushDeviceAction(endpoint: string): Promise<ActionResult> {
  if (typeof endpoint !== 'string') return {};
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  // Row-level security limits this to the rider's own devices.
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) return { error: `Couldn't turn off push notifications: ${error.message}` };
  return {};
}

/** Sends a test notification to this device. */
export async function sendTestPushAction(endpoint: string): Promise<ActionResult> {
  if (typeof endpoint !== 'string') return { error: 'Push notifications aren’t on for this device.' };
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('endpoint', endpoint)
    .maybeSingle();
  if (error) return { error: `Couldn't send a test: ${error.message}` };
  if (!data) return { error: 'Push notifications aren’t on for this device. Turn them off and on again.' };

  const sent = await sendPush(data, testPush());
  if (sent.gone) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    return { error: 'This device’s push address has expired. Turn push notifications off and on again.' };
  }
  if (sent.error) return { error: `Couldn't send a test: ${sent.error}` };
  return {};
}
