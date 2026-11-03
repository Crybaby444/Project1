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
