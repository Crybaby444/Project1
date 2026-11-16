-- Sign-up asks two ticks instead of a birth date (owner, 2026-11-16).
ALTER TABLE "User" ADD COLUMN "adultConfirmedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "dataConsentAt" TIMESTAMP(3);

-- Who gave a birth date already declared their age; the data consent is asked once from everyone.
UPDATE "User" SET "adultConfirmedAt" = "createdAt" WHERE "birthDate" IS NOT NULL;
