-- The service fee percent and the launch offer it came from, frozen into each booking at request time
-- (owner's decision of 2026-11-06). Existing bookings get the percent their stored fee implies.
ALTER TABLE "Booking" ADD COLUMN "servicePercent" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "servicePromoUntil" DATE;

UPDATE "Booking"
SET "servicePercent" = CASE WHEN "rentCents" > 0 THEN ROUND("serviceFeeCents" * 100.0 / "rentCents")::INTEGER ELSE 0 END;

ALTER TABLE "Booking" ALTER COLUMN "servicePercent" SET NOT NULL;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_servicePercent_range" CHECK ("servicePercent" BETWEEN 0 AND 100);
