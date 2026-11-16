import type { ReactNode } from 'react';
import { MySpaceNav } from '@/components/profile/MySpaceNav';

/** My profile: the same head and tabs over my items, favourites, following and shops. */
export default function MySpaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MySpaceNav />
      {children}
    </>
  );
}
