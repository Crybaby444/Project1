import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('links the label, and exposes the error as the description', () => {
    render(
      <Field label="Email" error="Enter a valid email">
        <input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
  });

  it('uses the hint as the description when there is no error', () => {
    render(
      <Field label="Name" hint="As on your ID">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('As on your ID');
  });
});
