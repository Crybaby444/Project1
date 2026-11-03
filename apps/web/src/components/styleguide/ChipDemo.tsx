'use client';

import type { StickerColor } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Chip } from '../ui/Chip';

const CHIPS: {
  key: 'chipTools' | 'chipGarden' | 'chipGames' | 'chipCamping';
  color: StickerColor;
}[] = [
  { key: 'chipTools', color: 'sun' },
  { key: 'chipGarden', color: 'mint' },
  { key: 'chipGames', color: 'violet' },
  { key: 'chipCamping', color: 'lavender' },
];

export function ChipDemo() {
  const t = useTranslations('styleguide');
  const [pressed, setPressed] = useState<Record<string, boolean>>({ chipTools: true });

  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map(({ key, color }) => (
        <Chip
          key={key}
          color={color}
          pressed={!!pressed[key]}
          onPressedChange={(next) => setPressed((prev) => ({ ...prev, [key]: next }))}
        >
          {t(key)}
        </Chip>
      ))}
    </div>
  );
}
