/** Script and style blocks: their content is code, not text, so it goes with the tags. */
const CODE_BLOCKS = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const TAGS = /<\/?[a-z!?][^>]*>/gi;
/** A `<` that could still open a tag (`<img`, `</`, `<!`); a comparison such as `2 < 4` stays. */
const TAG_OPENERS = /<(?=[a-z/!?])/gi;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/**
 * Plain text from user input: HTML tags, comments and script/style blocks removed, control characters
 * dropped, line breaks normalized to `\n` with at most one empty line in a row, and trimmed. Applied to
 * every text a user writes into a listing, so stored text never carries markup.
 */
export function cleanText(value: string): string {
  return value
    .replace(CODE_BLOCKS, '')
    .replace(COMMENTS, '')
    .replace(TAGS, '')
    .replace(TAG_OPENERS, '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
