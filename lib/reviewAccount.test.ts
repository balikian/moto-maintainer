import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isReviewEmail } from './reviewAccount';

describe('isReviewEmail', () => {
  it('matches the review account however it is typed', () => {
    assert.equal(isReviewEmail('review@swingarm.app'), true);
    assert.equal(isReviewEmail('  Review@SwingArm.app '), true);
  });

  it("doesn't match other addresses", () => {
    assert.equal(isReviewEmail('rider@example.com'), false);
    assert.equal(isReviewEmail('review@swingarm.app.evil.com'), false);
    assert.equal(isReviewEmail(''), false);
  });
});
