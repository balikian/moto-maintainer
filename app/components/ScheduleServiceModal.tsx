'use client';

import { useState, type SubmitEvent } from 'react';
import { Check, Copy, Mail, MessageSquare, Phone } from 'lucide-react';
import { BOOKING_NOTES_MAX, bookingRequestMessage, emailRequestHref, textHref, type BookingInput } from '@/lib/bookings';
import { todayIsoDate } from '@/lib/dates';
import { groupTasksByUrgency } from '@/lib/maintenance';
import { phoneHref, type ShopInput } from '@/lib/shops';
import { dueLabel } from '@/lib/taskLabels';
import type { MaintenanceTask, Motorcycle, ServiceBooking, Shop, UnitSystem } from '@/lib/types';
import { formatDistance } from '@/lib/units';
import Modal from './Modal';
import ShopPicker from './ShopPicker';
import { ui } from './ui';

type ScheduleServiceModalProps = {
  bike: Motorcycle;
  tasks: MaintenanceTask[];
  shops: Shop[];
  /** The booking being changed; omit to book a new one. */
  booking?: ServiceBooking;
  /** Starts ticked, when opened from a task's card. */
  task?: MaintenanceTask | null;
  unitSystem: UnitSystem;
  onAddShop: (input: ShopInput) => Promise<Shop | string>;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSubmit: (input: BookingInput) => Promise<string | null>;
};

const contactClass = `${ui.chipButton} min-h-11`;

/**
 * Book service for the bike: what to have done, where, and when. With a shop
 * that has a phone or email, a ready-made message asks it for a time first.
 */
