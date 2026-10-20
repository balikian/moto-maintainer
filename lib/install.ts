// Adding SwingArm to the Home Screen (see app/hooks/useInstallPrompt.ts).

/**
 * iPhone, iPad or iPod, where adding to the Home Screen is done by hand from
 * the Share menu. iPads ask for desktop sites and say "Macintosh", so a Mac
 * with a touch screen counts too (real Macs have none).
 */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/**
 * What More can offer: nothing when SwingArm is already running as an
 * installed app or the browser can't install it, the browser's own install
 * prompt when it has given us one (Chrome, Edge, Android), or the Share-menu
 * steps on iPhone and iPad.
 */
export type InstallOption = 'installed' | 'prompt' | 'ios' | 'none';

export function installOption(state: {
  runningInstalled: boolean;
  hasPrompt: boolean;
  userAgent: string;
  maxTouchPoints: number;
}): InstallOption {
  if (state.runningInstalled) return 'installed';
  if (state.hasPrompt) return 'prompt';
  if (isIosDevice(state.userAgent, state.maxTouchPoints)) return 'ios';
  return 'none';
}
