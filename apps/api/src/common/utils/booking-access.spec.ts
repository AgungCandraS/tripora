import { bookingAccessToken, hasBookingAccess } from "./booking-access";
import { parseBookingDate, scheduleApplies } from "./slot-time";

describe("booking ownership and calendar rules", () => {
  test("capability is bound to booking and secret", () => {
    const token = bookingAccessToken("booking-a", "test-secret");
    expect(hasBookingAccess("booking-a", token, "test-secret")).toBe(true);
    expect(hasBookingAccess("booking-b", token, "test-secret")).toBe(false);
    expect(hasBookingAccess("booking-a", token, "other-secret")).toBe(false);
    expect(hasBookingAccess("booking-a", undefined, "test-secret")).toBe(false);
    expect(hasBookingAccess("booking-a", "x".repeat(64), "test-secret")).toBe(
      false,
    );
  });
  test.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "bad"])(
    "rejects invalid date %s",
    (date) => {
      expect(() => parseBookingDate(date)).toThrow(/Invalid calendar/);
    },
  );
  test("specific date takes precedence, inactive schedules never apply", () => {
    const date = parseBookingDate("2028-02-29");
    expect(
      scheduleApplies(
        { status: "ACTIVE", specific_date: date, day_of_week: null },
        date,
      ),
    ).toBe(true);
    expect(
      scheduleApplies(
        { status: "ACTIVE", specific_date: date, day_of_week: 3 },
        parseBookingDate("2028-03-01"),
      ),
    ).toBe(false);
    expect(
      scheduleApplies(
        {
          status: "ACTIVE",
          specific_date: null,
          day_of_week: date.getUTCDay(),
        },
        date,
      ),
    ).toBe(true);
    expect(
      scheduleApplies(
        {
          status: "INACTIVE",
          specific_date: date,
          day_of_week: date.getUTCDay(),
        },
        date,
      ),
    ).toBe(false);
  });
});
