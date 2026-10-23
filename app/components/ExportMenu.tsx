'use client';

import { useRef, useState } from 'react';
import { Download, FileDown, Printer } from 'lucide-react';
import { buildServiceHistoryCsv, historyFileName } from '@/lib/historyExport';
import type { Motorcycle, ServiceLog, UnitSystem } from '@/lib/types';
import { useDismiss } from '../hooks/useDismiss';
import { downloadFile } from './download';
import { ui } from './ui';

type ExportMenuProps = {
  bike: Motorcycle;
  logs: ServiceLog[];
  unitSystem: UnitSystem;
};

const menuItemClass =
  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-raised';

function downloadCsv(bike: Motorcycle, logs: ServiceLog[], unitSystem: UnitSystem) {
  downloadFile(historyFileName(bike, 'csv'), buildServiceHistoryCsv(bike, logs, unitSystem), 'text/csv;charset=utf-8');
}

export default function ExportMenu({ bike, logs, unitSystem }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useDismiss(wrapperRef, isOpen, () => setIsOpen(false));

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setIsOpen((previous) => !previous)} className={ui.chipButton} aria-expanded={isOpen}>
        <FileDown size={15} />
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
            <Download size={15} className="text-accent" /> Download spreadsheet (CSV)
          </button>
          <a
            href={`/history/${bike.id}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className={menuItemClass}
          >
            <Printer size={15} className="text-accent" /> Print / Save as PDF
          </a>
        </div>
      )}
    </div>
  );
}
