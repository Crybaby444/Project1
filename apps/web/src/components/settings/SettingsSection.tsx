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
    <section className="border-ink bg-surface rounded-card-xl flex flex-col gap-5 border p-6 sm:p-8">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl leading-tight font-bold">{title}</h2>
        {intro && <p className="leading-relaxed">{intro}</p>}
      </header>
      {children}
    </section>
  );
}
