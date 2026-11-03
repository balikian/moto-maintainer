'use client';

import { useId, useRef, useState } from 'react';
import { CalendarCheck, CalendarPlus, Check, Pencil, Trash2 } from 'lucide-react';
import { bookingEvent, bookingIcs, bookingIcsFileName, bookingIsDue, bookingTasks, bookingWhen, googleCalendarHref } from '@/lib/bookings';
import type { MaintenanceTask, Motorcycle, ServiceBooking, Shop } from '@/lib/types';
import { useDismiss } from '../hooks/useDismiss';
import ConfirmPopover from './ConfirmPopover';
import { downloadFile } from './download';
import ShopLinks from './ShopLinks';
import { ui } from './ui';

const menuItem =
  'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-bold text-fg transition-colors hover:bg-raised';

/** Add to calendar: Google Calendar's page, or an .ics file for any other calendar app. */
function CalendarMenu({ booking, bike, shop, taskNames }: { booking: ServiceBooking; bike: Motorcycle; shop: Shop | null; taskNames: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  useDismiss(wrapperRef, isOpen, () => setIsOpen(false));
  const event = bookingEvent({ booking, bike, shop, taskNames });

  const saveFile = async () => {
    setIsOpen(false);
    try {
      // In the Android app it lands in Downloads, so the button says so for a moment.
      if ((await downloadFile(bookingIcsFileName(booking.booked_on), bookingIcs(event), 'text/calendar')) === 'saved') {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch {
      // The share sheet was closed, or saving failed; nothing to undo.
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-controls={menuId} className={`${ui.chipButton} min-h-11`}>
        {saved ? <Check size={15} aria-hidden="true" /> : <CalendarPlus size={15} aria-hidden="true" />}
        <span aria-live="polite">{saved ? 'Saved to Downloads' : 'Add to calendar'}</span>
      </button>
      {isOpen && (
        <div id={menuId} className={`absolute left-0 top-full z-30 mt-1 flex w-56 flex-col p-1.5 ${ui.popover}`}>
          <a href={googleCalendarHref(event)} target="_blank" rel="noreferrer noopener" onClick={() => setIsOpen(false)} className={menuItem}>
            Google Calendar
          </a>
          <button type="button" onClick={() => void saveFile()} className={menuItem}>
            Other calendar (.ics file)
          </button>
        </div>
      )}
    </div>
  );
}

type BookedServiceProps = {
  bookings: ServiceBooking[];
  bike: Motorcycle;
  tasks: MaintenanceTask[];
  shops: Shop[];
  onLog: (booking: ServiceBooking) => void;
  onEdit: (booking: ServiceBooking) => void;
  onCancel: (booking: ServiceBooking) => void;
};

/** The bike's booked service, soonest first: when, where and what, with calendar, call and log buttons. */
export default function BookedService({ bookings, bike, tasks, shops, onLog, onEdit, onCancel }: BookedServiceProps) {
  const [today] = useState(() => new Date());
  if (bookings.length === 0) return null;

  return (
    <section aria-label="Booked service" className="grid grid-cols-1 gap-2.5">
      {bookings.map((booking) => {
        const shop = shops.find((candidate) => candidate.id === booking.shop_id) ?? null;
        const taskNames = bookingTasks(booking, tasks).map((task) => task.task_name);
        const due = bookingIsDue(booking, today);
        return (
          <article key={booking.id} className={`${ui.card} border-info/40 p-4`}>
            <div className="flex items-start gap-3">
              <CalendarCheck size={20} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-info">{due ? 'Booked: did it happen?' : 'Booked'}</p>
                <h3 className="text-lg font-extrabold leading-tight">
                  {bookingWhen(booking, today)}
                  {shop && <span className="font-bold text-muted"> · {shop.name}</span>}
                </h3>
                {taskNames.length > 0 && <p className="mt-1 text-sm">{taskNames.join(', ')}</p>}
                {booking.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted">{booking.notes}</p>}
              </div>
              <button type="button" onClick={() => onEdit(booking)} className={`${ui.iconButton} -mr-2 -mt-1.5 border-0 bg-transparent text-muted hover:text-fg`} aria-label="Change booking">
                <Pencil size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {due && (
                <button type="button" onClick={() => onLog(booking)} className={`${ui.primaryButton} min-h-11`}>
                  <Check size={15} aria-hidden="true" /> Log it
                </button>
              )}
              {!due && <CalendarMenu booking={booking} bike={bike} shop={shop} taskNames={taskNames} />}
              {shop && <ShopLinks shop={shop} compact />}
              <ConfirmPopover
                message={due ? 'Remove this booking? Nothing is logged.' : 'Cancel this booking? Let the shop know too.'}
                confirmLabel={due ? 'Remove' : 'Cancel booking'}
                onConfirm={() => onCancel(booking)}
              >
                {(open, popoverProps) => (
                  <button type="button" onClick={open} {...popoverProps} className={`${ui.chipButton} min-h-11 text-muted hover:text-danger`}>
                    <Trash2 size={15} aria-hidden="true" /> {due ? 'Remove' : 'Cancel'}
                  </button>
                )}
              </ConfirmPopover>
            </div>
          </article>
        );
      })}
    </section>
  );
}
