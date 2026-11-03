import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('links the label to the input', () => {
    render(
      <Field label="Email">
        <input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('marks the input invalid and describes it with the error', () => {
    render(
      <Field label="Email" error="Enter a valid email">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
  });

  it('describes the input with both hint and error when both exist', () => {
    render(
      <Field label="Price per day" hint="In euros" error="Must be at least 1">
        <input />
      </Field>,
    );
    expect(screen.getByLabelText('Price per day')).toHaveAccessibleDescription('In euros Must be at least 1');
  });

  it('keeps an id the caller already gave the input', () => {
    render(
      <Field label="City">
        <input id="city-input" />
      </Field>,
    );
    expect(screen.getByLabelText('City')).toHaveAttribute('id', 'city-input');
  });
});
