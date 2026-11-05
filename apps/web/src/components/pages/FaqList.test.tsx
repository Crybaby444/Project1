import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { FaqList, type FaqGroup } from './FaqList';

const GROUPS: FaqGroup[] = [
  {
    id: 'money',
    title: 'Money',
    items: [
      { id: 'cost', question: 'How much does it cost?', answer: 'Listing is free.' },
      { id: 'deposit', question: 'What about the deposit?', answer: 'It is frozen.' },
    ],
  },
  { id: 'account', title: 'Account', items: [{ id: 'delete', question: 'How do I delete it?', answer: 'In settings.' }] },
];

afterEach(() => window.history.replaceState(null, '', '/'));

describe('FaqList', () => {
  it('groups the questions under their headings, each closed at first', () => {
    render(<FaqList groups={GROUPS} />);
    const money = screen.getByRole('region', { name: 'Money' });
    expect(within(money).getAllByRole('group')).toHaveLength(2);
    expect(screen.getByText('Listing is free.')).not.toBeVisible();
  });

  // The keyboard (Enter / Space on the summary) is the browser's own; e2e/service-pages.spec.ts checks it.
  it('opens a question when its summary is pressed', async () => {
    const user = userEvent.setup();
    render(<FaqList groups={GROUPS} />);
    await user.click(screen.getByText('How much does it cost?'));
    expect(screen.getByText('Listing is free.')).toBeVisible();
  });

  it('lets one question of a group be open at a time', () => {
    const { container } = render(<FaqList groups={GROUPS} />);
    const names = [...container.querySelectorAll('details')].map((details) => details.getAttribute('name'));
    expect(names).toEqual(['faq-money', 'faq-money', 'faq-account']);
  });

  it('opens the question a link points at (#delete)', () => {
    window.history.replaceState(null, '', '/faq#delete');
    const { container } = render(<FaqList groups={GROUPS} />);
    expect(container.querySelector('#delete')).toHaveAttribute('open');
    expect(container.querySelector('#cost')).not.toHaveAttribute('open');
  });
});
