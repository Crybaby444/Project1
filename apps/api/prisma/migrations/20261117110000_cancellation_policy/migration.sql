-- Cancellation policies (owner, 2026-11-16): the owner picks one; a deal keeps the one it was requested under.
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT');
ALTER TABLE "Listing" ADD COLUMN "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE';
ALTER TABLE "Booking" ADD COLUMN "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE';
ALTER TYPE "BookingOutcome" ADD VALUE 'REFUNDED_PART';
ALTER TYPE "LedgerKind" ADD VALUE 'BOOKING_PARTIAL_REFUND';
