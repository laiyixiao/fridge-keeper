import { describe, it, expect } from "vitest";
import { findDueReminders, buildReminderMessage, FoodForCheck } from "@/lib/expiry";

const today = new Date("2026-08-17T12:00:00+08:00");
const mk = (id: string, name: string, daysFromToday: number, reminderDays = [30, 7, 3]): FoodForCheck => ({
  id, name, expiryDate: new Date(new Date("2026-08-17T00:00:00+08:00").getTime() + daysFromToday * 86400000), reminderDays,
});

describe("findDueReminders", () => {
  it("hits the 3-day node when 3 days left and not sent", () => {
    const due = findDueReminders([mk("a", "牛奶", 3)], [], today);
    expect(due).toEqual([{ foodId: "a", name: "牛奶", quantity: undefined, daysLeft: 3, reminderDay: 3, expired: false }]);
  });
  it("does not resend an already-sent node", () => {
    const due = findDueReminders([mk("a", "牛奶", 3)], [{ foodItemId: "a", reminderDay: 3 }], today);
    expect(due).toEqual([]);
  });
  it("catches up a missed node (7 left but 30 not sent picks 7)", () => {
    const due = findDueReminders([mk("a", "鸡蛋", 6)], [{ foodItemId: "a", reminderDay: 30 }], today);
    expect(due[0].reminderDay).toBe(7);
  });
  it("marks expired items with reminderDay -1", () => {
    const due = findDueReminders([mk("a", "豆腐", -2)], [], today);
    expect(due[0]).toMatchObject({ reminderDay: -1, expired: true });
  });
  it("does not resend expired once logged", () => {
    const due = findDueReminders([mk("a", "豆腐", -2)], [{ foodItemId: "a", reminderDay: -1 }], today);
    expect(due).toEqual([]);
  });
});

describe("buildReminderMessage", () => {
  it("groups items by daysLeft and lists expired", () => {
    const due = [
      { foodId: "a", name: "牛奶", quantity: "2盒", daysLeft: 3, reminderDay: 3, expired: false },
      { foodId: "b", name: "菠菜", quantity: null, daysLeft: 3, reminderDay: 3, expired: false },
      { foodId: "c", name: "豆腐", quantity: null, daysLeft: -2, reminderDay: -1, expired: true },
    ];
    const { title, desp } = buildReminderMessage(due, today);
    expect(title).toContain("冰箱提醒");
    expect(desp).toContain("还有 3 天到期：牛奶(2盒)、菠菜");
    expect(desp).toContain("已过期：豆腐");
  });
});
