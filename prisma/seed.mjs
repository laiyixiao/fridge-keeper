import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const day = 86_400_000;
const now = Date.now();
const at = (d) => new Date(now + d * day);

const foods = [
  { name: "豆腐", category: "豆制品", quantity: "1 盒", storage: "FRIDGE", expiryDate: at(-2), reminderDays: [30, 7, 3] },
  { name: "牛奶", category: "乳制品", quantity: "2 盒", storage: "FRIDGE", expiryDate: at(2), reminderDays: [30, 7, 3] },
  { name: "酸奶", category: "乳制品", quantity: "4 杯", storage: "FRIDGE", expiryDate: at(6), reminderDays: [30, 7, 3] },
  { name: "鸡蛋", category: "蛋类", quantity: "10 个", storage: "FRIDGE", expiryDate: at(20), reminderDays: [30, 7, 3] },
  { name: "菠菜", category: "蔬菜", quantity: "1 把", storage: "FRIDGE", expiryDate: at(4), reminderDays: [30, 7, 3] },
  { name: "冷冻虾仁", category: "海鲜", quantity: "500 g", storage: "FREEZER", expiryDate: at(90), reminderDays: [30, 7, 3] },
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
