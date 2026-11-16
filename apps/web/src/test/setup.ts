// Polyfills first: they must exist before react-dom is imported below.
import './animation-event';
import './dialog';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { installIntersectionObserver } from './intersection-observer';
import { stubMatchMedia } from './match-media';

beforeEach(() => {
  stubMatchMedia(false);
  installIntersectionObserver();
  // The builder keeps unsent changes in the browser (lib/listings/draft-backup): each test starts clean.
  try {
    for (const key of Object.keys(window.localStorage)) if (key.startsWith('yoyo:draft:')) window.localStorage.removeItem(key);
  } catch {
    // no storage in this environment
  }
});

afterEach(() => {
  cleanup();
});
