-- The owner's Stripe Connect account (PAYMENTS=stripe).
ALTER TABLE "User" ADD COLUMN "stripeAccountId" TEXT;
