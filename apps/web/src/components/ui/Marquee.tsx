type MarqueeProps = {
  items: string[];
  className?: string;
};

function Row({ items, hidden = false }: { items: string[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-center whitespace-nowrap">
          <span className="px-5">{item}</span>
          <span aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Full-bleed announcement strip: the only continuous motion on the site. Pauses on hover and
 * stands still under prefers-reduced-motion. The second copy makes the loop seamless.
 */
export function Marquee({ items, className = '' }: MarqueeProps) {
  return (
    <div
      className={`group border-marquee-bg bg-marquee-bg text-marquee-fg overflow-hidden border-y py-2.5 text-[12px] leading-none font-bold tracking-[0.032em] uppercase ${className}`}
    >
      <div
        data-marquee-track
        className="yoyo-marquee-track flex w-max group-hover:[animation-play-state:paused]"
      >
        <Row items={items} />
        <Row items={items} hidden />
      </div>
    </div>
  );
}
