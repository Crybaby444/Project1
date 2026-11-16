'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { isImmersive } from './immersive';

/** The site's frame (header, banners, tab bar, footer): left out on the immersive page. */
export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return isImmersive(pathname) ? null : children;
}
