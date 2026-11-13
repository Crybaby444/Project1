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
            <h2 id={`group-${group.id}`} className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-bold">
              {group.title}
            </h2>
          )}
          <div className="flex flex-col gap-3">
            {group.items.map((item) => (
              <details
                key={item.id}
                id={item.id}
                name={`faq-${group.id}`}
                className="group border-ink bg-surface text-ink rounded-media scroll-mt-6 border open:[&>summary_svg]:rotate-45"
              >
                <summary className="rounded-media flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg leading-snug font-bold transition-transform duration-150 ease-yoyo hover:-translate-y-0.5 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="border-ink bg-ink text-canvas inline-grid size-10 shrink-0 place-items-center rounded-full border"
                  >
                    <svg viewBox="0 0 24 24" className="size-5 transition-transform duration-250 ease-yoyo" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p className="max-w-[68ch] px-5 pb-5 text-base leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
