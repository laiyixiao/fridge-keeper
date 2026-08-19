import { computeExpiryDate } from "@/lib/date";

export interface FoodInput {
  name: string; quantity?: string | null;
  productionDate?: string | null; shelfLifeDays?: number | null;
  expiryDate?: string | null; reminderDays?: number[] | null;
}
export interface NormalizedFood {
  name: string; quantity: string | null;
  productionDate: Date | null; shelfLifeDays: number | null;
  expiryDate: Date; reminderDays: number[];
}

function parseDate(s: string): Date {
  const d = new Date(`${s}T00:00:00+08:00`);
  if (isNaN(d.getTime())) throw new Error(`无效日期：${s}`);
  return d;
}

export function normalizeFood(input: FoodInput, defaultReminderDays: number[]): NormalizedFood {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("名称必填");

  const shelfLifeDays = input.shelfLifeDays ?? null;
  if (shelfLifeDays !== null && (!Number.isInteger(shelfLifeDays) || shelfLifeDays <= 0)) {
    throw new Error("保质期天数须为正整数");
  }
  const productionDate = input.productionDate ? parseDate(input.productionDate) : null;

  let expiryDate: Date;
  if (input.expiryDate) {
    expiryDate = parseDate(input.expiryDate);
  } else if (productionDate && shelfLifeDays) {
    expiryDate = computeExpiryDate(productionDate, shelfLifeDays);
  } else {
    throw new Error("请填写到期日，或同时填写生产日期与保质期天数");
  }

  const reminderDays = input.reminderDays && input.reminderDays.length ? input.reminderDays : defaultReminderDays;

  return {
    name,
    quantity: input.quantity?.trim() || null,
    productionDate, shelfLifeDays, expiryDate, reminderDays,
  };
}
