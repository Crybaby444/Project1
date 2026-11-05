/** Characters that could end the script element or confuse an HTML parser, as JSON escapes. */
const UNSAFE: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/** JSON for a script element: still the same JSON, but no text in it can close the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (char) => UNSAFE[char]!);
}

/** Structured data for search engines (schema.org), e.g. Organization or FAQPage. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
