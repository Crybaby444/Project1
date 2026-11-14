'use client';

import dynamic from 'next/dynamic';

/** Loads the home's WebGL stage on the client only, so no other page (and no server render) pays for three.js. */
const HomeStage = dynamic(() => import('./stage/HomeStage'), { ssr: false });

export function HomeStageLoader() {
  return <HomeStage />;
}
