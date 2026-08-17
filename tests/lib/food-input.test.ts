import { describe, it, expect } from "vitest";
import { normalizeFood } from "@/lib/food-input";
import { toShanghaiDateString } from "@/lib/date";

const DEF = [30, 7, 3];

describe("normalizeFood", () => {
  it("uses explicit expiryDate when provided", () => {
    const n = normalizeFood({ name: "牛奶", expiryDate: "2026-09-01" }, DEF);
    expect(n.name).toBe("牛奶");
    expect(toShanghaiDateString(n.expiryDate)).toBe("2026-09-01");
    expect(n.reminderDays).toEqual(DEF);
  });
  it("computes expiry from production + shelf life", () => {
    const n = normalizeFood({ name: "酸奶", productionDate: "2026-08-01", shelfLifeDays: 10 }, DEF);
    expect(toShanghaiDateString(n.expiryDate)).toBe("2026-08-11");
  });
  it("throws when neither expiry nor (production+shelfLife) given", () => {
    expect(() => normalizeFood({ name: "x" }, DEF)).toThrow();
  });
  it("throws on non-positive shelf life", () => {
    expect(() => normalizeFood({ name: "x", productionDate: "2026-08-01", shelfLifeDays: 0 }, DEF)).toThrow();
  });
  it("keeps custom reminderDays", () => {
    const n = normalizeFood({ name: "x", expiryDate: "2026-09-01", reminderDays: [1] }, DEF);
    expect(n.reminderDays).toEqual([1]);
  });
});
