-- AlterTable: granular staff permissions (PRD §9)
ALTER TABLE "vendor_members" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: existing staff get default field set (no revenue)
UPDATE "vendor_members"
SET "permissions" = ARRAY['booking.read','calendar.read','checkin.scan','participant.read','activity.read','promotion.read','review.read']
WHERE "role_name" = 'VENDOR_STAFF' AND "permissions" = ARRAY[]::TEXT[];
