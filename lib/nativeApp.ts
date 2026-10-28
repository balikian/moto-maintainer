import { Capacitor } from '@capacitor/core';

/**
 * True inside the SwingArm phone app (Capacitor's shell around the site), false
 * in a browser. Browser-only: call it in effects and event handlers, not while
 * rendering, or the server's HTML won't match.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
