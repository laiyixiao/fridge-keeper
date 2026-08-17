import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import FoodForm, { FoodFormValues } from "@/components/FoodForm";
import { toShanghaiDateString } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: { id: string } }) {
  const f = await prisma.foodItem.findUnique({ where: { id: params.id } });
  if (!f) notFound();
  const initial: FoodFormValues = {
    id: f.id, name: f.name, category: f.category ?? "", quantity: f.quantity ?? "",
    storage: f.storage,
    productionDate: f.productionDate ? toShanghaiDateString(f.productionDate) : "",
    shelfLifeDays: f.shelfLifeDays?.toString() ?? "",
    expiryDate: toShanghaiDateString(f.expiryDate),
    reminderDays: f.reminderDays.join(","),
  };
  return <FoodForm initial={initial} />;
}
