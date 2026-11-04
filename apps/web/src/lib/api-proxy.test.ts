import { describe, expect, it } from 'vitest';
import { apiRequestHeaders, apiTarget, isApiPath, PROXY_SECRET_HEADER } from './api-proxy';

describe('isApiPath', () => {
  it('matches /api and everything below it, nothing else', () => {
    expect(isApiPath('/api')).toBe(true);
    expect(isApiPath('/api/v1/auth/login')).toBe(true);
    expect(isApiPath('/apiary')).toBe(false);
    expect(isApiPath('/lv/api')).toBe(false);
  });
});

describe('apiTarget', () => {
  it('keeps the path and query on the API origin', () => {
    expect(apiTarget('/api/v1/admin/users', '?page=2', 'https://yoyo-api.onrender.com/').toString()).toBe(
      'https://yoyo-api.onrender.com/api/v1/admin/users?page=2',
    );
  });
});

describe('apiRequestHeaders', () => {
  it('adds the proxy secret and keeps the visitor’s headers', () => {
    const headers = apiRequestHeaders(new Headers({ cookie: 'yoyo_at=x', 'x-forwarded-for': '198.51.100.7' }), 's3cret');
    expect(headers.get(PROXY_SECRET_HEADER)).toBe('s3cret');
    expect(headers.get('cookie')).toBe('yoyo_at=x');
    expect(headers.get('x-forwarded-for')).toBe('198.51.100.7');
  });

  it('never passes on a secret header sent by the visitor', () => {
    expect(apiRequestHeaders(new Headers({ [PROXY_SECRET_HEADER]: 'guess' }), undefined).has(PROXY_SECRET_HEADER)).toBe(false);
    expect(apiRequestHeaders(new Headers({ [PROXY_SECRET_HEADER]: 'guess' }), 'real').get(PROXY_SECRET_HEADER)).toBe('real');
  });

  it('leaves the incoming headers untouched', () => {
    const incoming = new Headers({ a: '1' });
    apiRequestHeaders(incoming, 's3cret');
    expect(incoming.has(PROXY_SECRET_HEADER)).toBe(false);
  });
});
