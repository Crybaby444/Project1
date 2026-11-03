import type { StatusTone } from '@yoyo/shared';

const PATHS: Record<StatusTone, string> = {
  requested: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', // clock
  active: 'M5 12h14M13 6l6 6-6 6', // arrow
  deposit: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z', // lock
  dispute: 'M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', // warning
  completed: 'm5 12.5 4.5 4.5L19 7.5', // check
  cancelled: 'M7 7l10 10M17 7 7 17', // cross
};

/** Line icon that accompanies a StatusBadge tone (decorative: the badge text carries the meaning). */
export function StatusIcon({ tone }: { tone: StatusTone }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[tone]} />
    </svg>
  );
}
