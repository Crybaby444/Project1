-- CreateEnum
CREATE TYPE "AnalyticsMetric" AS ENUM ('VIEW', 'ENTRY', 'DEVICE', 'LOCALE', 'SEARCH', 'SEARCH_EMPTY', 'FUNNEL');

-- CreateTable
CREATE TABLE "AnalyticsCounter" (
    "day" DATE NOT NULL,
    "metric" "AnalyticsMetric" NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsCounter_pkey" PRIMARY KEY ("day","metric","key")
);

-- CreateIndex
CREATE INDEX "AnalyticsCounter_metric_day_idx" ON "AnalyticsCounter"("metric", "day");
