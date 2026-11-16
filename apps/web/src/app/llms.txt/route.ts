import { categoryHref, categoryName } from '@/lib/catalog/categories';
import { loadCategories } from '@/lib/catalog/server-api';
import { llmsText } from '@/lib/llms';
import { siteOrigin } from '@/lib/seo';

export const revalidate = 3600;

/** /llms.txt: the site explained for AI assistants; without the API it still says what Yoyo is. */
export async function GET() {
  const origin = siteOrigin();
  const tree = await loadCategories();
  const roots = tree.ok ? tree.data.map((node) => ({ name: categoryName(node, 'en'), url: `${origin}${categoryHref(node, 'en')}` })) : [];
  return new Response(llmsText(origin, roots), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
