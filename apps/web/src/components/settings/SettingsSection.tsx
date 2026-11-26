import type { ReactNode } from 'react';
import { Sheet } from '@/components/ui/Sheet';

/** One block of the settings: a sheet with its heading at the block step and a line on what it is for. */
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
    <Sheet className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="type-block">{title}</h2>
        {intro && <p className="text-ink/75 max-w-read leading-relaxed">{intro}</p>}
      </header>
      {children}
    </Sheet>
  );
}