export default function ScheduleServiceModal({
  bike,
  tasks,
  shops,
  booking,
  task,
  unitSystem,
  onAddShop,
  onClose,
  onSubmit,
}: ScheduleServiceModalProps) {
  const [today] = useState(() => new Date());
  const { needsAttention, healthy, noStart } = groupTasksByUrgency(tasks, bike.current_mileage, today);
  const dueIds = needsAttention.map(({ task: entry }) => entry.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => booking?.task_ids ?? (task ? [task.id] : dueIds));
  const [shopId, setShopId] = useState(() => {
    const wanted = booking ? booking.shop_id : bike.shop_id;
    return shops.some((shop) => shop.id === wanted) ? wanted! : '';
  });
  const [bookedOn, setBookedOn] = useState(booking?.booked_on ?? '');
  const [bookedTime, setBookedTime] = useState(booking?.booked_time?.slice(0, 5) ?? '');
  const [notes, setNotes] = useState(booking?.notes ?? '');
  // Written from the ticked tasks until the rider edits it.
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every task, most urgent first: a shop visit often takes care of more than what's due.
  const entries = [...needsAttention, ...healthy, ...noStart];
  const selectedNames = entries.filter(({ task: entry }) => selectedIds.includes(entry.id)).map(({ task: entry }) => entry.task_name);

  const shop = shops.find((candidate) => candidate.id === shopId) ?? null;
  const message =
    editedMessage ??
    bookingRequestMessage({
      bike,
      odometer: bike.current_mileage === null ? null : formatDistance(bike.current_mileage, unitSystem),
      taskNames: selectedNames,
    });
  const text = shop?.phone ? textHref(shop.phone, message) : null;
  const call = shop?.phone ? phoneHref(shop.phone) : null;

  const toggle = (id: string) =>
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((other) => other !== id) : [...previous, id]));

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Couldn’t copy the message. Select it and copy it instead.');
    }
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!bookedOn) {
      setError('Pick the day it’s booked for. Not booked yet? Ask the shop first, then come back.');
      return;
    }
    setSaving(true);
    setError(null);
    const submitError = await onSubmit({ bookedOn, bookedTime, taskIds: selectedIds, notes, shopId: shopId || null });
    setSaving(false);
    if (submitError) setError(submitError);
  };

  return (
    <Modal
      title={booking ? 'Change booking' : 'Schedule service'}
      description={booking ? undefined : `What to have done on the ${bike.model}, where and when.`}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className={ui.label}>What needs doing</legend>
          {entries.length === 0 ? (
            <p className="text-sm text-muted">This bike has no tasks yet. Say what you need in the notes.</p>
          ) : (
            <ul className={`divide-y divide-line ${ui.card}`}>
              {entries.map(({ task: entry, dueState }) => {
                const due = dueState.status === 'NoStart' ? null : dueLabel(dueState, unitSystem, entry.interval_mileage);
                return (
                  <li key={entry.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggle(entry.id)}
                        className="h-4 w-4 shrink-0 accent-brand"
                      />
                      <span className="min-w-0 flex-1 font-semibold">{entry.task_name}</span>
                      {due && (
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${
                            dueState.status === 'Healthy' ? 'text-muted' : dueState.status === 'Soon' ? 'text-warn' : 'text-danger'
                          }`}
                        >
                          {due.value} {due.caption}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <ShopPicker
          id="booking-shop"
          label="Where"
          value={shopId}
          onChange={setShopId}
          shops={shops}
          onAddShop={onAddShop}
          noneLabel="At home, or no shop"
        />

        {shop && (shop.phone || shop.email) && (
          <section aria-labelledby="ask-shop" className={`space-y-3 p-3.5 ${ui.card} bg-raised`}>
            <div>
              <h3 id="ask-shop" className={ui.subTitle}>Ask {shop.name} for a time</h3>
              <p className="mt-0.5 text-sm text-muted">Send this, then come back and save the day they give you.</p>
            </div>
            <textarea
              aria-label="Message to the shop"
              rows={4}
              value={message}
              onChange={(event) => setEditedMessage(event.target.value)}
              className={ui.input}
            />
            <div className="flex flex-wrap gap-2">
              {text && (
                <a href={text} className={contactClass}>
                  <MessageSquare size={15} aria-hidden="true" /> Text
                </a>
              )}
              {shop.email && (
                <a href={emailRequestHref(shop.email, bike, message)} className={contactClass}>
                  <Mail size={15} aria-hidden="true" /> Email
                </a>
              )}
              {call && (
                <a href={call} className={contactClass}>
                  <Phone size={15} aria-hidden="true" /> Call
                </a>
              )}
              <button type="button" onClick={() => void copyMessage()} className={contactClass}>
                {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </section>
        )}

        <fieldset>
          <legend className={ui.label}>When it’s booked</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="booking-date" className="mb-1 block text-xs font-semibold text-muted">Day</label>
              <input
                id="booking-date"
                type="date"
                value={bookedOn}
                min={booking ? undefined : todayIsoDate()}
                onChange={(event) => setBookedOn(event.target.value)}
                className={ui.input}
              />
            </div>
            <div>
              <label htmlFor="booking-time" className="mb-1 block text-xs font-semibold text-muted">
                Time <span className="font-normal">optional</span>
              </label>
              <input id="booking-time" type="time" value={bookedTime} onChange={(event) => setBookedTime(event.target.value)} className={ui.input} />
            </div>
          </div>
        </fieldset>

        <div>
          <label htmlFor="booking-notes" className={ui.label}>
            Notes <span className="font-normal text-muted">optional</span>
          </label>
          <textarea
            id="booking-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={BOOKING_NOTES_MAX}
            placeholder="Drop off the night before; ask about the rattle"
            className={ui.input}
          />
        </div>

        {error && <div className={ui.errorBox}>{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={`w-1/2 py-2.5 ${ui.secondaryButton}`}>
            {booking ? 'Cancel' : 'Close'}
          </button>
          <button type="submit" disabled={saving} className={`w-1/2 py-2.5 ${ui.primaryButton}`}>
            {saving ? 'Saving…' : booking ? 'Save changes' : 'Save booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
