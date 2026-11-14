import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Picks an option of the site's Select (components/ui/Select): opens the combobox, clicks the option. */
export async function choose(user: UserEvent, combobox: HTMLElement, option: string | RegExp): Promise<void> {
  await user.click(combobox);
  await user.click(screen.getByRole('option', { name: option }));
}
