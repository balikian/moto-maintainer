'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';
import { appLinkPath, notificationPath } from '@/lib/appLinks';
import { isNativeApp } from '@/lib/nativeApp';

/**
 * In the phone app, opens links meant for SwingArm in its web view: links to
 * the app (`app.swingarm://…`, see lib/appLinks.ts), today Google sign-in's
 * return from the in-app browser tab, and tapped notifications, which open
 * their page. Renders nothing; does nothing in a browser.
 */
export default function NativeAppLinks() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const listeners = [
      App.addListener('appUrlOpen', ({ url }) => {
        const path = appLinkPath(url);
        if (!path) return;
        // Closes the sign-in tab on iPhone; Android closes it on its own.
        Browser.close().catch(() => {});
        window.location.assign(path);
      }),
      // The plugin holds a tap that opened the app until this listener is added.
      PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const path = notificationPath(notification.data?.url);
        if (path) window.location.assign(path);
      }),
    ];
    return () => {
      for (const listener of listeners) void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
