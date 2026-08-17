import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findDueReminders, buildReminderMessage, FoodForCheck } from "@/lib/expiry";
import { sendServerChan } from "@/lib/notify";
import { checkCronSecret } from "@/lib/auth";

export async function GET(req: Request) {
  if (!checkCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [foods, logs, settings] = await Promise.all([
    prisma.foodItem.findMany(),
    prisma.reminderLog.findMany({ select: { foodItemId: true, reminderDay: true } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const forCheck: FoodForCheck[] = foods.map((f) => ({
    id: f.id, name: f.name, quantity: f.quantity, expiryDate: f.expiryDate, reminderDays: f.reminderDays,
  }));
  const today = new Date();
  const due = findDueReminders(forCheck, logs, today);
  if (due.length === 0) return NextResponse.json({ sent: false, count: 0 });

  const sendkey = settings?.serverchanSendkey ?? process.env.SERVERCHAN_SENDKEY ?? "";
  const { title, desp } = buildReminderMessage(due, today);
  const ok = await sendServerChan(sendkey, title, desp);
  if (!ok) return NextResponse.json({ sent: false, count: due.length, error: "push failed" }, { status: 502 });

  await prisma.reminderLog.createMany({
    data: due.map((d) => ({ foodItemId: d.foodId, reminderDay: d.reminderDay })),
    skipDuplicates: true,
  });
  return NextResponse.json({ sent: true, count: due.length });
}
