-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "adminCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminDeleted" BOOLEAN NOT NULL DEFAULT false;
