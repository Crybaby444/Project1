-- Listings say which country they are in (all of Europe); the catalog filters by it.
ALTER TABLE "Listing" ADD COLUMN "country" TEXT;

-- Every listing so far is in Latvia (Riga and around).
UPDATE "Listing" SET "country" = 'LV' WHERE "country" IS NULL AND ("city" IS NOT NULL OR "lat" IS NOT NULL);

CREATE INDEX "Listing_country_idx" ON "Listing"("country");
