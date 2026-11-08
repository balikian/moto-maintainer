// Where the sign-in routes (app/auth/callback, app/auth/confirm) send the
// rider afterwards.

/** Only allow redirects to paths on this site, e.g. "/garage", never "//evil.com" or "@evil.com". */
export function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/';
  }
  return next;
}

/**
 * The address the request came in on. Not request.url's: the dev server says
 * localhost there even when a phone reached it by the PC's address (the phone
 * app in development), and a redirect to localhost goes nowhere on the phone.
 */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(/:$/, '');
  return `${protocol}://${host}`;
}
