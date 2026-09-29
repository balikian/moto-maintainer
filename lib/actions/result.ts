// Shared return shape for server actions. Kept out of the 'use server' files,
// which may only export async functions.

export type ActionResult<T = null> = {
  data?: T;
  error?: string;
};

export const SIGNED_OUT_ERROR = 'You must be signed in to do that.';
