import { Fragment } from 'react';

interface MarqueeProps {
  items: string[];
  className?: string;
}

function Row({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <Fragment key={`${item}-${index}`}>
          <span className="px-5 whitespace-nowrap">{item}</span>
          <span aria-hidden="true" className="text-[10px]">
            ✦
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Full-bleed scrolling strip — the only continuous motion on the site.
 * Pauses on hover; does not move at all under prefers-reduced-motion.
 */
export function Marquee({ items, className = '' }: MarqueeProps) {
  return (
    <div
      className={`group/marquee overflow-hidden border-y border-marquee-bg bg-marquee-bg py-2.5 text-[12px] font-bold tracking-[0.032em] text-marquee-fg uppercase ${className}`}
    >
      <div
        data-marquee-track
        className="flex w-max animate-marquee group-hover/marquee:[animation-play-state:paused]"
      >
        <Row items={items} />
        <Row items={items} hidden />
      </div>
    </div>
  );
}
