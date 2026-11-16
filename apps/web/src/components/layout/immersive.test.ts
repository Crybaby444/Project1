import { describe, expect, it } from 'vitest';
import { isImmersive } from './immersive';

describe('isImmersive', () => {
  it('is the What is Yoyo page in every language, and nothing else', () => {
    for (const p of ['/what-is-yoyo', '/lv/what-is-yoyo', '/ru/what-is-yoyo', '/what-is-yoyo/']) expect(isImmersive(p)).toBe(true);
    for (const p of ['/', '/lv', '/faq', '/what-is-yoyo-not', '/c/what-is-yoyo']) expect(isImmersive(p)).toBe(false);
  });
});
