'use client';

import { useCallback, useRef, type CSSProperties, type ElementType } from 'react';
import { coverProgress, useReducedMotion, useScrollFallback, useScrollFrame } from './hooks';

type WordFillProps = {
  /** The statement, as plain text: it is split into words. */
  text: string;
  as?: ElementType;
  className?: string;
};

/** Splits text into words and the spaces between them, keeping every character. */
export function splitWords(text: string): { word: string; space: string }[] {
  return [...text.matchAll(/(\S+)(\s*)/g)].map(([, word = '', space = '']) => ({ word, space }));
}

/**
 * A big statement that starts pale and fills to ink word by word as it scrolls into view
 * (motion.css, `[data-word-fill]`). Only opacity changes, so nothing reflows and long Latvian or
 * Russian words wrap exactly as in plain text. The CSS scroll timeline drives it where supported;
 * elsewhere the scroll progress is written to `--wf-p` each frame while the text is on screen.
 * With reduced motion the text is plain ink.
 */
export function WordFill({ text, as: Tag = 'p', className = '' }: WordFillProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const fallback = useScrollFallback();
  const words = splitWords(text);

  const onFrame = useCallback((element: Element) => {
    const rect = element.getBoundingClientRect();
    // Filled by the time the text's middle reaches the middle of the screen (cover 50%).
    const progress = Math.min(1, coverProgress(rect, window.innerHeight) / 0.5);
    (element as HTMLElement).style.setProperty('--wf-p', progress.toFixed(3));
  }, []);
  useScrollFrame(ref, fallback && !reduced, onFrame);

  return (
    <Tag
      ref={ref}
      data-word-fill=""
      data-armed={fallback && !reduced ? '' : undefined}
      style={{ '--n': words.length } as CSSProperties}
      className={className}
    >
      {words.map(({ word, space }, index) => (
        <span key={index}>
          <span data-word="" style={{ '--i': index } as CSSProperties}>
            {word}
          </span>
          {space}
        </span>
      ))}
    </Tag>
  );
}
