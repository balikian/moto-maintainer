'use server';

import { sendPush } from '../push';
import { testPush } from '../pushMessage';
import type { PushDevice } from '../reminders';
import { getSignedInClient } from '../supabase/server';
import { SIGNED_OUT_ERROR, type ActionResult } from './result';

// This device's push address (see app/hooks/usePush.ts), saved for the
// signed-in rider so the daily reminder job can push to it: a browser's push
// subscription, or the phone app's Firebase token.

type WebPushAddress = { endpoint: string; p256dh: string; auth: string };

function isWebAddress(value: unknown): value is WebPushAddress {
  const device = value as Partial<WebPushAddress> | null;
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

/** Firebase tokens are letters, digits, colons, dashes and underscores (the database checks the same). */
const isAppToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,4096}$/.test(value);

export async function savePushDeviceAction(device: WebPushAddress): Promise<ActionResult> {
  if (!isWebAddress(device)) return { error: 'This browser gave an unexpected push address.' };
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

/** Saves the phone app's Firebase token. */
export async function saveAppPushDeviceAction(token: string): Promise<ActionResult> {
  if (!isAppToken(token)) return { error: 'The phone gave an unexpected notification address.' };
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { error } = await supabase.rpc('save_app_push_device', { device_token: token });
  if (error) return { error: `Couldn't turn on notifications: ${error.message}` };
  return {};
}

/** Deletes this device's address. `data` says whether the rider had one saved. */
export async function removePushDeviceAction(endpoint: string): Promise<ActionResult<boolean>> {
  if (typeof endpoint !== 'string') return { data: false };
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  // Row-level security limits this to the rider's own devices.
  const { data, error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).select('id');
  if (error) return { error: `Couldn't turn off push notifications: ${error.message}` };
  return { data: data.length > 0 };
}

/** Sends a test notification to this device. */
export async function sendTestPushAction(endpoint: string): Promise<ActionResult> {
  if (typeof endpoint !== 'string') return { error: 'Push notifications aren’t on for this device.' };
  const { supabase, user } = await getSignedInClient();
  if (!user) return { error: SIGNED_OUT_ERROR };

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('kind, endpoint, p256dh, auth')
    .eq('endpoint', endpoint)
    .maybeSingle<PushDevice>();
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
