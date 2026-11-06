/** Russian letters in Latin, the way people type them in addresses (`Инструменты` → `instrumenty`). */
const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * A text as a path segment (W03 §D): lowercase Latin letters and digits joined by hyphens, diacritics
 * dropped (`Spēļu konsoles` → `spelu-konsoles`), Cyrillic transliterated. Used for districts and
 * listing addresses; category slugs are written out in the catalog data.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => CYRILLIC[letter] ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Longest slug in a listing address. */
export const LISTING_SLUG_MAX = 60;

/** The slug part of `/listings/{id}-{slug}`: from the title, at most 60 characters, cut at a hyphen. */
export function listingSlug(title: string | null): string {
  const full = slugify(title ?? '');
  if (full.length <= LISTING_SLUG_MAX) return full || 'item';
  const cut = full.slice(0, LISTING_SLUG_MAX + 1);
  const lastHyphen = cut.lastIndexOf('-');
  return (lastHyphen > 20 ? cut.slice(0, lastHyphen) : full.slice(0, LISTING_SLUG_MAX)).replace(/-+$/, '');
}

/** `{id}-{slug}` → id and slug. Listing ids (cuid) have no hyphen, so the first one splits them. */
export function splitListingParam(param: string): { id: string; slug: string } {
  const at = param.indexOf('-');
  return at === -1 ? { id: param, slug: '' } : { id: param.slice(0, at), slug: param.slice(at + 1) };
}
