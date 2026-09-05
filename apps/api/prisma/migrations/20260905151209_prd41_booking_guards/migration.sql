-- AlterEnum
ALTER TYPE "OverrideStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancellation_policy_snapshot" JSONB;

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta';

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "booking_cutoff_minutes" INTEGER NOT NULL DEFAULT 120;
