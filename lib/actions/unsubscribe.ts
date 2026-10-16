'use server';

import { createClient } from '../supabase/server';
import type { ActionResult } from './result';

const KINDS = ['daily', 'monthly', 'all'] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

/**
 * Turns off one kind of reminder email for the rider whose email this link
 * came from. Works signed out: the token in the link identifies them, and
 * `unsubscribe_reminders` checks it in the database.
 */
export async function unsubscribeAction(token: string, kind: string): Promise<ActionResult> {
  if (!isKind(kind) || !/^[0-9a-f-]{36}$/i.test(token)) return { error: 'This unsubscribe link isn’t complete.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('unsubscribe_reminders', { token, kind });
  if (error) return { error: `Couldn't turn the emails off: ${error.message}` };
  if (!data) return { error: 'This unsubscribe link isn’t valid any more. You can turn emails off in More, in the app.' };
  return {};
}
