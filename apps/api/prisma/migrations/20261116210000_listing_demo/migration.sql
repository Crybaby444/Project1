-- Demo listings on the live site (owner, 2026-11-16): marked, never booked.
ALTER TABLE "Listing" ADD COLUMN "demo" BOOLEAN NOT NULL DEFAULT false;
