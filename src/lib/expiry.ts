import { daysBetween, toShanghaiDateString } from "@/lib/date";

export interface FoodForCheck {
  id: string; name: string; quantity?: string | null;
  expiryDate: Date; reminderDays: number[];
}
export interface SentReminder { foodItemId: string; reminderDay: number; }
export interface DueItem {
  foodId: string; name: string; quantity?: string | null;
  daysLeft: number; reminderDay: number; expired: boolean;
}

export function findDueReminders(foods: FoodForCheck[], sent: SentReminder[], today: Date): DueItem[] {
  const sentSet = new Set(sent.map((s) => `${s.foodItemId}:${s.reminderDay}`));
  const out: DueItem[] = [];
  for (const f of foods) {
    const daysLeft = daysBetween(today, f.expiryDate);
    if (daysLeft < 0) {
      if (!sentSet.has(`${f.id}:-1`)) {
        out.push({ foodId: f.id, name: f.name, quantity: f.quantity, daysLeft, reminderDay: -1, expired: true });
      }
      continue;
    }
    // 取满足 daysLeft <= d 的最小节点（当前最相关阈值），仅当它未发过才提醒，不下探
    const nodes = [...f.reminderDays].sort((a, b) => a - b);
    const applicable = nodes.find((d) => daysLeft <= d);
    if (applicable !== undefined && !sentSet.has(`${f.id}:${applicable}`)) {
      out.push({ foodId: f.id, name: f.name, quantity: f.quantity, daysLeft, reminderDay: applicable, expired: false });
    }
  }
  return out;
}

function label(item: DueItem): string {
  return item.quantity ? `${item.name}(${item.quantity})` : item.name;
}

export function buildReminderMessage(due: DueItem[], today: Date): { title: string; desp: string } {
  const dateStr = toShanghaiDateString(today);
  const title = `🧊 冰箱提醒（${dateStr}）`;
  const active = due.filter((d) => !d.expired);
  const expired = due.filter((d) => d.expired);
  const byDays = new Map<number, DueItem[]>();
  for (const it of active) {
    if (!byDays.has(it.daysLeft)) byDays.set(it.daysLeft, []);
    byDays.get(it.daysLeft)!.push(it);
  }
  const lines: string[] = [title, ""];
  for (const days of [...byDays.keys()].sort((a, b) => a - b)) {
    const names = byDays.get(days)!.map(label).join("、");
    const icon = days <= 3 ? "⚠️" : "⏳";
    lines.push(`${icon} 还有 ${days} 天到期：${names}`);
  }
  if (expired.length) lines.push(`❌ 已过期：${expired.map(label).join("、")}`);
  return { title, desp: lines.join("\n") };
}
