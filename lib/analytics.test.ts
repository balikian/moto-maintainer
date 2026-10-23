import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { redactAnalyticsUrl } from './analytics';

describe('redactAnalyticsUrl', () => {
  it('hides share tokens and bike ids in the path', () => {
    assert.equal(
      redactAnalyticsUrl('https://swingarm.app/share/Zx81kQ2mNpL0vTr9aYbC4dEfGhJkMnOp'),
      'https://swingarm.app/share/[token]'
    );
    assert.equal(
      redactAnalyticsUrl('https://swingarm.app/history/89554252-60a1-497d-aa58-760a72ad2ec6'),
      'https://swingarm.app/history/[bike]'
    );
  });

  it('drops the query string and hash except the dashboard view', () => {
    assert.equal(redactAnalyticsUrl('https://swingarm.app/unsubscribe?token=abc123&type=tasks'), 'https://swingarm.app/unsubscribe');
    assert.equal(redactAnalyticsUrl('https://swingarm.app/auth/callback?code=secret#x'), 'https://swingarm.app/auth/callback');
    assert.equal(redactAnalyticsUrl('https://swingarm.app/?view=garage&log=service'), 'https://swingarm.app/?view=garage');
  });

  it('leaves public pages alone', () => {
    assert.equal(redactAnalyticsUrl('https://swingarm.app/help'), 'https://swingarm.app/help');
    assert.equal(redactAnalyticsUrl('https://swingarm.app/'), 'https://swingarm.app/');
  });

  it('strips the query from an address it can’t parse', () => {
    assert.equal(redactAnalyticsUrl('/unsubscribe?token=abc'), '/unsubscribe');
  });
});
