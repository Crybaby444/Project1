import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { Button } from './Button';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe('Button', () => {
  it('is busy and disabled while loading', () => {
    renderWithIntl(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('renders a link when given href', () => {
    renderWithIntl(<Button href="/catalog">Browse</Button>);
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/catalog');
  });

  it('defaults to type="button" so it never submits by accident', () => {
    renderWithIntl(<Button variant="ghost">Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button');
  });
});
