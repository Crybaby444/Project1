-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'PAID', 'ACTIVE', 'RETURNED', 'DAMAGE_CLAIMED', 'DISPUTED', 'COMPLETED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimerKind" AS ENUM ('REQUEST_EXPIRY', 'PAYMENT_EXPIRY', 'HANDOVER_DEADLINE', 'HANDOVER_CONFIRM', 'RETURN_CONFIRM', 'INSPECTION', 'DAMAGE_REPLY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WALLET', 'CARD');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('LISTED', 'AGREED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('DAMAGE', 'NOT_RETURNED', 'NOT_HANDED_OVER');

-- CreateEnum
CREATE TYPE "ResolveDecision" AS ENUM ('REFUND_DEPOSIT', 'DEPOSIT_TO_OWNER', 'REFUND_ALL', 'CONFIRM_HANDOVER');

-- CreateEnum
CREATE TYPE "BookingOutcome" AS ENUM ('DEPOSIT_REFUNDED', 'DEPOSIT_TO_OWNER', 'REFUNDED_ALL');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('RENTER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookingPhotoKind" AS ENUM ('HANDOVER', 'RETURN', 'DAMAGE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'USED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('TOP_UP', 'WITHDRAWAL', 'BOOKING_PAYMENT', 'RENT_RELEASE', 'DEPOSIT_REFUND', 'DEPOSIT_TO_OWNER', 'BOOKING_REFUND');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('BOOKING', 'TOP_UP');

-- CreateEnum
CREATE TYPE "MoneyJobStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "IdempotencyState" AS ENUM ('IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "offerId" TEXT,
    "status" "BookingStatus" NOT NULL,
    "start" DATE NOT NULL,
    "end" DATE NOT NULL,
    "timeZone" TEXT NOT NULL,
    "message" TEXT,
    "days" INTEGER NOT NULL,
    "dailyCents" INTEGER NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "rentCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "ownerPayoutCents" INTEGER NOT NULL,
    "priceSource" "PriceSource" NOT NULL,
    "renterSignedAt" TIMESTAMP(3),
    "ownerSignedAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "ownerHandedOverAt" TIMESTAMP(3),
    "renterReceivedAt" TIMESTAMP(3),
    "renterReturnedAt" TIMESTAMP(3),
    "ownerReceivedBackAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "damageDescription" TEXT,
    "damagePhotoIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "damageClaimedAt" TIMESTAMP(3),
    "disputeReason" "DisputeReason",
    "disputeOpenedAt" TIMESTAMP(3),
    "disputeNote" TEXT,
    "resolutionDecision" "ResolveDecision",
    "resolutionComment" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "outcome" "BookingOutcome",
    "cancelledBy" "CancelledBy",
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "timerKind" "TimerKind",
    "timerDueAt" TIMESTAMP(3),
    "reserved" daterange,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "messages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "bookingId" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "termsHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "BookingPhoto" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "kind" "BookingPhotoKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "start" DATE NOT NULL,
    "end" DATE NOT NULL,
    "dailyCents" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerOperation" (
    "id" TEXT NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "bookingId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" BIGSERIAL NOT NULL,
    "operationId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "providerRef" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "MoneyJobStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "destinationToken" TEXT NOT NULL,
    "status" "MoneyJobStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "operationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "state" "IdempotencyState" NOT NULL DEFAULT 'IN_PROGRESS',
    "statusCode" INTEGER,
    "body" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("userId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_offerId_key" ON "Booking"("offerId");

-- CreateIndex
CREATE INDEX "Booking_renterId_updatedAt_idx" ON "Booking"("renterId", "updatedAt");

-- CreateIndex
CREATE INDEX "Booking_ownerId_updatedAt_idx" ON "Booking"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Booking_listingId_idx" ON "Booking"("listingId");

-- CreateIndex
CREATE INDEX "Booking_timerDueAt_idx" ON "Booking"("timerDueAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPhoto_storageKey_key" ON "BookingPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "BookingPhoto_bookingId_kind_idx" ON "BookingPhoto"("bookingId", "kind");

-- CreateIndex
CREATE INDEX "Offer_renterId_createdAt_idx" ON "Offer"("renterId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_ownerId_createdAt_idx" ON "Offer"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_status_expiresAt_idx" ON "Offer"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "LedgerOperation_bookingId_idx" ON "LedgerOperation"("bookingId");

-- CreateIndex
CREATE INDEX "LedgerOperation_createdAt_idx" ON "LedgerOperation"("createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_account_id_idx" ON "LedgerEntry"("account", "id");

-- CreateIndex
CREATE INDEX "LedgerEntry_operationId_idx" ON "LedgerEntry"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentRefund_status_createdAt_idx" ON "PaymentRefund"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_operationId_key" ON "Payout"("operationId");

-- CreateIndex
CREATE INDEX "Payout_userId_createdAt_idx" ON "Payout"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPhoto" ADD CONSTRAINT "BookingPhoto_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "LedgerOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "LedgerOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---- Hand-written guards (plan 8, Task 1) --------------------------------------------------------

-- Double booking is impossible at the database level: two reservations of one listing never share a day.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_double_booking"
  EXCLUDE USING gist ("listingId" WITH =, "reserved" WITH &&);

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_period_order" CHECK ("end" >= "start");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_money_not_negative" CHECK (
  "days" > 0 AND "dailyCents" >= 0 AND "baseCents" >= 0 AND "discountCents" >= 0 AND "rentCents" >= 0
  AND "serviceFeeCents" >= 0 AND "depositCents" >= 0 AND "totalCents" >= 0 AND "ownerPayoutCents" >= 0
  AND "totalCents" = "rentCents" + "serviceFeeCents" + "depositCents"
);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_version_not_negative" CHECK ("version" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_one_timer" CHECK (("timerKind" IS NULL) = ("timerDueAt" IS NULL));
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_period_order" CHECK ("end" >= "start");
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_price_positive" CHECK ("dailyCents" > 0);

-- Money: cards and Yoyo's revenue are outside accounts; every other balance stays at zero or above.
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_balance_floor"
  CHECK ("balance" >= 0 OR "id" IN ('external:card', 'platform:revenue'));
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_amount_not_zero" CHECK ("amount" <> 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amounts" CHECK ("amountCents" > 0 AND "refundedCents" >= 0 AND "refundedCents" <= "amountCents");
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_amount_positive" CHECK ("amountCents" > 0);
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_amount_positive" CHECK ("amountCents" > 0);

-- Postings are never changed or removed: a wrong one is corrected by a new operation.
CREATE FUNCTION ledger_entry_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger entries are immutable' USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
CREATE TRIGGER ledger_entry_immutable BEFORE UPDATE OR DELETE ON "LedgerEntry"
  FOR EACH ROW EXECUTE FUNCTION ledger_entry_immutable();

-- Every operation balances: checked at commit, once all its postings are in.
CREATE FUNCTION ledger_operation_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  total bigint;
BEGIN
  SELECT COALESCE(SUM("amount"), 0) INTO total FROM "LedgerEntry" WHERE "operationId" = NEW."operationId";
  IF total <> 0 THEN
    RAISE EXCEPTION 'unbalanced ledger operation % (sum %)', NEW."operationId", total
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER ledger_operation_balanced AFTER INSERT ON "LedgerEntry"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_operation_balanced();
