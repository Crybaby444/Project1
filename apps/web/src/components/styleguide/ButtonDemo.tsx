'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export function ButtonDemo() {
  const t = useTranslations('styleguide');
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>{t('primary')}</Button>
      <Button variant="ghost">{t('ghost')}</Button>
      <Button size="lg">{t('large')}</Button>
      <Button loading>{t('loading')}</Button>
      <Button href="/" variant="ghost">
        {t('link')}
      </Button>
      <IconButton label={t('iconSave')} aria-pressed={saved} onClick={() => setSaved((v) => !v)}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill={saved ? 'var(--sticker-ember)' : 'none'}
          className="transition-[scale] duration-(--dur-base) ease-yoyo"
          style={{ scale: saved ? 1.12 : 1 }}
        >
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
      </IconButton>
    </div>
  );
}
