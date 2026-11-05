import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { Field } from '@/components/ui/Field';
import { renderWithIntl } from '@/test/render';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('hides the password until the eye button is pressed, and says so with aria-pressed', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <Field label="Password" error="Too short">
        <PasswordField autoComplete="current-password" />
      </Field>,
    );
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: en.auth.password.show });

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Too short');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });
});
