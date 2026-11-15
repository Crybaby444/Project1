'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Mark } from '@/components/brand/Mark';

/** The page's last move: the yo-yo reels you back to the top (it always comes back). */
export function BackUp() {
  const t = useTranslations('market.close');
  const [spin, setSpin] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setSpin(true);
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        setTimeout(() => setSpin(false), 900);
      }}
      className="group text-ink/80 hover:text-ink inline-flex items-center gap-3 text-[15px] font-semibold"
    >
      <span className={`grid size-12 place-items-center rounded-full border border-current transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 ${spin ? '-rotate-[720deg]' : ''}`}>
        <Mark size={20} string={false} />
      </span>
      {t('backUp')}
    </button>
  );
}
