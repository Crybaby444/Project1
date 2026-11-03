import type { StatusTone } from '@yoyo/shared';

const PATHS: Record<StatusTone, string> = {
  requested: 'M8 4v4l2.5 1.5M8 1.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13Z',
  active: 'M5 3.5 12 8l-7 4.5Z',
  deposit: 'M4 7h8v6.5H4ZM5.5 7V5a2.5 2.5 0 0 1 5 0v2',
  dispute: 'M8 2 14.5 13.5h-13ZM8 6.5v3M8 11.5v.2',
  completed: 'M3 8.5 6.5 12 13 4.5',
  cancelled: 'M4 4l8 8M12 4l-8 8',
};

export function StatusIcon({ tone }: { tone: StatusTone }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[tone]} />
    </svg>
  );
}
