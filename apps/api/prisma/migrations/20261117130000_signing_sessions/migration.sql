-- A signing started with the signing provider (SIGNATURES=dokobit).
CREATE TABLE "SigningSession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "side" "SignatureSide" NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "termsHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "SigningSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SigningSession_token_key" ON "SigningSession"("token");
CREATE INDEX "SigningSession_bookingId_side_idx" ON "SigningSession"("bookingId", "side");
ALTER TABLE "SigningSession" ADD CONSTRAINT "SigningSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Contract"("bookingId") ON DELETE CASCADE ON UPDATE CASCADE;
