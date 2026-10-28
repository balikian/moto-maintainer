'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { appLinkPath } from '@/lib/appLinks';
import { isNativeApp } from '@/lib/nativeApp';

/**
 * In the phone app, opens links meant for SwingArm (`app.swingarm://…`, see
 * lib/appLinks.ts) in its web view: today, Google sign-in's return from the
 * in-app browser tab. Renders nothing; does nothing in a browser.
 */
export default function NativeAppLinks() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const listener = App.addListener('appUrlOpen', ({ url }) => {
      const path = appLinkPath(url);
      if (!path) return;
      // Closes the sign-in tab on iPhone; Android closes it on its own.
      Browser.close().catch(() => {});
      window.location.assign(path);
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
