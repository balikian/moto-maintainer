import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanShop, mapsHref, normalizeWebsite, phoneHref, shopInput, websiteLabel } from './shops';

const blank = shopInput();

describe('cleanShop', () => {
  it('trims fields, turns blanks into null and completes the website', () => {
    assert.deepEqual(
      cleanShop({ ...blank, name: '  Moto   Works ', phone: ' (555) 123-4567 ', website: 'motoworks.com', notes: '  Ask for Sam\n' }),
      {
        shop: {
          name: 'Moto Works',
          phone: '(555) 123-4567',
          email: null,
          address: null,
          website: 'https://motoworks.com/',
          notes: 'Ask for Sam',
        },
      }
    );
  });

  it('needs a name', () => {
    assert.deepEqual(cleanShop({ ...blank, name: '   ', phone: '555-1234' }), { error: 'Please enter the shop’s name.' });
  });

  it('turns down a phone number without enough digits, an odd email or a website that isn’t one', () => {
    assert.ok('error' in cleanShop({ ...blank, name: 'A', phone: 'call me' }));
    assert.ok('error' in cleanShop({ ...blank, name: 'A', email: 'shop@' }));
    assert.ok('error' in cleanShop({ ...blank, name: 'A', website: 'javascript:alert(1)' }));
    assert.ok('error' in cleanShop({ ...blank, name: 'A', website: 'localhost' }));
  });

  it('ignores fields that aren’t text', () => {
    assert.deepEqual(cleanShop({ name: 'A', phone: 5551234, notes: {} }), {
      shop: { name: 'A', phone: null, email: null, address: null, website: null, notes: null },
    });
  });
});

describe('shop links', () => {
  it('dials the digits, with an extension after a pause', () => {
    assert.equal(phoneHref('(555) 123-4567'), 'tel:5551234567');
    assert.equal(phoneHref('+1 555.123.4567 ext. 12'), 'tel:+15551234567,12');
    assert.equal(phoneHref('555-1234 x3'), 'tel:5551234,3');
    assert.equal(phoneHref('--'), null);
  });

  it('only links http and https websites', () => {
    assert.equal(normalizeWebsite('http://example.com/service'), 'http://example.com/service');
    assert.equal(normalizeWebsite('ftp://example.com'), null);
    assert.equal(websiteLabel('https://www.example.com/service'), 'example.com');
  });

  it('searches the address on the map', () => {
    assert.equal(mapsHref('12 Main St, Bend, OR'), 'https://www.google.com/maps/search/?api=1&query=12%20Main%20St%2C%20Bend%2C%20OR');
  });
});
