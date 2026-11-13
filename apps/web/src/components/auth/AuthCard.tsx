'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { LetterRise } from '@/components/motion/LetterRise';
import { Mark } from '@/components/brand/Mark';
import { displayFit } from '@/lib/display-fit';

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Links under the card ("No account yet? Sign up"). */
  footer?: ReactNode;
  /**
   * Moves the focus to the title on mount. For a card that replaces another after an action ("check
   * your email" after sending the form): otherwise the focus falls to the page and a screen reader
   * says nothing about the outcome.
   */
  focusTitle?: boolean;
};

/**
 * The calm frame of the sign-in screens (v16): no card, a centred column on the paper — the mark on its
 * string, a big display title, the form under a hairline. Motion: the column rises in, the letters follow.
 */
export function AuthCard({ title, subtitle, children, footer, focusTitle = false }: AuthCardProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <main className="flex flex-1 justify-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-[30rem] flex-col gap-6">
        <section data-card-rise="" className="relative flex flex-col gap-7">
          <header className="@container flex flex-col items-center gap-3 text-center">
            <Mark size={36} />
            <h1
              ref={titleRef}
              tabIndex={focusTitle ? -1 : undefined}
              style={displayFit(title, { max: '4.5rem' })}
              className="font-display text-display-fit leading-[0.85] font-black uppercase focus:outline-none"
            >
              <LetterRise text={title} stagger={18} />
            </h1>
            {subtitle && <p className="text-ink/75 max-w-[26em] text-base leading-relaxed">{subtitle}</p>}
          </header>
          <div aria-hidden="true" className="bg-ink/15 h-px" />
          {children}
        </section>
        {footer && <div className="flex flex-col items-center gap-2 text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}

/** An inline text link inside the auth screens: underlined, bold, with the focus ring. */
export const TEXT_LINK = 'font-bold underline underline-offset-4 decoration-1 hover:decoration-2 rounded-sm';
