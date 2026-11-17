-- Unexpected server errors for the admin (System → Errors).
CREATE TABLE "ServerError" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstAt" TIMESTAMP(3) NOT NULL,
    "lastAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServerError_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServerError_lastAt_idx" ON "ServerError"("lastAt");
