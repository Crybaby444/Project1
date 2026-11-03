// Polyfills first: they must exist before react-dom is imported below.
import './animation-event';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { stubMatchMedia } from './match-media';

beforeEach(() => {
  stubMatchMedia(false);
});

afterEach(() => {
  cleanup();
});
