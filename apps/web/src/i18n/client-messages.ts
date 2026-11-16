/**
 * Namespaces the browser does not need on every page (SEO audit 2026-11-16: every page shipped all ~90 KB
 * of texts in its HTML). The admin panel and the style guide get them back through their own provider;
 * the FAQ, How it works, legal and page meta texts are only rendered on the server.
 */
export const SERVER_OR_SECTION_ONLY = ['admin', 'styleguide', 'faq', 'howItWorks', 'legal', 'pages', 'categoryIntro'] as const;

const LEFT_OUT = new Set<string>(SERVER_OR_SECTION_ONLY);

/** The texts the site-wide client provider passes to the browser. */
export function clientMessages<T extends Record<string, unknown>>(all: T): Partial<T> {
  return Object.fromEntries(Object.entries(all).filter(([ns]) => !LEFT_OUT.has(ns))) as Partial<T>;
}
