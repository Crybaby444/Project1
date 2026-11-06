import { LetterRise } from '@/components/motion/LetterRise';

type WordmarkProps = {
  className?: string;
  /** The hero version: the word rises in and its letters appear one after another on load. */
  animated?: boolean;
};

/** The "YOYO" wordmark in the display face; assistive tech reads it as "Yoyo". */
export function Wordmark({ className = '', animated = false }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="Yoyo"
      className={`font-display leading-[0.8] font-black tracking-normal uppercase ${className}`}
    >
      {animated ? <LetterRise text="YOYO" stagger={70} /> : 'YOYO'}
    </span>
  );
}
