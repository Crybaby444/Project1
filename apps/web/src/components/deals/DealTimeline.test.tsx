import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testBooking } from '@/test/deals';
import { renderWithIntl } from '@/test/render';
import { DealTimeline } from './DealTimeline';

const handover = () => document.querySelector('[data-step="handover"]')!;

describe('DealTimeline', () => {
  it('names the handover day instead of "now" while it is days ahead', () => {
    const booking = testBooking({ status: 'PAID', period: { start: '2099-03-10', end: '2099-03-12' }, actions: ['CANCEL'] });
    renderWithIntl(<DealTimeline booking={booking} history={[]} onDeadline={() => {}} />, 'ru');
    expect(handover()).toHaveAttribute('data-state', 'current');
    expect(handover()).toHaveTextContent('10 мар.');
    expect(handover()).not.toHaveTextContent('Сейчас');
    expect(screen.getByText(/^Встреча — 10 мар\. или накануне вечером\./)).toBeVisible();
  });

  it('says "now" on the meeting day', () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga' }).format(new Date());
    const booking = testBooking({ status: 'PAID', period: { start: today, end: today }, actions: ['MARK_HANDED_OVER'] });
    renderWithIntl(<DealTimeline booking={booking} history={[]} onDeadline={() => {}} />, 'ru');
    expect(handover()).toHaveTextContent('Сейчас');
    expect(screen.getByText('Встретьтесь, передайте вещь и подтвердите это здесь оба.')).toBeVisible();
  });
});
