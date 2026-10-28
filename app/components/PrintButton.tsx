'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Printer } from 'lucide-react';
import { ui } from './ui';

/** The Android app's own plugin (android/app/.../PrintPlugin.java): web views ignore window.print(). */
const Print = registerPlugin<{ print(options: { name: string }): Promise<void> }>('Print');

/** The page title without " · SwingArm", as the PDF's suggested name. */
const printName = () => document.title.replace(/\s*·\s*SwingArm$/, '') || 'SwingArm';

export default function PrintButton() {
  const print = () => {
    if (Capacitor.isPluginAvailable('Print')) {
      Print.print({ name: printName() }).catch(() => window.print());
    } else {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={print}
      className={ui.primaryButton}
    >
      <Printer size={16} />
      Print / Save as PDF
    </button>
  );
}
