/**
 * The first screen: only the word YOYO and the yo-yo hanging in front of it (drawn by the stage into
 * `data-anchor="hero-slot"`). Owner, 2026-11-16: nothing else on the opening, no line, no buttons.
 */
export function Hero() {
  return (
    <section data-home="hero" className="bg-canvas text-ink relative h-svh min-h-[620px] overflow-hidden">
      <h1
        aria-label="Yoyo"
        className="font-display absolute inset-x-0 top-[38%] m-0 flex -translate-y-1/2 justify-center text-[46vw] leading-[0.8] font-black whitespace-nowrap uppercase sm:top-[47%] sm:text-[clamp(9rem,43vw,56rem)]"
      >
        {/* Two halves, so the word can open like doors on scroll. */}
        {(['l', 'r'] as const).map((half) => (
          <span
            key={half}
            data-half={half}
            className="inline-block overflow-hidden pt-[0.04em]"
            aria-hidden="true"
          >
            <b data-letter className="inline-block font-black">
              Y
            </b>
            <b data-letter className="inline-block font-black">
              O
            </b>
          </span>
        ))}
      </h1>
      <div
        data-anchor="hero-slot"
        aria-hidden="true"
        className="absolute top-[44%] left-1/2 aspect-square w-[24vw] -translate-1/2 sm:top-[58%] sm:w-[min(25vh,19vw)]"
      />
    </section>
  );
}
