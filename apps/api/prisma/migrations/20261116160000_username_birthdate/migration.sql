-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "username" TEXT;

-- Every existing person gets a username from their name (letters folded to a–z) and the end of their id,
-- which keeps it unique; they can change it in Settings → Profile. Staff keep none.
UPDATE "User"
SET "username" = left(coalesce(nullif(regexp_replace(yoyo_fold("name"), '[^a-z0-9]+', '', 'g'), ''), 'user'), 13) || '_' || lower(right("id", 6))
WHERE "deletedAt" IS NULL AND "role" = 'USER';

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
