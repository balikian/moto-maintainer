// Server-only: sends the app's own emails (reminders) through Resend's API.
// Sign-in emails go through Supabase's SMTP settings instead. Needs
// RESEND_API_KEY, never prefixed with NEXT_PUBLIC_.

const FROM = 'SwingArm <noreply@swingarm.app>';

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  /** Resend ignores a repeat with the same key for 24 hours, so a retried run can't double-send. */
  idempotencyKey?: string;
};

export async function sendEmail(email: OutgoingEmail): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'RESEND_API_KEY is not set.' };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(email.idempotencyKey ? { 'Idempotency-Key': email.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: email.headers,
      }),
    });
    if (response.ok) return {};
    return { error: `Resend ${response.status}: ${(await response.text()).slice(0, 300)}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
