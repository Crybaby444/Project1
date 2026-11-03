import { themeInitScript } from './theme-script';

function run(cookie: string, prefersDark: boolean): string | undefined {
  document.documentElement.removeAttribute('data-theme');
  Object.defineProperty(document, 'cookie', { value: cookie, configurable: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: prefersDark }) as never;
  new Function(themeInitScript)();
  return document.documentElement.dataset.theme;
}

describe('themeInitScript', () => {
  it('follows the OS when nothing is saved', () => {
    expect(run('', true)).toBe('dark');
    expect(run('', false)).toBe('light');
  });

  it('respects a saved choice over the OS', () => {
    expect(run('yoyo-theme=light', true)).toBe('light');
    expect(run('other=1; yoyo-theme=dark', false)).toBe('dark');
  });

  it('treats garbage as "system"', () => {
    expect(run('yoyo-theme=purple', true)).toBe('dark');
  });
});
