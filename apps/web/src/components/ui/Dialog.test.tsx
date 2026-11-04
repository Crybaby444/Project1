import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/render';
import { Dialog } from './Dialog';

function Demo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Sign out everywhere?">
        <button>First</button>
        <button>Last</button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('opens as a labelled modal and closes with Esc, giving the focus back', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Demo />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Sign out everywhere?' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });
});
