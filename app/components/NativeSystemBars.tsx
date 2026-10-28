'use client';

import { useEffect } from 'react';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { isNativeApp } from '@/lib/nativeApp';

/**
 * In the phone app, keeps the status bar's and navigation bar's icons
 * readable on SwingArm's theme rather than the phone's: light icons while the
 * page is dark, dark icons while it's light. Follows the `dark` class on
 * <html>, which the boot script and usePreferences set. Renders nothing; does
 * nothing in a browser.
 */
export default function NativeSystemBars() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const root = document.documentElement;
    let applied: boolean | null = null;
    const apply = () => {
      const dark = root.classList.contains('dark');
      if (dark === applied) return;
      applied = dark;
      SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
