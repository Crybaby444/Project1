import type { ReactNode } from 'react';

// The real root layout is app/[locale]/layout.tsx. This pass-through exists because
// app/not-found.tsx (for paths outside any locale) needs a layout above it.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
