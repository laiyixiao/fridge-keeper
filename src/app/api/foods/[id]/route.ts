import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAppSecret } from "@/lib/auth";
import { normalizeFood, FoodInput } from "@/lib/food-input";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const food = await prisma.foodItem.findUnique({ where: { id: params.id } });
  if (!food) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(food);
}

export async function PUT(req: Request, { params }: Ctx) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as FoodInput;
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    const n = normalizeFood(body, s?.defaultReminderDays ?? [30, 7, 3]);
    const updated = await prisma.foodItem.update({ where: { id: params.id }, data: n });
    // 修改后清掉旧提醒记录，让新到期日重新按节点提醒
    await prisma.reminderLog.deleteMany({ where: { foodItemId: params.id } });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.foodItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
