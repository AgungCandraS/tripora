import { DEFAULT_STAFF_PERMISSIONS, STAFF_PERMISSIONS, hasPermissions } from "./permission.decorators";

describe("staff permissions (PRD §9)", () => {
  test("semua required harus ada", () => {
    expect(hasPermissions(["booking.read", "checkin.scan"], ["booking.read"])).toBe(true);
    expect(hasPermissions(["booking.read"], ["booking.read", "revenue.read"])).toBe(false);
    expect(hasPermissions([], ["booking.read"])).toBe(false);
    expect(hasPermissions(["a"], [])).toBe(true);
  });

  test("default staff tanpa revenue", () => {
    expect(DEFAULT_STAFF_PERMISSIONS).toContain("checkin.scan");
    expect(DEFAULT_STAFF_PERMISSIONS).not.toContain("revenue.read");
    expect(DEFAULT_STAFF_PERMISSIONS).not.toContain("payout");
    for (const p of DEFAULT_STAFF_PERMISSIONS) {
      expect(STAFF_PERMISSIONS).toContain(p);
    }
  });
});
