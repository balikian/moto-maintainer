import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanJob, cleanJobLinks, estimatedTotal, jobInput, linkLabel, splitJobs } from './jobs';
import type { BikeJob } from './types';

const blank = jobInput();

const job = (id: string, kind: BikeJob['kind'], created_at: string, estimated_cost: number | null = null): BikeJob => ({
  id,
  user_id: 'rider',
  motorcycle_id: 'bike',
  kind,
  name: id,
  notes: null,
  estimated_cost,
  links: [],
  created_at,
});

describe('cleanJob', () => {
  it('trims fields, turns blanks into null and completes links', () => {
    assert.deepEqual(
      cleanJob({
        ...blank,
        kind: 'upgrade',
        name: '  Crash   bars ',
        notes: ' Black, not silver\n',
        estimatedCost: '$1,249.999',
        links: [
          { url: 'revzilla.com/crash-bars?utm_source=x', label: ' SW-Motech ' },
          { url: '', label: '' },
          { url: 'https://www.google.com/url?q=https://twistedthrottle.com/bars', label: '' },
        ],
      }),
      {
        job: {
          kind: 'upgrade',
          name: 'Crash bars',
          notes: 'Black, not silver',
          estimated_cost: 1250,
          links: [
            { url: 'https://revzilla.com/crash-bars', label: 'SW-Motech' },
            { url: 'https://twistedthrottle.com/bars', label: null },
          ],
        },
      }
    );
  });

  it('keeps a blank cost and notes as null', () => {
    assert.deepEqual(cleanJob({ ...blank, name: 'Cracked mirror' }), {
      job: { kind: 'repair', name: 'Cracked mirror', notes: null, estimated_cost: null, links: [] },
    });
  });

  it('says what is wrong', () => {
    assert.ok('error' in cleanJob({ ...blank, kind: 'mod', name: 'Exhaust' }));
    assert.ok('error' in cleanJob({ ...blank, name: '   ' }));
    assert.ok('error' in cleanJob({ ...blank, name: 'x'.repeat(201) }));
    assert.ok('error' in cleanJob({ ...blank, name: 'Exhaust', estimatedCost: 'lots' }));
    assert.ok('error' in cleanJob({ ...blank, name: 'Exhaust', estimatedCost: '-5' }));
    assert.ok('error' in cleanJob({ ...blank, name: 'Exhaust', links: [{ url: 'not a link', label: '' }] }));
    assert.ok('error' in cleanJob({ ...blank, name: 'Exhaust', links: [{ url: '', label: 'Akrapovič' }] }));
    assert.ok('error' in cleanJob({ ...blank, name: 'Exhaust', links: [{ url: 'javascript:alert(1)', label: '' }] }));
    const eleven = Array.from({ length: 11 }, (_, index) => ({ url: `shop.com/${index}`, label: '' }));
    assert.ok('error' in cleanJob({ ...blank, name: 'Exhaust', links: eleven }));
  });
});

describe('cleanJobLinks', () => {
  it('reads saved links, skipping anything unusable', () => {
    assert.deepEqual(
      cleanJobLinks([
        { url: 'https://example.com/a', label: 'A' },
        { url: 'ftp://example.com/b' },
        'https://example.com/c',
        null,
        { url: 'example.com/d', label: 7 },
      ]),
      [
        { url: 'https://example.com/a', label: 'A' },
        { url: 'https://example.com/d', label: null },
      ]
    );
    assert.deepEqual(cleanJobLinks(null), []);
    assert.deepEqual(cleanJobLinks({ url: 'https://example.com' }), []);
  });
});

describe('jobInput', () => {
  it('fills the form from a saved job', () => {
    assert.deepEqual(jobInput({ ...job('Exhaust', 'upgrade', '2026-11-01'), estimated_cost: 899, links: [{ url: 'https://a.com/x', label: null }] }), {
      kind: 'upgrade',
      name: 'Exhaust',
      notes: '',
      estimatedCost: '899',
      links: [{ url: 'https://a.com/x', label: '' }],
    });
    assert.equal(jobInput(null, 'upgrade').kind, 'upgrade');
  });
});

describe('linkLabel', () => {
  it('uses the label, else the site', () => {
    assert.equal(linkLabel({ url: 'https://www.revzilla.com/x', label: 'Slip-on, $899' }), 'Slip-on, $899');
    assert.equal(linkLabel({ url: 'https://www.revzilla.com/x', label: null }), 'revzilla.com');
  });
});

describe('splitJobs', () => {
  it('lists open repairs, then upgrades, oldest first; done ones newest first', () => {
    const jobs = [
      job('exhaust', 'upgrade', '2026-10-01'),
      job('mirror', 'repair', '2026-10-05'),
      job('grips', 'upgrade', '2026-09-01'),
      job('lever', 'repair', '2026-09-20'),
      job('bars', 'upgrade', '2026-08-01'),
    ];
    const logs = [
      { id: 'l1', job_id: 'lever', performed_at: '2026-10-02' },
      { id: 'l2', job_id: null, performed_at: '2026-10-03' },
      { id: 'l3', job_id: 'bars', performed_at: '2026-10-20' },
    ];
    const { open, done } = splitJobs(jobs, logs);
    assert.deepEqual(open.map((entry) => entry.id), ['mirror', 'grips', 'exhaust']);
    assert.deepEqual(done.map((entry) => [entry.job.id, entry.log.id]), [['bars', 'l3'], ['lever', 'l1']]);
  });
});

describe('estimatedTotal', () => {
  it('adds up the estimates there are', () => {
    assert.deepEqual(estimatedTotal([{ estimated_cost: 899.5 }, { estimated_cost: null }, { estimated_cost: 250.25 }]), { total: 1149.75, priced: 2 });
    assert.equal(estimatedTotal([{ estimated_cost: null }]), null);
  });
});
