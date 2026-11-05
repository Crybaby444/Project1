import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { intersect, observedCount } from '@/test/intersection-observer';
import { stubMatchMedia } from '@/test/match-media';
import { renderWithIntl } from '@/test/render';
import { CountUp, easeOutCubic } from './CountUp';
import { coverProgress, useInView } from './hooks';
import { LetterRise } from './LetterRise';
import { Marquee } from './Marquee';
import { parallaxOffset, Parallax, Bob } from './Parallax';
import { Reveal } from './Reveal';
import { StickyStack } from './StickyStack';
import { Tilt, tiltToward } from './Tilt';
import { ToneSection } from './ToneSection';
import { splitWords, WordFill } from './WordFill';

function Probe({ once }: { once?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, once === undefined ? {} : { once });
  return (
    <div ref={ref} data-testid="probe">
      {inView ? 'seen' : 'not yet'}
    </div>
  );
}

/** Makes the browser look like one without CSS scroll-driven animations (Firefox, older Safari). */
function withoutScrollTimelines() {
  vi.stubGlobal('CSS', { supports: () => false });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useInView', () => {
  it('turns true when the element enters the viewport and, with once, stops watching', () => {
    render(<Probe />);
    const probe = screen.getByTestId('probe');
    expect(probe).toHaveTextContent('not yet');
    act(() => intersect(probe, true));
    expect(probe).toHaveTextContent('seen');
    expect(observedCount()).toBe(0);
    act(() => intersect(probe, false));
    expect(probe).toHaveTextContent('seen');
  });

  it('follows the element in and out when once is false', () => {
    render(<Probe once={false} />);
    const probe = screen.getByTestId('probe');
    act(() => intersect(probe, true));
    expect(probe).toHaveTextContent('seen');
    act(() => intersect(probe, false));
    expect(probe).toHaveTextContent('not yet');
  });

  it('counts the element as seen when the browser has no IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);
    expect(await screen.findByText('seen')).toBeInTheDocument();
  });

  it('disconnects when the component goes away', () => {
    const { unmount } = render(<Probe once={false} />);
    expect(observedCount()).toBe(1);
    unmount();
    expect(observedCount()).toBe(0);
  });
});

describe('Reveal', () => {
  it('is marked shown once it scrolls into view', () => {
    render(<Reveal>Deposit protected</Reveal>);
    const box = screen.getByText('Deposit protected');
    expect(box).toHaveAttribute('data-reveal');
    expect(box).not.toHaveAttribute('data-shown');
    act(() => intersect(box, true));
    expect(box).toHaveAttribute('data-shown');
  });

  it('is shown at once with reduced motion, without waiting for the viewport', () => {
    stubMatchMedia(true);
    render(<Reveal>Deposit protected</Reveal>);
    expect(screen.getByText('Deposit protected')).toHaveAttribute('data-shown');
  });
});

describe('WordFill', () => {
  it('splits text into words and keeps every space', () => {
    expect(splitWords('Rent  it. Return it.')).toEqual([
      { word: 'Rent', space: '  ' },
      { word: 'it.', space: ' ' },
      { word: 'Return', space: ' ' },
      { word: 'it.', space: '' },
    ]);
  });

  it('keeps the full text readable and numbers each word', () => {
    const text = 'Ņem, lieto, atdod — tas vienmēr atgriežas.';
    const { container } = render(<WordFill text={text} />);
    const paragraph = container.querySelector('[data-word-fill]')!;
    expect(paragraph).toHaveTextContent(text);
    const words = [...paragraph.querySelectorAll<HTMLElement>('[data-word]')];
    expect(words.map((word) => word.textContent)).toEqual(text.split(' '));
    expect(words[3]!.style.getPropertyValue('--i')).toBe('3');
    expect((paragraph as HTMLElement).style.getPropertyValue('--n')).toBe(String(words.length));
  });

  it('runs the scroll fallback where CSS scroll timelines are missing, but not with reduced motion', () => {
    withoutScrollTimelines();
    const { container, unmount } = render(<WordFill text="Rent it" />);
    expect(container.querySelector('[data-word-fill]')).toHaveAttribute('data-armed');
    unmount();
    stubMatchMedia(true);
    const reduced = render(<WordFill text="Rent it" />);
    expect(reduced.container.querySelector('[data-word-fill]')).not.toHaveAttribute('data-armed');
  });
});

