import type { ReactNode } from 'react';
import { Sticker } from '@/components/ui/Sticker';

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Links under the card ("No account yet? Sign up"). */
  footer?: ReactNode;
};

/**
 * The calm frame of the sign-in screens (DESIGN.md §7): canvas, one surface card with a 1px outline
 * and 40px corners, the display face only in the title, and a single small sticker as the accent.
 */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="flex flex-1 justify-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-[30rem] flex-col gap-6">
        <section className="border-ink bg-surface rounded-card-xl relative flex flex-col gap-6 border p-6 sm:p-8">
          <Sticker kind="yoyo" size={52} className="absolute -top-6 right-6 rotate-12" />
          <header className="flex flex-col gap-2 pr-12">
            <h1 className="font-display text-[clamp(2rem,8vw,2.75rem)] leading-[0.85] font-black uppercase">
              {title}
            </h1>
            {subtitle && <p className="text-base leading-relaxed">{subtitle}</p>}
          </header>
          {children}
        </section>
        {footer && <div className="flex flex-col items-center gap-2 text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}

/** An inline text link inside the auth screens: underlined, bold, with the focus ring. */
export const TEXT_LINK = 'font-bold underline underline-offset-4 decoration-1 hover:decoration-2 rounded-sm';
