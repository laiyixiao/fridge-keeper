import Link from "next/link";
import { daysBetween, toShanghaiDateString } from "@/lib/date";

export interface FoodView {
  id: string; name: string; quantity: string | null; storage: string;
  expiryDate: string; category: string | null;
}

const storageLabel: Record<string, string> = { FRIDGE: "冷藏", FREEZER: "冷冻", PANTRY: "常温" };

export default function FoodCard({ food }: { food: FoodView }) {
  const daysLeft = daysBetween(new Date(), new Date(food.expiryDate));
  const expired = daysLeft < 0;
  const soon = !expired && daysLeft <= 7;
  const tone = expired ? "bg-gray-100 text-gray-400" : soon ? "bg-red-50 border-red-300" : "bg-white";
  return (
    <Link href={`/edit/${food.id}`} className={`block rounded-lg border p-3 mb-2 ${tone}`}>
      <div className="flex justify-between">
        <span className="font-medium">{food.name}{food.quantity ? `（${food.quantity}）` : ""}</span>
        <span className="text-sm">{storageLabel[food.storage] ?? food.storage}</span>
      </div>
      <div className="text-sm mt-1">
        到期：{toShanghaiDateString(new Date(food.expiryDate))}
        {expired ? "（已过期）" : `（还有 ${daysLeft} 天）`}
      </div>
    </Link>
  );
}
