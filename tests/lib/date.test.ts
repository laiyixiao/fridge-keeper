import { describe, it, expect } from "vitest";
import { toShanghaiDateString, daysBetween, computeExpiryDate } from "@/lib/date";

describe("date utils", () => {
  it("formats a date in Shanghai timezone", () => {
    // 2026-08-17T20:00:00Z = 2026-08-18 04:00 上海
    expect(toShanghaiDateString(new Date("2026-08-17T20:00:00Z"))).toBe("2026-08-18");
  });
  it("computes whole-day difference", () => {
    const a = new Date("2026-08-17T00:00:00+08:00");
    const b = new Date("2026-08-20T00:00:00+08:00");
    expect(daysBetween(a, b)).toBe(3);
    expect(daysBetween(b, a)).toBe(-3);
  });
  it("adds shelf life days to production date", () => {
    const p = new Date("2026-08-01T00:00:00+08:00");
    expect(toShanghaiDateString(computeExpiryDate(p, 10))).toBe("2026-08-11");
  });
});
