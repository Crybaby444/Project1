type WordmarkProps = {
  className?: string;
  as?: 'span' | 'h1';
};

/** "YOYO" set in the display face. */
export function Wordmark({ className = '', as: Tag = 'span' }: WordmarkProps) {
  return (
    <Tag aria-label="Yoyo" className={`font-display leading-[0.8] font-extrabold uppercase ${className}`}>
      <span aria-hidden="true">YOYO</span>
    </Tag>
  );
}
