'use client';

import type { StickerColor } from '@yoyo/shared';
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';

const COLORS: StickerColor[] = ['sun', 'mint', 'blue', 'violet'];

export function ChipDemo({ labels }: { labels: string[] }) {
  const [pressed, setPressed] = useState<boolean[]>(() => labels.map((_, i) => i === 0));

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label, i) => (
        <Chip
          key={label}
          color={COLORS[i % COLORS.length]}
          pressed={pressed[i] ?? false}
          onPressedChange={(next) => setPressed((prev) => prev.map((v, j) => (j === i ? next : v)))}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
}
