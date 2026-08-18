import Link from "next/link";
import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/date";
import FoodCard, { FoodView } from "@/components/FoodCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const foods = await prisma.foodItem.findMany({ orderBy: { expiryDate: "asc" } });
  const now = new Date();
  const soonCount = foods.filter((f) => daysBetween(now, f.expiryDate) <= 7).length;
  const views: FoodView[] = foods.map((f) => ({
    id: f.id,
    name: f.name,
    quantity: f.quantity,
    storage: f.storage,
    expiryDate: f.expiryDate.toISOString(),
    category: f.category,
  }));

  return (
    <main>
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-stone-900">我的冰箱</h1>
          <p className="mt-0.5 text-[14px] text-stone-500">
            共 {foods.length} 样食材{soonCount > 0 ? ` · ${soonCount} 样需尽快食用` : ""}
          </p>
        </div>
        <Link href="/add" className="btn btn-primary px-3.5 py-2 text-[14px]">
          <span className="text-[16px] leading-none">＋</span>录入
        </Link>
      </header>

      {soonCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-[14px] text-amber-800">
          <span className="text-[16px]">⚠️</span>
          <span>
            有 <span className="font-semibold">{soonCount}</span> 样食品临期或已过期，记得尽快处理
          </span>
        </div>
      )}

      {views.length === 0 ? (
        <div className="app-card mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="text-[44px]">🧊</span>
          <p className="text-[15px] font-medium text-stone-700">冰箱还是空的</p>
          <p className="-mt-1 text-[13px] text-stone-400">点下方「录入」把食材加进来吧</p>
          <Link href="/add" className="btn btn-primary mt-2">
            录入第一样食材
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {views.map((f) => (
            <FoodCard key={f.id} food={f} />
          ))}
        </div>
      )}
    </main>
  );
}
