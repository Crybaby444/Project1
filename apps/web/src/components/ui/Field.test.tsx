import { render, screen } from '@testing-library/react';
import { Field } from './Field';

describe('Field', () => {
  it('links label, error and input', () => {
    render(
      <Field label="Email" error="Enter a valid email">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
  });

  it('describes the input with its hint when valid', () => {
    render(
      <Field label="Phone" hint="We text you a code">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Phone');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('We text you a code');
  });
});
