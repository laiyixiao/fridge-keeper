import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAppSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
  let body: { defaultReminderDays?: number[]; serverchanSendkey?: string; pushHour?: number };
  try {
    body = (await req.json()) as {
      defaultReminderDays?: number[]; serverchanSendkey?: string; pushHour?: number;
    };
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(body.defaultReminderDays && body.defaultReminderDays.length ? { defaultReminderDays: body.defaultReminderDays } : {}),
      ...(body.serverchanSendkey !== undefined ? { serverchanSendkey: body.serverchanSendkey } : {}),
      ...(body.pushHour !== undefined ? { pushHour: body.pushHour } : {}),
    },
    create: {
      id: 1,
      ...(body.defaultReminderDays && body.defaultReminderDays.length ? { defaultReminderDays: body.defaultReminderDays } : {}),
      ...(body.serverchanSendkey !== undefined ? { serverchanSendkey: body.serverchanSendkey } : {}),
      ...(body.pushHour !== undefined ? { pushHour: body.pushHour } : {}),
    },
  });
  return NextResponse.json({ defaultReminderDays: s.defaultReminderDays, pushHour: s.pushHour, hasSendkey: Boolean(s.serverchanSendkey) });
}
