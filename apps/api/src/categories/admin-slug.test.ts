import { describe, expect, it } from 'vitest';
import { freeSlug, slugOf } from './admin-slug';

describe('category addresses from admin names', () => {
  it('turns Latvian and Russian names into plain ASCII', () => {
    expect(slugOf('Āra mēbeles')).toBe('ara-mebeles');
    expect(slugOf('Садовая мебель')).toBe('sadovaya-mebel');
    expect(slugOf('  E-bikes & scooters!  ')).toBe('e-bikes-scooters');
    expect(slugOf('★★★')).toBe('');
  });

  it('picks the first free address', () => {
    expect(freeSlug('tools', new Set(['tools', 'tools-2']))).toBe('tools-3');
    expect(freeSlug('', new Set())).toBe('category');
  });
});
