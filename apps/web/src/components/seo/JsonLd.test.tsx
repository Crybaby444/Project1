import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonLd, serializeJsonLd } from './JsonLd';

describe('JsonLd', () => {
  it('writes the data as one application/ld+json script', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Organization', name: 'Yoyo' }} />);
    const scripts = container.querySelectorAll('script');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('type', 'application/ld+json');
    expect(JSON.parse(scripts[0]!.textContent ?? '')).toEqual({ '@type': 'Organization', name: 'Yoyo' });
  });

  it('cannot be broken out of by text in the data', () => {
    const name = '</script><script>alert(1)</script><!-- & \u2028';
    const text = serializeJsonLd({ name });
    expect(text).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(text)).toEqual({ name });

    const { container } = render(<JsonLd data={{ name }} />);
    expect(container.querySelectorAll('script')).toHaveLength(1);
    expect(JSON.parse(container.querySelector('script')!.textContent ?? '')).toEqual({ name });
  });
});