describe('scroll maths', () => {
  it('measures progress through the viewport from 0 (just below) to 1 (just above)', () => {
    expect(coverProgress({ top: 800, height: 200 }, 800)).toBe(0);
    expect(coverProgress({ top: 300, height: 200 }, 800)).toBe(0.5);
    expect(coverProgress({ top: -200, height: 200 }, 800)).toBe(1);
    expect(coverProgress({ top: 5000, height: 200 }, 800)).toBe(0);
  });

  it('drifts a parallax layer symmetrically around the middle of the screen', () => {
    expect(parallaxOffset(0, 0.5)).toBe(60);
    expect(parallaxOffset(0.5, 0.5)).toBe(0);
    expect(parallaxOffset(1, 0.5)).toBe(-60);
    expect(parallaxOffset(1, -0.25)).toBe(30);
  });

  it('eases the counter out and clamps the time', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('Tilt', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };

  it('tips at most 4 degrees toward the pointer', () => {
    expect(tiltToward(rect, 200, 0)).toEqual({ rx: '4deg', ry: '4deg' });
    expect(tiltToward(rect, 100, 50)).toEqual({ rx: '0deg', ry: '0deg' });
    expect(tiltToward(rect, 999, 999)).toEqual({ rx: '-4deg', ry: '4deg' });
  });

  function placed() {
    render(
      <Tilt>
        <span>Drill</span>
      </Tilt>,
    );
    const box = screen.getByText('Drill').closest<HTMLElement>('[data-tilt]')!;
    box.getBoundingClientRect = () =>
      ({ ...rect, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    return box;
  }

  it('follows a mouse and settles when it leaves', () => {
    const box = placed();
    fireEvent.pointerMove(box, { clientX: 0, clientY: 100, pointerType: 'mouse' });
    expect(box.style.getPropertyValue('--ry')).toBe('-4deg');
    fireEvent.pointerLeave(box);
    expect(box.style.getPropertyValue('--ry')).toBe('0deg');
  });

  it('does not tilt for touch or with reduced motion', () => {
    const box = placed();
    fireEvent.pointerMove(box, { clientX: 0, clientY: 100, pointerType: 'touch' });
    expect(box.style.getPropertyValue('--ry')).toBe('');
    stubMatchMedia(true);
    fireEvent.pointerMove(box, { clientX: 0, clientY: 100, pointerType: 'mouse' });
    expect(box.style.getPropertyValue('--ry')).toBe('');
  });
});

describe('CountUp', () => {
  it('reads the final value to assistive tech and counts up from zero when seen', async () => {
    renderWithIntl(<CountUp value={1250} duration={50} />);
    const counter = document.querySelector<HTMLElement>('[data-count-up]')!;
    const shown = counter.querySelector('[data-count-value]')!;
    expect(counter.querySelector('.sr-only')).toHaveTextContent('1,250');
    expect(shown).toHaveTextContent('0');
    act(() => intersect(counter, true));
    await vi.waitFor(() => expect(shown).toHaveTextContent('1,250'));
  });

  it('formats in the page language', () => {
    stubMatchMedia(true);
    renderWithIntl(<CountUp value={1250} />, 'lv');
    expect(document.querySelector('[data-count-value]')!.textContent).toBe(
      new Intl.NumberFormat('lv').format(1250),
    );
  });

  it('shows the value straight away with reduced motion', () => {
    stubMatchMedia(true);
    renderWithIntl(<CountUp value={42} />);
    expect(document.querySelector('[data-count-value]')).toHaveTextContent('42');
  });
});

describe('LetterRise', () => {
  it('keeps the plain text and splits it into numbered letters, words kept whole', () => {
    render(
      <h1 aria-label="Pieteikties šeit">
        <LetterRise text="Pieteikties šeit" />
      </h1>,
    );
    const heading = screen.getByRole('heading', { name: 'Pieteikties šeit' });
    expect(heading.textContent).toBe('Pieteikties šeit');
    const letters = heading.querySelectorAll<HTMLElement>('[data-letter]');
    expect(letters).toHaveLength('Pieteiktiesšeit'.length);
    expect(letters[12]!.style.getPropertyValue('--i')).toBe('12');
    expect(letters[0]!.parentElement).toHaveClass('whitespace-nowrap');
  });
});

describe('StickyStack', () => {
  it('renders an ordered list with one pinned item per step', () => {
    render(
      <StickyStack label="How it works">
        <p>Find</p>
        <p>Book</p>
        <p>Return</p>
      </StickyStack>,
    );
    const items = screen.getAllByRole('listitem');
    expect(screen.getByRole('list', { name: 'How it works' })).toBeInTheDocument();
    expect(items.map((item) => item.style.getPropertyValue('--i'))).toEqual(['0', '1', '2']);
  });
});

describe('Marquee', () => {
  it('moves only while on screen, hides the copy, and pauses from one button', () => {
    renderWithIntl(<Marquee rows={[['Drill', 'Tent'], ['Kayak']]} />);
    const tracks = document.querySelectorAll('[data-marquee-row-track]');
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).not.toHaveAttribute('data-in-view');
    act(() => intersect(tracks[0]!.parentElement!, true));
    expect(tracks[0]).toHaveAttribute('data-in-view');

    const copy = tracks[0]!.querySelector('[data-marquee-copy]')!;
    expect(copy).toHaveAttribute('aria-hidden', 'true');
    expect(copy).toHaveAttribute('inert');
    expect(screen.getAllByText('Drill')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Pause the scrolling text' }));
    expect(tracks[0]).toHaveAttribute('data-paused');
    expect(tracks[1]).toHaveAttribute('data-paused');
  });
});

describe('Parallax and Bob', () => {
  it('only arms the scroll fallback when motion is welcome', () => {
    withoutScrollTimelines();
    const { container, unmount } = render(<Parallax speed={0.4}>sticker</Parallax>);
    const layer = container.querySelector<HTMLElement>('[data-parallax]')!;
    expect(layer).toHaveAttribute('data-armed');
    expect(layer.style.getPropertyValue('--speed')).toBe('0.4');
    unmount();
    stubMatchMedia(true);
    const reduced = render(<Parallax>sticker</Parallax>);
    expect(reduced.container.querySelector('[data-parallax]')).not.toHaveAttribute('data-armed');
  });

  it('bobs only while on screen', () => {
    const { container } = render(<Bob>sticker</Bob>);
    const bob = container.querySelector('[data-bob]')!;
    expect(bob).not.toHaveAttribute('data-in-view');
    act(() => intersect(bob, true));
    expect(bob).toHaveAttribute('data-in-view');
    act(() => intersect(bob, false));
    expect(bob).not.toHaveAttribute('data-in-view');
  });
});

describe('ToneSection', () => {
  it('leaves the morph to CSS where scroll timelines exist', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    render(<ToneSection tone="mint">Mint</ToneSection>);
    expect(observedCount()).toBe(0);
  });

  it('without scroll timelines, turns its colour layer on once its top passes the middle of the screen', () => {
    withoutScrollTimelines();
    render(
      <ToneSection tone="mint" aria-labelledby="t">
        <h2 id="t">Mint</h2>
      </ToneSection>,
    );
    const section = screen.getByRole('region', { name: 'Mint' });
    const layer = section.querySelector('[data-tone-layer]')!;
    expect(section.style.getPropertyValue('--tone-bg')).toBe('var(--tone-mint)');
    expect(layer).not.toHaveAttribute('data-active');
    act(() => intersect(section, true));
    expect(layer).toHaveAttribute('data-active');
    // Scrolled past: no longer intersecting the top half, but above it, so it stays on.
    act(() => intersect(section, false, -2000));
    expect(layer).toHaveAttribute('data-active');
    // Scrolled back below the middle.
    act(() => intersect(section, false, 2000));
    expect(layer).not.toHaveAttribute('data-active');
  });

  it('does not watch the scroll with reduced motion (the CSS shows a flat band)', () => {
    withoutScrollTimelines();
    stubMatchMedia(true);
    render(<ToneSection tone="sun">Sun</ToneSection>);
    expect(observedCount()).toBe(0);
  });
});
