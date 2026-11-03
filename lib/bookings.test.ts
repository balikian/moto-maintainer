import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bookedDates,
  bookingEvent,
  bookingIcs,
  bookingIsDue,
  bookingRequestMessage,
  bookingWhen,
  cleanBooking,
  formatBookingTime,
  googleCalendarHref,
  textHref,
} from './bookings';

const TASK_A = '11111111-1111-4111-8111-111111111111';
const TASK_B = '22222222-2222-4222-8222-222222222222';
const bike = { year: 2023, make: 'Husqvarna', model: 'Norden 901' };
const today = new Date(2026, 10, 2);

describe('cleanBooking', () => {
  it('keeps the day, a 24-hour time, known task ids once, and trimmed notes', () => {
    assert.deepEqual(
      cleanBooking({ bookedOn: '2026-11-14', bookedTime: '9:30', taskIds: [TASK_A, TASK_A, 'nope', 7], notes: ' Drop off early ', shopId: 's1' }),
      { booking: { booked_on: '2026-11-14', booked_time: '09:30', task_ids: [TASK_A], notes: 'Drop off early', shop_id: 's1' } }
    );
  });

  it('allows just the day, and turns down a missing day or an odd time', () => {
    assert.deepEqual(cleanBooking({ bookedOn: '2026-11-14', bookedTime: '', taskIds: [], notes: '', shopId: null }), {
      booking: { booked_on: '2026-11-14', booked_time: null, task_ids: [], notes: null, shop_id: null },
    });
    assert.ok('error' in cleanBooking({ bookedOn: '', bookedTime: '' }));
    assert.ok('error' in cleanBooking({ bookedOn: '2026-02-30', bookedTime: '' }));
    assert.ok('error' in cleanBooking({ bookedOn: '2026-11-14', bookedTime: '25:00' }));
  });
});

describe('when it is', () => {
  it('says today, tomorrow or the day, with the time', () => {
    assert.equal(formatBookingTime('09:30:00'), '9:30 AM');
    assert.equal(formatBookingTime('12:05'), '12:05 PM');
    assert.equal(formatBookingTime('00:15'), '12:15 AM');
    assert.equal(bookingWhen({ booked_on: '2026-11-02', booked_time: '14:00:00' }, today), 'Today, 2:00 PM');
    assert.equal(bookingWhen({ booked_on: '2026-11-03', booked_time: null }, today), 'Tomorrow');
    assert.equal(bookingWhen({ booked_on: '2026-11-14', booked_time: null }, today), 'Sat, Nov 14');
    assert.equal(bookingWhen({ booked_on: '2027-01-08', booked_time: null }, today), 'Fri, Jan 8, 2027');
  });

  it('is due from its day on', () => {
    assert.equal(bookingIsDue({ booked_on: '2026-11-02' }, today), true);
    assert.equal(bookingIsDue({ booked_on: '2026-10-30' }, today), true);
    assert.equal(bookingIsDue({ booked_on: '2026-11-03' }, today), false);
  });

  it('marks each task with its earliest booking', () => {
    const dates = bookedDates([
      { booked_on: '2026-12-01', task_ids: [TASK_A] },
      { booked_on: '2026-11-14', task_ids: [TASK_A, TASK_B] },
    ]);
    assert.equal(dates.get(TASK_A), '2026-11-14');
    assert.equal(dates.get(TASK_B), '2026-11-14');
  });
});

describe('asking the shop', () => {
  it('writes a message with the bike, odometer and work', () => {
    assert.equal(
      bookingRequestMessage({ bike, odometer: '5,200 mi', taskNames: ['Engine oil', 'Chain', 'Valve check'] }),
      'Hi, I’d like to book my 2023 Husqvarna Norden 901 (about 5,200 mi) in for service: Engine oil, Chain and Valve check. When could you fit it in?\n\nThanks!'
    );
    assert.equal(
      bookingRequestMessage({ bike, odometer: null, taskNames: [] }),
      'Hi, I’d like to book my 2023 Husqvarna Norden 901 in for service. When could you fit it in?\n\nThanks!'
    );
  });

  it('texts the number with the message filled in', () => {
    assert.equal(textHref('(425) 470-3484 ext 2', 'Hi there'), 'sms:4254703484?body=Hi%20there');
    assert.equal(textHref('--', 'Hi'), null);
  });
});

describe('calendar', () => {
  const event = bookingEvent({
    booking: { id: 'b1', booked_on: '2026-11-14', booked_time: '09:30', notes: 'Drop off early' },
    bike,
    shop: { name: 'Scarab Werks', phone: '(425) 470-3484', address: '12 Main St, Bend, OR' },
    taskNames: ['Engine oil', 'Chain'],
  });

  it('names the event and lists the work, the shop’s number and the notes', () => {
    assert.equal(event.title, 'Norden 901 service at Scarab Werks');
    assert.equal(event.details, 'Service: Engine oil, Chain\nScarab Werks: (425) 470-3484\nDrop off early\nBike: 2023 Husqvarna Norden 901');
    assert.equal(event.location, '12 Main St, Bend, OR');
  });

  it('links Google Calendar for an hour from the time, or the whole day', () => {
    const timed = new URL(googleCalendarHref(event));
    assert.equal(timed.searchParams.get('dates'), '20261114T093000/20261114T103000');
    assert.equal(timed.searchParams.get('location'), '12 Main St, Bend, OR');
    const allDay = new URL(googleCalendarHref({ ...event, bookedOn: '2026-12-31', bookedTime: null }));
    assert.equal(allDay.searchParams.get('dates'), '20261231/20270101');
  });

  it('writes an .ics event with a reminder the day before', () => {
    const ics = bookingIcs(event, new Date(Date.UTC(2026, 10, 2, 18, 0, 0)));
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /\r\nUID:b1@swingarm\.app\r\n/);
    assert.match(ics, /\r\nDTSTAMP:20261102T180000Z\r\n/);
    assert.match(ics, /\r\nDTSTART:20261114T093000\r\n/);
    assert.match(ics, /\r\nLOCATION:12 Main St\\, Bend\\, OR\r\n/);
    assert.match(ics, /\r\nTRIGGER:-P1D\r\n/);
    for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
    assert.match(bookingIcs({ ...event, bookedTime: null }), /\r\nDTSTART;VALUE=DATE:20261114\r\nDTEND;VALUE=DATE:20261115\r\n/);
  });
});
