'use client';

import { useSyncExternalStore } from 'react';
import { installOption, type InstallOption } from '@/lib/install';
import { isNativeApp } from '@/lib/nativeApp';

// Chrome, Edge and Android browsers fire `beforeinstallprompt` once the site
// can be installed (it has a manifest, app/manifest.ts). The event can fire
// before More is open, so it's caught here as soon as the dashboard's code
// loads, and kept for More's Install button. Safari never fires it; iPhones
// get the Share-menu steps instead.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisVisit = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Hold the browser's own banner back; More offers Install instead.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedThisVisit = true;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const standalone = window.matchMedia('(display-mode: standalone)');
  standalone.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    standalone.removeEventListener('change', listener);
  };
}

function getSnapshot(): InstallOption {
  // Already an app; nothing to add to the Home Screen.
  if (isNativeApp()) return 'none';
  return installOption({
    runningInstalled:
      installedThisVisit ||
      window.matchMedia('(display-mode: standalone)').matches ||
      // iPhone and iPad Home Screen apps.
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    hasPrompt: deferredPrompt !== null,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

/** Shows the browser's install dialog. The event works once; the browser offers a new one later if it's dismissed. */
async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return;
  deferredPrompt = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') {
    installedThisVisit = true;
    notify();
  }
}

/** What More can offer for adding SwingArm to the Home Screen, and the Install action for browsers with a prompt. */
export function useInstallPrompt(): { option: InstallOption; install: () => Promise<void> } {
  const option = useSyncExternalStore(subscribe, getSnapshot, () => 'none' as const);
  return { option, install: promptInstall };
}
