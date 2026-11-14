import { describe, expect, it } from 'vitest';
import { REVIEW_TEXT, ReviewRequestSchema } from './reviews';

describe('ReviewRequestSchema', () => {
  it('takes 1–5 stars and a text of 10 to 1000 characters, trimmed', () => {
    expect(ReviewRequestSchema.parse({ rating: 5, text: '  Great, on time.  ' })).toEqual({ rating: 5, text: 'Great, on time.' });
    expect(ReviewRequestSchema.safeParse({ rating: 0, text: 'Great, on time.' }).success).toBe(false);
    expect(ReviewRequestSchema.safeParse({ rating: 6, text: 'Great, on time.' }).success).toBe(false);
    expect(ReviewRequestSchema.safeParse({ rating: 4.5, text: 'Great, on time.' }).success).toBe(false);
    expect(ReviewRequestSchema.safeParse({ rating: 5, text: 'short' }).success).toBe(false);
    expect(ReviewRequestSchema.safeParse({ rating: 5, text: 'x'.repeat(REVIEW_TEXT.max + 1) }).success).toBe(false);
  });

  it('takes an optional 1–5 star score for the item', () => {
    expect(ReviewRequestSchema.parse({ rating: 4, itemRating: 3, text: 'Worked fine, a bit worn.' }).itemRating).toBe(3);
    expect(ReviewRequestSchema.safeParse({ rating: 4, itemRating: 9, text: 'Worked fine, a bit worn.' }).success).toBe(false);
  });
});
