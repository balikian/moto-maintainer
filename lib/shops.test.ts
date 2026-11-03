import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanShop,
  directionsHref,
  mapsHref,
  normalizeWebsite,
  pastedLinkProblem,
  phoneHref,
  readAddress,
  readEmail,
  readPhone,
  readWebsite,
  shopInput,
  websiteLabel,
} from './shops';

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
          map_url: null,
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
      shop: { name: 'A', phone: null, email: null, address: null, website: null, notes: null, map_url: null },
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

describe('what Google copies', () => {
  it('reads a Call button’s tel: link as the number', () => {
    assert.equal(readPhone('tel:+15415551234'), '(541) 555-1234');
    assert.equal(readPhone('tel:541-555-1234'), '(541) 555-1234');
    assert.equal(readPhone('tel:+44%2020%207946%200958'), '+442079460958');
    assert.equal(readPhone('Phone: (541) 555-1234'), '(541) 555-1234');
    assert.equal(readPhone('541.555.1234'), '541.555.1234');
  });

  it('reads a mailto: link as the address', () => {
    assert.equal(readEmail('mailto:service@motoworks.com?subject=Hi'), 'service@motoworks.com');
  });

  it('unwraps Google’s redirect and drops utm_ tracking', () => {
    assert.equal(
      readWebsite('https://www.google.com/url?q=https://motoworks.com/service%3Futm_source%3Dgmb&sa=U&ved=2ah'),
      'https://motoworks.com/service'
    );
    assert.equal(readWebsite('https://motoworks.com/?utm_source=google&utm_medium=organic&page=2'), 'https://motoworks.com/?page=2');
    assert.equal(readWebsite('motoworks.com'), 'motoworks.com');
  });

  it('keeps a map link for Directions, with the address from it when it has one', () => {
    assert.deepEqual(
      readAddress('https://www.google.com/maps/place/Moto+Works,+12+Main+St,+Bend,+OR+97701/@44.05,-121.31,17z', 'Moto Works'),
      { address: '12 Main St, Bend, OR 97701', mapUrl: 'https://www.google.com/maps/place/Moto+Works,+12+Main+St,+Bend,+OR+97701/@44.05,-121.31,17z' }
    );
    assert.deepEqual(readAddress('https://maps.app.goo.gl/AbC123'), { address: '', mapUrl: 'https://maps.app.goo.gl/AbC123' });
    assert.deepEqual(readAddress('https://share.google/xyz'), { address: '', mapUrl: 'https://share.google/xyz' });
    assert.deepEqual(readAddress('https://maps.google.com/?q=44.05,-121.31'), { address: '', mapUrl: 'https://maps.google.com/?q=44.05,-121.31' });
  });

  it('joins a pasted address’s lines, and leaves other links alone', () => {
    assert.deepEqual(readAddress('Address: 12 Main St\nBend, OR 97701\n'), { address: '12 Main St, Bend, OR 97701', mapUrl: null });
    assert.equal(readAddress('https://example.com/maps').mapUrl, null);
  });

  it('explains that a link to Google’s search page has no number or address in it', () => {
    const search = 'https://www.google.com/search?hl=en-US&q=scarab%20werks&client=ms-android-tmus-us-rvc3';
    const errorOf = (result: ReturnType<typeof cleanShop>) => ('error' in result ? result.error : '');
    assert.match(errorOf(cleanShop({ ...blank, name: 'Scarab Werks', phone: search })), /tap Call/);
    assert.match(errorOf(cleanShop({ ...blank, name: 'Scarab Werks', address: search })), /not the address/);
    assert.equal(pastedLinkProblem('phone', '(541) 555-1234'), null);
    assert.equal(pastedLinkProblem('address', ''), null);
  });

  it('saves the cleaned values, and Directions prefers the map link', () => {
    const result = cleanShop({ ...blank, name: 'Moto Works', phone: 'tel:+15415551234', address: 'https://maps.app.goo.gl/AbC123' });
    assert.ok('shop' in result);
    assert.equal(result.shop.phone, '(541) 555-1234');
    assert.equal(result.shop.address, null);
    assert.equal(directionsHref(result.shop), 'https://maps.app.goo.gl/AbC123');
    assert.equal(directionsHref({ address: '12 Main St', map_url: null }), mapsHref('12 Main St'));
    assert.equal(directionsHref({ address: null, map_url: 'https://evil.example/' }), null);
  });
});
