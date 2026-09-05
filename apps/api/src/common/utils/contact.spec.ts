import { normalizeEmail, normalizePhone } from "./contact";

describe("contact normalization (PRD §31)", () => {
  test("email lowercased + trimmed", () => {
    expect(normalizeEmail("  Budi@Example.COM ")).toBe("budi@example.com");
  });

  test("phone strips separators and 62 prefix", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("081234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("081234567890");
    expect(normalizePhone("6281234567890")).toBe("081234567890");
  });
});
