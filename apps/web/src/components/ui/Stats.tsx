'use client';

import type { ReactNode } from 'react';
import { useCountUp } from '@/lib/motion/use-count-up';

/** A whole number (or, with `format`, money or a percentage) that counts up as it arrives. */
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const shown = Math.round(useCountUp(value));
  return <>{format ? format(shown) : shown}</>;
}

/** One figure of a page's summary row, on a sheet: its name, the figure, a note, room for a small drawing. */
export function StatCard({ label, value, notes = [], children }: { label: string; value: ReactNode; notes?: string[]; children?: ReactNode }) {
  return (
    <div className="sheet border-ink/15 rounded-media flex flex-col gap-1 border p-5">
      <dt className="text-ink/70 text-sm font-semibold">{label}</dt>
      <dd className="font-display text-display-m leading-none font-black tabular-nums">{value}</dd>
      {notes.map((note) => (
        <dd key={note} className="text-ink/70 text-sm">
          {note}
        </dd>
      ))}
      {children && <dd className="mt-auto pt-3">{children}</dd>}
    </div>
  );
}
