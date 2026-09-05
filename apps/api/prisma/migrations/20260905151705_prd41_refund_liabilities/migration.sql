-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "gross_amount" INTEGER,
ADD COLUMN     "platform_liability" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provider_reference" TEXT,
ADD COLUMN     "vendor_liability" INTEGER NOT NULL DEFAULT 0;
