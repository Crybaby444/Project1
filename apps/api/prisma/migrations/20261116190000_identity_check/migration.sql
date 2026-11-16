-- Identity checked by a moderator (owner, 2026-11-16); photos encrypted and erased at the decision.
ALTER TABLE "User" ADD COLUMN "identityVerifiedAt" TIMESTAMP(3);

CREATE TYPE "IdentityCheckStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "IdentityCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "IdentityCheckStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT NOT NULL,
    "documentPhoto" BYTEA,
    "selfiePhoto" BYTEA,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "reason" TEXT,
    CONSTRAINT "IdentityCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IdentityCheck_status_submittedAt_idx" ON "IdentityCheck"("status", "submittedAt");
CREATE INDEX "IdentityCheck_userId_idx" ON "IdentityCheck"("userId");
ALTER TABLE "IdentityCheck" ADD CONSTRAINT "IdentityCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
