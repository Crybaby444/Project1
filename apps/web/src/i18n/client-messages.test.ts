import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import admin from '../../messages/admin/en.json';
import site from '../../messages/site/en.json';
import { clientMessages, SERVER_OR_SECTION_ONLY } from './client-messages';

describe('clientMessages', () => {
  const all = { ...en, ...site, ...admin } as Record<string, unknown>;
  const sent = clientMessages(all);

  it('leaves out the admin panel, the style guide and the texts only server pages render', () => {
    for (const ns of ['admin', 'styleguide', 'faq', 'howItWorks', 'legal', 'pages']) expect(sent).not.toHaveProperty(ns);
    expect(SERVER_OR_SECTION_ONLY).toContain('admin');
  });

  it('keeps everything the shared interface needs on every page', () => {
    for (const ns of ['header', 'nav', 'catalog', 'auth', 'errors', 'landing', 'footer', 'market']) expect(sent).toHaveProperty(ns);
  });
});
