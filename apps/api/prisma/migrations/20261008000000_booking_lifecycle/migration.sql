ALTER TABLE "payments" ADD COLUMN "payment_url" TEXT, ADD COLUMN "expires_at" TIMESTAMP(3);
ALTER TABLE "payment_events" ADD COLUMN "processed_at" TIMESTAMP(3);
ALTER TABLE "refunds" ADD COLUMN "previous_booking_status" "BookingStatus";
ALTER TABLE "vendor_earnings" ADD COLUMN "payout_id" UUID;
ALTER TABLE "notifications" ADD COLUMN "payload" JSONB, ADD COLUMN "dedupe_key" TEXT;
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
ALTER TABLE "vendor_earnings" ADD CONSTRAINT "vendor_earnings_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "payments_status_expires_at_idx" ON "payments"("status", "expires_at");
UPDATE "payments" p SET "expires_at" = b."created_at" + INTERVAL '30 minutes' FROM "bookings" b WHERE b."id" = p."booking_id" AND p."status" = 'PENDING';
