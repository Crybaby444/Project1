-- CreateEnum
CREATE TYPE "SignatureSide" AS ENUM ('RENTER', 'OWNER');

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "side" "SignatureSide" NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "termsHash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractSignature_bookingId_side_key" ON "ContractSignature"("bookingId", "side");

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Contract"("bookingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deals signed before signatures were recorded keep their signatures (method LEGACY).
INSERT INTO "ContractSignature" ("id", "bookingId", "side", "userId", "fullName", "termsHash", "ip", "userAgent", "method", "createdAt")
SELECT 'legacy-r-' || b."id", b."id", 'RENTER', b."renterId", u."name", c."termsHash", 'unknown', 'unknown', 'LEGACY', b."renterSignedAt"
FROM "Booking" b JOIN "Contract" c ON c."bookingId" = b."id" JOIN "User" u ON u."id" = b."renterId"
WHERE b."renterSignedAt" IS NOT NULL;
INSERT INTO "ContractSignature" ("id", "bookingId", "side", "userId", "fullName", "termsHash", "ip", "userAgent", "method", "createdAt")
SELECT 'legacy-o-' || b."id", b."id", 'OWNER', b."ownerId", u."name", c."termsHash", 'unknown', 'unknown', 'LEGACY', b."ownerSignedAt"
FROM "Booking" b JOIN "Contract" c ON c."bookingId" = b."id" JOIN "User" u ON u."id" = b."ownerId"
WHERE b."ownerSignedAt" IS NOT NULL;
