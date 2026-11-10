// The app store reviewers' account. Google and Apple review the app signed
// in, but can't create accounts or receive our email codes, so this one
// account signs in with a password (made in Supabase: Authentication → Users
// → Add user, on each database; the password is only in the store consoles).
// Every other rider signs in without one.

export const REVIEW_EMAIL = 'review@swingarm.app';

/** Whether a typed email is the review account's: the sign-in form then asks for its password. */
export function isReviewEmail(email: string): boolean {
  return email.trim().toLowerCase() === REVIEW_EMAIL;
}
