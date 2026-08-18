import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRecipes } from "@/lib/ai";
import { daysBetween } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let preference: "homestyle" | "fatloss";
  try {
    ({ preference } = (await req.json()) as { preference: "homestyle" | "fatloss" });
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const foods = await prisma.foodItem.findMany();
  const now = new Date();
  const sorted = [...foods].sort((a, b) => daysBetween(now, a.expiryDate) - daysBetween(now, b.expiryDate));
  const ingredients = sorted.map((f) => f.name);
  const expiringSoon = sorted.filter((f) => daysBetween(now, f.expiryDate) <= 7).map((f) => f.name);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "冰箱是空的，先添加一些食材吧" }, { status: 400 });
  }
  try {
    const recipes = await generateRecipes({ ingredients, expiringSoon, preference: preference ?? "homestyle" });
    return NextResponse.json({ recipes });
  } catch (e) {
    return NextResponse.json({ error: "推菜暂时不可用，请稍后再试", detail: (e as Error).message }, { status: 502 });
  }
}
