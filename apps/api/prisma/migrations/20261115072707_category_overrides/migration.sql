-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "adminHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminNames" JSONB,
ADD COLUMN     "adminSortOrder" INTEGER;
