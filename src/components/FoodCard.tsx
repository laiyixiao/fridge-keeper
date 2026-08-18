import Link from "next/link";
import { daysBetween, toShanghaiDateString } from "@/lib/date";
import { foodStatus, toneChip, toneDot, storageLabel } from "@/lib/food-status";

export interface FoodView {
  id: string;
  name: string;
  quantity: string | null;
  storage: string;
  expiryDate: string;
  category: string | null;
}

export default function FoodCard({ food }: { food: FoodView }) {
  const daysLeft = daysBetween(new Date(), new Date(food.expiryDate));
  const status = foodStatus(daysLeft);
  const dimmed = status.tone === "expired";

  return (
    <Link
      href={`/food/${food.id}`}
      className={`app-card group flex items-center gap-3.5 px-4 py-3.5 transition active:scale-[0.99] ${
        dimmed ? "opacity-70" : ""
      }`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[status.tone]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold text-stone-900">{food.name}</span>
          {food.quantity && <span className="shrink-0 text-[13px] text-stone-400">{food.quantity}</span>}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-stone-500">
          <span className="chip bg-stone-100 text-stone-500">{storageLabel[food.storage] ?? food.storage}</span>
          <span>{toShanghaiDateString(new Date(food.expiryDate))} 到期</span>
        </div>
      </div>
      <span className={`chip shrink-0 ${toneChip[status.tone]}`}>{status.label}</span>
    </Link>
  );
}
