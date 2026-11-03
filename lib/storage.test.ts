import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  batteryCheckAdvice,
  checkStoredOn,
  cleanStorageChecklist,
  guessBatteryType,
  roadChecklist,
  storageCheckInPeriod,
  storageChecklist,
  storageDuration,
} from './storage';

const today = new Date(2026, 10, 2); // November 2, 2026

describe('checklists', () => {
  it('gives lithium batteries a lithium-safe charger and no trickle charger', () => {
    const lithium = storageChecklist('lithium').find((item) => item.key === 'battery')!;
    assert.match(lithium.detail, /lithium-safe/);
    assert.match(lithium.label, /disconnect/);
    const standard = storageChecklist('standard').find((item) => item.key === 'battery')!;
    assert.match(standard.label, /maintainer/);
    assert.doesNotMatch(standard.detail, /lithium/);
    assert.match(storageChecklist(null).find((item) => item.key === 'battery')!.detail, /If it’s lithium/);
  });

  it('keeps the two lists’ keys apart, and saves only known keys once', () => {
    const storageKeys = storageChecklist(null).map((item) => item.key);
    const roadKeys = roadChecklist(null).map((item) => item.key);
    assert.equal(new Set([...storageKeys, ...roadKeys]).size, storageKeys.length + roadKeys.length);
    assert.ok(roadKeys.every((key) => key.startsWith('road:')));
    assert.deepEqual(cleanStorageChecklist(['fuel', 'fuel', 'road:tires', 'made_up', 7]), ['fuel', 'road:tires']);
    assert.deepEqual(cleanStorageChecklist(null), []);
  });

  it('starts the road list with insurance', () => {
    assert.equal(roadChecklist(null)[0].key, 'road:insurance');
  });
});

describe('the storage day', () => {
  it('takes a real day that isn’t in the future', () => {
    const isFuture = (day: string) => day > '2026-11-02';
    assert.equal(checkStoredOn('2026-11-02', isFuture), '2026-11-02');
    assert.ok(typeof checkStoredOn('2026-11-03', isFuture) !== 'string');
    assert.ok(typeof checkStoredOn('2026-02-30', isFuture) !== 'string');
    assert.ok(typeof checkStoredOn(null, isFuture) !== 'string');
  });

  it('counts check-ins every four weeks', () => {
    assert.equal(storageCheckInPeriod('2026-10-06', today), 0); // 27 days
    assert.equal(storageCheckInPeriod('2026-10-05', today), 1); // 28 days
    assert.equal(storageCheckInPeriod('2026-09-07', today), 2); // 56 days
  });

  it('says how long it’s been', () => {
    assert.equal(storageDuration('2026-11-02', today), '0 weeks');
    assert.equal(storageDuration('2026-10-26', today), '1 week');
    assert.equal(storageDuration('2026-10-05', today), '4 weeks');
    assert.equal(storageDuration('2026-07-02', today), '4 months');
    assert.equal(storageDuration('2025-10-01', today), '1 year');
  });
});

describe('battery', () => {
  it('guesses lithium from the battery spec', () => {
    assert.equal(guessBatteryType('Shido LTZ10S Lithium'), 'lithium');
    assert.equal(guessBatteryType('LiFePO4 12V'), 'lithium');
    assert.equal(guessBatteryType('YTZ10S'), null);
    assert.equal(guessBatteryType(null), null);
  });

  it('asks about the maintainer, or the charge for lithium', () => {
    assert.match(batteryCheckAdvice('standard'), /maintainer/);
    assert.match(batteryCheckAdvice('lithium'), /lithium-safe charger/);
    assert.match(batteryCheckAdvice(null), /If it’s lithium/);
  });
});
