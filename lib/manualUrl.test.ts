import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPrivateAddress, parseManualUrl } from './manualUrl';

const errorOf = (value: string) => {
  const result = parseManualUrl(value);
  return 'error' in result ? result.error : null;
};

describe('parseManualUrl', () => {
  it('accepts public web links', () => {
    assert.equal(errorOf('https://www.husqvarna-motorcycles.com/manuals/norden-901.pdf'), null);
    assert.equal(errorOf('  http://example.com/manual.pdf  '), null);
    assert.equal(errorOf('https://8.8.8.8/manual.pdf'), null);
  });

  it('refuses other schemes, credentials and odd ports', () => {
    assert.ok(errorOf('file:///etc/passwd'));
    assert.ok(errorOf('ftp://example.com/manual.pdf'));
    assert.ok(errorOf('https://user:pass@example.com/manual.pdf'));
    assert.ok(errorOf('https://example.com:8080/manual.pdf'));
    assert.ok(errorOf('not a link'));
  });

  it('refuses private hosts and addresses', () => {
    assert.ok(errorOf('http://localhost/manual.pdf'));
    assert.ok(errorOf('http://127.0.0.1/manual.pdf'));
    assert.ok(errorOf('http://169.254.169.254/latest/meta-data'));
    assert.ok(errorOf('http://10.1.2.3/manual.pdf'));
    assert.ok(errorOf('http://[::1]/manual.pdf'));
    assert.ok(errorOf('http://printer.local/manual.pdf'));
  });
});

describe('isPrivateAddress', () => {
  it('flags non-public IPv4 ranges', () => {
    for (const address of ['0.0.0.0', '10.0.0.1', '127.0.0.1', '100.64.0.1', '169.254.1.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '198.18.0.1', '224.0.0.1']) {
      assert.equal(isPrivateAddress(address), true, address);
    }
  });

  it('passes public IPv4 addresses', () => {
    for (const address of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '151.101.1.69']) {
      assert.equal(isPrivateAddress(address), false, address);
    }
  });

  it('handles IPv6, including IPv4 written inside it', () => {
    assert.equal(isPrivateAddress('::1'), true);
    assert.equal(isPrivateAddress('fd00::1'), true);
    assert.equal(isPrivateAddress('fe80::1'), true);
    assert.equal(isPrivateAddress('::ffff:10.0.0.1'), true);
    assert.equal(isPrivateAddress('2606:4700:4700::1111'), false);
    assert.equal(isPrivateAddress('not-an-address'), true);
  });
});
