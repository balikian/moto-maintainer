'use client';

import { Printer } from 'lucide-react';
import { ui } from './ui';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={ui.primaryButton}
    >
      <Printer size={16} />
      Print / Save as PDF
    </button>
  );
}
