-- Required reference data for registration on a fresh deployment.
-- Preserve existing roles and never provision demo users or admin credentials.
INSERT INTO "roles" ("id", "code", "name")
VALUES
  (gen_random_uuid(), 'GUEST', 'Guest'),
  (gen_random_uuid(), 'CUSTOMER', 'Customer'),
  (gen_random_uuid(), 'VENDOR_OWNER', 'Vendor Owner'),
  (gen_random_uuid(), 'VENDOR_STAFF', 'Vendor Staff'),
  (gen_random_uuid(), 'ADMIN', 'Admin')
ON CONFLICT ("code") DO NOTHING;
