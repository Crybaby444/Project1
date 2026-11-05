-- Plan 7: favourites, and the catalog's text search (spec §5: PostgreSQL full text and pg_trgm).

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Favorite_listingId_idx" ON "Favorite"("listingId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Typo-tolerant search (trigrams) that ignores case and diacritics: "velosipeds" finds "Velosipēds".
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is only STABLE (its dictionary could change), so it cannot be used in an index directly.
-- With the dictionary named, the result depends on the text alone; Yoyo never edits the dictionary.
CREATE OR REPLACE FUNCTION yoyo_fold(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, value)) $$;

-- Indexes on expressions are not described in schema.prisma; they live here only (Prisma leaves them be).
CREATE INDEX "Listing_title_trgm" ON "Listing" USING gin (yoyo_fold("title") gin_trgm_ops);
CREATE INDEX "Listing_text_trgm" ON "Listing" USING gin (yoyo_fold(coalesce("title", '') || ' ' || coalesce("description", '')) gin_trgm_ops);
-- The catalog's default order: newest published first.
CREATE INDEX "Listing_catalog_idx" ON "Listing" ("status", "publishedAt" DESC, "id" DESC);
