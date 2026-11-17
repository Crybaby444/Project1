/**
 * The ranking of the home's "For you" (owner, 2026-11-16). A pure function, so the rule is tested and
 * read in one place:
 *   popularity = 1 + 2·favourites + 4·rental requests + rating·reviews, softened by age (newer counts more);
 *   interest   ×4 when the item's category is one the person looked at, saved or rented, ×2 when they
 *              follow its owner;
 *   variety    at most two items of one owner and three of one category among the first eight.
 */
export interface Candidate {
  id: string;
  ownerId: string;
  categoryId: string | null;
  publishedAt: Date | null;
  favorites: number;
  requests: number;
  rating: number | null;
  reviewCount: number;
}

export interface Interests {
  categories: ReadonlySet<string>;
  owners: ReadonlySet<string>;
}

export const FOR_YOU_SIZE = 12;
const FIRST = 8;

export function rankForYou(candidates: readonly Candidate[], interests: Interests, now: Date): string[] {
  const scored = candidates.map((c) => {
    const ageDays = c.publishedAt ? Math.max(0, (now.getTime() - c.publishedAt.getTime()) / 86_400_000) : 30;
    const popularity = (1 + 2 * c.favorites + 4 * c.requests + (c.rating ?? 0) * c.reviewCount) / Math.pow(ageDays + 2, 0.6);
    const interest = (c.categoryId && interests.categories.has(c.categoryId) ? 4 : 1) * (interests.owners.has(c.ownerId) ? 2 : 1);
    return { c, score: popularity * interest };
  });
  scored.sort((a, b) => b.score - a.score || (b.c.publishedAt?.getTime() ?? 0) - (a.c.publishedAt?.getTime() ?? 0) || a.c.id.localeCompare(b.c.id));

  // The first eight in three passes: both limits, then the owner limit only, then anything left.
  const ordered = scored.map(({ c }) => c);
  const picked: Candidate[] = [];
  const taken = new Set<string>();
  const perOwner = new Map<string, number>();
  const perCategory = new Map<string, number>();
  const take = (c: Candidate) => {
    picked.push(c);
    taken.add(c.id);
    perOwner.set(c.ownerId, (perOwner.get(c.ownerId) ?? 0) + 1);
    if (c.categoryId) perCategory.set(c.categoryId, (perCategory.get(c.categoryId) ?? 0) + 1);
  };
  const passes: ((c: Candidate) => boolean)[] = [
    (c) => (perOwner.get(c.ownerId) ?? 0) < 2 && (!c.categoryId || (perCategory.get(c.categoryId) ?? 0) < 3),
    (c) => (perOwner.get(c.ownerId) ?? 0) < 2,
    () => true,
  ];
  for (const allowed of passes) {
    for (const c of ordered) {
      if (picked.length >= FIRST) break;
      if (!taken.has(c.id) && allowed(c)) take(c);
    }
  }
  const rest = ordered.filter((c) => !taken.has(c.id));
  return [...picked, ...rest].slice(0, FOR_YOU_SIZE).map((c) => c.id);
}
