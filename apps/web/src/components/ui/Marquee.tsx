type MarqueeProps = {
  items: string[];
  className?: string;
};

function Track({ items, hidden }: { items: string[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex items-center gap-7 pr-7">
          {item}
          <span aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Full-bleed announcement band (DESIGN.md Marquee Banner). The only continuous motion on the site:
 * it pauses on hover and does not move at all for people who prefer reduced motion.
 */
export function Marquee({ items, className = '' }: MarqueeProps) {
  return (
    <div
      className={`group overflow-hidden bg-marquee py-2.5 text-xs font-bold tracking-[0.032em] whitespace-nowrap text-marquee-fg uppercase ${className}`}
    >
      <div data-marquee-track className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        <Track items={items} />
        <Track items={items} hidden />
      </div>
    </div>
  );
}
