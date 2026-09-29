'use client';

import { useState } from 'react';
import { Download, FileDown, Link2, Printer } from 'lucide-react';
import { buildServiceHistoryCsv, historyFileName } from '@/lib/historyExport';
import type { Motorcycle, ServiceLog, UnitSystem } from '@/lib/types';
import { ui } from './ui';

type ExportMenuProps = {
  bike: Motorcycle;
  logs: ServiceLog[];
  unitSystem: UnitSystem;
  onShare: () => void;
};

const menuItemClass =
  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800';

function downloadCsv(bike: Motorcycle, logs: ServiceLog[], unitSystem: UnitSystem) {
  // The byte-order mark makes Excel read the file as UTF-8 (accents, symbols).
  const blob = new Blob(['﻿', buildServiceHistoryCsv(bike, logs, unitSystem)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = historyFileName(bike, 'csv');
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExportMenu({ bike, logs, unitSystem, onShare }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen((previous) => !previous)} className={ui.chipButton} aria-expanded={isOpen}>
        <FileDown size={14} className="text-amber-500" />
        Export
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full z-30 mt-2 w-56 p-2 ${ui.popover}`}>
          <button
            type="button"
            onClick={() => {
              downloadCsv(bike, logs, unitSystem);
              setIsOpen(false);
            }}
            className={menuItemClass}
          >
            <Download size={15} className="text-amber-500" /> Download spreadsheet (CSV)
          </button>
          <a
            href={`/history/${bike.id}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className={menuItemClass}
          >
            <Printer size={15} className="text-amber-500" /> Print / Save as PDF
          </a>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onShare();
            }}
            className={menuItemClass}
          >
            <Link2 size={15} className="text-amber-500" /> Share link…
          </button>
        </div>
      )}
    </div>
  );
}
