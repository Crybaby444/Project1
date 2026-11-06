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
});

afterEach(() => {
  cleanup();
});
