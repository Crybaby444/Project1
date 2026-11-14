import type { CategoryNode, Locale } from '@yoyo/shared';
import { Link } from '@/i18n/navigation';
import { categoryLink, categoryName } from '@/lib/catalog/categories';

/**
 * The catalog as a quiet index (v16, the layout the owner chose for the home's catalog): two columns of
 * rows — number, name in display type, the first two subcategories, an arrow. Hovering a row slides the
 * name and fills the hairline under it; the others step back.
 */
export function CategoryIndex({ roots, locale }: { roots: CategoryNode[]; locale: Locale }) {
  return (
    <ul className="group/index border-ink/15 m-0 grid list-none border-t p-0 sm:grid-cols-2 sm:gap-x-[clamp(24px,3vw,56px)]">
      {roots.map((root, i) => {
        const name = categoryName(root, locale);
        const subs = root.children.slice(0, 2).map((c) => categoryName(c, locale)).join(' · ');
        return (
          <li key={root.id} className="border-ink/15 border-b sm:[&:last-child:nth-child(odd)]:col-span-2">
            <Link
              href={categoryLink(root, locale)}
              title={name}
              className="group/row relative grid grid-cols-[2.2em_1fr_22px] items-center gap-3 py-5 after:absolute after:inset-x-0 after:-bottom-px after:h-[1.5px] after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-[600ms] after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:origin-left hover:after:scale-x-100 focus-visible:after:origin-left focus-visible:after:scale-x-100"
            >
              <span className="text-ink/60 self-start pt-[0.5em] text-xs font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="grid min-w-0 gap-1.5 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:translate-x-2.5">
                <span
                  data-cursor-text
                  className="font-display text-[clamp(1.6rem,8.4vw,2rem)] leading-[0.95] text-balance [overflow-wrap:anywhere] font-black uppercase transition-opacity duration-300 group-hover/index:opacity-40 group-hover/row:!opacity-100 sm:text-[clamp(1.7rem,2.3vw,2.6rem)]"
                >
                  {name}
                </span>
                {subs ? <span className="text-ink/60 truncate text-[13px] font-medium">{subs}</span> : null}
              </span>
              <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" className="size-[18px] transition-transform duration-500 group-hover/row:-rotate-45">
                <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
