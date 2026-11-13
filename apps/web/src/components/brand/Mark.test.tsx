import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Mark } from './Mark';

describe('Mark', () => {
  it('is the yo-yo on its string by default', () => {
    const { container } = render(<Mark />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('path[d^="M12 1"]')).not.toBeNull();
    expect(container.querySelector('circle')!.getAttribute('cy')).toBe('14');
  });

  it('drops the string for anything that spins, and turns about its own centre', () => {
    const { container } = render(<Mark string={false} />);
    expect(container.querySelector('path[d^="M12 1"]')).toBeNull();
    const c = container.querySelector('circle')!;
    expect([c.getAttribute('cx'), c.getAttribute('cy')]).toEqual(['12', '12']);
  });

  it('takes a size in pixels', () => {
    const { container } = render(<Mark size={36} />);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('36');
  });
});
