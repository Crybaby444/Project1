import type { ReactNode } from 'react';

/** One card of the settings: surface, 1px outline, 40px corners, a plain heading. */
export function SettingsSection({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-ink/15 flex flex-col gap-5 border-t pt-8">
      <header className="flex flex-col gap-1.5">
        <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">{title}</h2>
        {intro && <p className="leading-relaxed">{intro}</p>}
      </header>
      {children}
    </section>
  );
}
