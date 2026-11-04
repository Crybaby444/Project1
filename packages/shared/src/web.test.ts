import { describe, expect, it } from 'vitest';
import { isOAuthErrorCode, safeSitePath } from './web';

describe('safeSitePath', () => {
  it('keeps a path on the site, with its query', () => {
    expect(safeSitePath('/lv/items?page=2')).toBe('/lv/items?page=2');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '',
    'evil',
    '/\nx',
  ])('turns %j into /', (bad) => expect(safeSitePath(bad)).toBe('/'));
});

describe('isOAuthErrorCode', () => {
  it('knows only the codes the Google callback sends', () => {
    expect(isOAuthErrorCode('OAUTH_CANCELLED')).toBe(true);
    expect(isOAuthErrorCode('AUTH_BLOCKED')).toBe(true);
    expect(isOAuthErrorCode('RATE_LIMITED')).toBe(false);
    expect(isOAuthErrorCode(null)).toBe(false);
  });
});
