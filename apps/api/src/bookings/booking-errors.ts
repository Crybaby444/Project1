import { AppError } from '../common/app-error';

/** Someone else's deal does not exist for the caller. */
export const bookingNotFound = () => new AppError('NOT_FOUND', 404, 'Booking not found');

/** 409 INVALID_STATUS with the version the client should reload (as for listings). */
export const staleBooking = (currentVersion: number) =>
  new AppError('INVALID_STATUS', 409, 'The deal changed in the meantime', undefined, { currentVersion });
