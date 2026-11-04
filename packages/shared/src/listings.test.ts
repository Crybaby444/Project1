import { describe, expect, it } from 'vitest';
import { ListingDraftSchema, ListingSubmitSchema, RULE_PRESETS } from './listings';

describe('ListingDraftSchema', () => {
  it('accepts an empty draft', () => {
    expect(ListingDraftSchema.parse({})).toEqual({});
  });

  it('cleans HTML out of every text, and an empty text clears the field', () => {
    const draft = ListingDraftSchema.parse({
      title: ' <b>Bosch</b> drill ',
      description: '<script>x</script>Works well',
      city: '',
      district: '<i>Centrs</i>',
      rules: { preset: ['NO_SMOKING'], custom: ['  <u>Bring</u> it back charged '] },
    });
    expect(draft).toEqual({
      title: 'Bosch drill',
      description: 'Works well',
      city: null,
      district: 'Centrs',
      rules: { preset: ['NO_SMOKING'], custom: ['Bring it back charged'] },
    });
  });

  it('keeps texts within their limits (a draft may still be short, never too long)', () => {
    const result = ListingDraftSchema.safeParse({ title: 'x'.repeat(81), description: 'x'.repeat(3001) });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((issue) => issue.path.join('.')).sort()).toEqual(['description', 'title']);
    expect(ListingDraftSchema.parse({ title: 'Dr' })).toEqual({ title: 'Dr' });
  });

  it('allows at most 5 own rules of 3–120 characters and only known presets, each once', () => {
    expect(ListingDraftSchema.safeParse({ rules: { preset: [], custom: ['ok!', 'a', 'x'.repeat(121)] } }).error!.issues.map((i) => i.path.join('.'))).toEqual([
      'rules.custom.1',
      'rules.custom.2',
    ]);
    expect(ListingDraftSchema.safeParse({ rules: { preset: [], custom: Array(6).fill('rule') } }).success).toBe(false);
    expect(ListingDraftSchema.safeParse({ rules: { preset: ['SING_LOUDLY'], custom: [] } }).success).toBe(false);
    expect(ListingDraftSchema.safeParse({ rules: { preset: ['PETS_OK', 'PETS_OK'], custom: [] } }).success).toBe(false);
    expect(RULE_PRESETS).toEqual(['ID_AT_PICKUP', 'RETURN_CLEAN', 'NO_SMOKING', 'PICKUP_ONLY', 'PETS_OK', 'CARE_INSTRUCTIONS']);
  });

  it('takes a point as lat and lng together, rounded to 6 decimals', () => {
    expect(ListingDraftSchema.parse({ lat: 56.94965123, lng: 24.1051899 })).toEqual({ lat: 56.949651, lng: 24.10519 });
    expect(ListingDraftSchema.parse({ lat: null, lng: null })).toEqual({ lat: null, lng: null });
    expect(ListingDraftSchema.safeParse({ lat: 56.9 }).success).toBe(false);
    expect(ListingDraftSchema.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
  });

  it('takes whole cents and days only, and a real time zone', () => {
    expect(ListingDraftSchema.safeParse({ dailyCents: 9.5 }).success).toBe(false);
    expect(ListingDraftSchema.safeParse({ minDays: 0 }).success).toBe(false);
    expect(ListingDraftSchema.safeParse({ timeZone: 'Mars/Olympus' }).success).toBe(false);
    expect(ListingDraftSchema.parse({ timeZone: 'Europe/Riga', dailyCents: 1500 })).toEqual({ timeZone: 'Europe/Riga', dailyCents: 1500 });
  });
});

describe('ListingSubmitSchema', () => {
  const complete = {
    title: 'Bosch drill',
    description: 'A strong drill for concrete and wood, two batteries.',
    condition: 'GOOD',
    categoryId: 'c1',
    dailyCents: 1500,
    city: 'Rīga',
    district: 'Centrs',
    lat: 56.95,
    lng: 24.1,
  };

  it('accepts a complete listing', () => {
    expect(ListingSubmitSchema.safeParse(complete).success).toBe(true);
  });

  it('names every missing or too short field', () => {
    const result = ListingSubmitSchema.safeParse({ ...complete, title: 'Dr', description: null, condition: null, lat: null, city: null });
    expect(result.error!.issues.map((issue) => issue.path.join('.')).sort()).toEqual(['city', 'condition', 'description', 'lat', 'title']);
  });
});
