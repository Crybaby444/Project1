import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthCard } from './AuthCard';

describe('AuthCard', () => {
  it('animates its title without copying or labelling it, so a field with the same name stays unique', () => {
    render(
      <AuthCard title="New password">
        <label htmlFor="pw">New password</label>
        <input id="pw" type="password" />
      </AuthCard>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'New password' }).textContent).toBe('New password');
    expect(screen.getByLabelText('New password', { exact: true })).toHaveAttribute('id', 'pw');
  });
});
