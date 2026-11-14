import { describe, expect, it } from 'vitest';
import { analyticsScript, validGaId } from './Analytics';

describe('Analytics', () => {
  it('runs only with a real GA4 measurement id', () => {
    expect(validGaId('')).toBeNull();
    expect(validGaId('G-ABC123XYZ')).toBe('G-ABC123XYZ');
    expect(validGaId('G-1");alert(1)//')).toBeNull();
  });

  it('starts in Consent Mode with everything denied unless the visitor already agreed', () => {
    const script = analyticsScript('G-ABC123XYZ');
    expect(script).toContain("gtag('consent','default'");
    expect(script).toContain("analytics_storage:c==='granted'?'granted':'denied'");
    expect(script).toContain("ad_storage:'denied'");
    expect(script.indexOf("'consent','default'")).toBeLessThan(script.indexOf("'config'"));
  });
});
