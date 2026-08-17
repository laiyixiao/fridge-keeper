import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAppSecret } from "@/lib/auth";

async function getOrCreate() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function GET() {
  const s = await getOrCreate();
  return NextResponse.json({
    defaultReminderDays: s.defaultReminderDays,
    pushHour: s.pushHour,
    hasSendkey: Boolean(s.serverchanSendkey),
  });
}

export async function PUT(req: Request) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    defaultReminderDays?: number[]; serverchanSendkey?: string; pushHour?: number;
  };
  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(body.defaultReminderDays ? { defaultReminderDays: body.defaultReminderDays } : {}),
      ...(body.serverchanSendkey !== undefined ? { serverchanSendkey: body.serverchanSendkey } : {}),
      ...(body.pushHour !== undefined ? { pushHour: body.pushHour } : {}),
    },
    create: { id: 1, ...body },
  });
  return NextResponse.json({ defaultReminderDays: s.defaultReminderDays, pushHour: s.pushHour, hasSendkey: Boolean(s.serverchanSendkey) });
}
