import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const day = 86_400_000;
const now = Date.now();
const at = (d) => new Date(now + d * day);

const foods = [
  { name: "豆腐", quantity: "1 盒", expiryDate: at(-2), reminderDays: [30, 7, 3] },
  { name: "牛奶", quantity: "2 盒", expiryDate: at(2), reminderDays: [30, 7, 3] },
  { name: "酸奶", quantity: "4 杯", expiryDate: at(6), reminderDays: [30, 7, 3] },
  { name: "鸡蛋", quantity: "10 个", expiryDate: at(20), reminderDays: [30, 7, 3] },
  { name: "菠菜", quantity: "1 把", expiryDate: at(4), reminderDays: [30, 7, 3] },
  { name: "冷冻虾仁", quantity: "500 g", expiryDate: at(90), reminderDays: [30, 7, 3] },
];

async function main() {
  await prisma.reminderLog.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.foodItem.createMany({ data: foods });
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const count = await prisma.foodItem.count();
  console.log(`Seeded ${count} food items.`);
}

main().finally(() => prisma.$disconnect());
