/** Latin and Cyrillic letters to plain ASCII for a category address the administrator names. */
const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** `Āra mēbeles` → `ara-mebeles`, `Садовая мебель` → `sadovaya-mebel`; empty when nothing is left. */
export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
}

/** `base`, or `base-2`, `base-3`… — the first one not in `taken`. */
export function freeSlug(base: string, taken: ReadonlySet<string>): string {
  const start = base || 'category';
  if (!taken.has(start)) return start;
  for (let n = 2; ; n++) if (!taken.has(`${start}-${n}`)) return `${start}-${n}`;
}
