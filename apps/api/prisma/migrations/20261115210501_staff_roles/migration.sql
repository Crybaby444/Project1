-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MODERATOR', 'SUPPORT', 'FINANCE', 'EDITOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "staffRole" "StaffRole";
-- Every existing administrator becomes an owner (until now an admin could do everything).
UPDATE "User" SET "staffRole" = 'OWNER' WHERE "role" = 'ADMIN';
