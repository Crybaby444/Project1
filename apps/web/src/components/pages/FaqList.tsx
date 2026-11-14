'use client';

import { useEffect, useRef } from 'react';

export type FaqItem = { id: string; question: string; answer: string };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

/** Opens the question the address points at (`/faq#deposit`) and brings it into view. */
function useOpenFromHash(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    function open() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const details = root.current?.querySelector<HTMLDetailsElement>(`details[id="${CSS.escape(id)}"]`);
      if (!details) return;
      details.open = true;
      details.scrollIntoView?.({ block: 'start' });
    }
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [root]);
}

/**
 * Questions grouped by topic, each a native <details>: works with the keyboard and without JavaScript,
 * and only one answer of a group is open at a time (`name`). The "+" turns into "×" (transform only).
 */
export function FaqList({ groups, titled = true }: { groups: FaqGroup[]; /** Off when the page already names the list. */ titled?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useOpenFromHash(root);

  return (
    <div ref={root} className="flex flex-col gap-14">
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={titled ? `group-${group.id}` : undefined}
          className="flex flex-col gap-4"
        >
          {titled && (
            <h2 id={`group-${group.id}`} className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
              {group.title}
            </h2>
          )}
          <div className="border-ink/15 flex flex-col border-t">
            {group.items.map((item) => (
              <details
                key={item.id}
                id={item.id}
                name={`faq-${group.id}`}
                className="group border-ink/15 text-ink scroll-mt-6 border-b open:[&>summary_svg]:rotate-45"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg leading-snug font-bold transition-[padding] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:pl-1.5 sm:text-xl [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="border-ink/40 group-open:bg-ink group-open:text-canvas group-open:border-ink inline-grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-300"
                  >
                    <svg viewBox="0 0 24 24" className="size-5 transition-transform duration-250 ease-yoyo" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="text-ink/85 max-w-[68ch] pb-6 text-base leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
