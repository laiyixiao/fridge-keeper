import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeFood, FoodInput } from "@/lib/food-input";

export const dynamic = "force-dynamic";

async function defaultReminderDays(): Promise<number[]> {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return s?.defaultReminderDays ?? [30, 7, 3];
}

export async function GET() {
  const foods = await prisma.foodItem.findMany({ orderBy: { expiryDate: "asc" } });
  return NextResponse.json(foods);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FoodInput;
    const n = normalizeFood(body, await defaultReminderDays());
    const created = await prisma.foodItem.create({ data: n });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
