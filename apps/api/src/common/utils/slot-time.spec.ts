import { slotStartUtc, todayIsoInTz, validateSlotTiming } from "./slot-time";

describe("slot-time (PRD §20-23, Asia/Jakarta)", () => {
  test("slot 10:00 WIB = 03:00 UTC", () => {
    const date = new Date("2026-09-06T00:00:00Z");
    expect(slotStartUtc(date, "10:00", "Asia/Jakarta")).toBe(Date.UTC(2026, 8, 6, 3, 0, 0));
  });

  test("today ISO follows destination wall-clock", () => {
    // 2026-09-05 18:00 UTC = 2026-09-06 01:00 WIB
    expect(todayIsoInTz(Date.UTC(2026, 8, 5, 18, 0, 0), "Asia/Jakarta")).toBe("2026-09-06");
  });

  test("yesterday booking rejected (BOOKING_DATE_IN_PAST)", () => {
    const now = Date.UTC(2026, 8, 5, 12, 0, 0); // Sep 5 19:00 WIB
    expect(() =>
      validateSlotTiming({ date: new Date("2026-09-04T00:00:00Z"), startTime: "10:00", cutoffMinutes: 120, now })
    ).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: "BOOKING_DATE_IN_PAST" }) }));
  });

  test("today past slot rejected (SLOT_IN_PAST)", () => {
    const now = Date.UTC(2026, 8, 6, 4, 0, 0); // Sep 6 11:00 WIB, slot 10:00 passed
    expect(() =>
      validateSlotTiming({ date: new Date("2026-09-06T00:00:00Z"), startTime: "10:00", cutoffMinutes: 120, now })
    ).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: "SLOT_IN_PAST" }) }));
  });

  test("cutoff rejected (BOOKING_CUTOFF_REACHED)", () => {
    const now = Date.UTC(2026, 8, 6, 1, 30, 0); // 08:30 WIB, slot 10:00, cutoff 120m → 08:00 passed
    expect(() =>
      validateSlotTiming({ date: new Date("2026-09-06T00:00:00Z"), startTime: "10:00", cutoffMinutes: 120, now })
    ).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: "BOOKING_CUTOFF_REACHED" }) }));
  });

  test("future valid slot passes", () => {
    const now = Date.UTC(2026, 8, 5, 0, 0, 0);
    expect(
      validateSlotTiming({ date: new Date("2026-09-06T00:00:00Z"), startTime: "10:00", cutoffMinutes: 120, now }).slotStart
    ).toBe(Date.UTC(2026, 8, 6, 3, 0, 0));
  });
});
