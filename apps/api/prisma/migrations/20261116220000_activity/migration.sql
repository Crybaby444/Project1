-- Everything people do, for the admin (owner, 2026-11-16).
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");
CREATE INDEX "ActivityEvent_kind_createdAt_idx" ON "ActivityEvent"("kind", "createdAt");
CREATE INDEX "ActivityEvent_actorId_createdAt_idx" ON "ActivityEvent"("actorId", "createdAt");
