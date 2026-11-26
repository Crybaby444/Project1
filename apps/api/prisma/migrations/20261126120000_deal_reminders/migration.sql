-- Reminders (spec 2026-11-03 §4.7): the day before the handover and the day before the return, a nudge to
-- whoever's turn it is when a request or a booking is about to expire, and a request for a review.
ALTER TABLE "Booking" ADD COLUMN "startRemindedAt" TIMESTAMP(3),
ADD COLUMN "endRemindedAt" TIMESTAMP(3),
ADD COLUMN "deadlineRemindedAt" TIMESTAMP(3),
ADD COLUMN "reviewRemindedAt" TIMESTAMP(3);
