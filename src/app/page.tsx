import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/date";
import FoodCard, { FoodView } from "@/components/FoodCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const foods = await prisma.foodItem.findMany({ orderBy: { expiryDate: "asc" } });
  const now = new Date();
  const soonCount = foods.filter((f) => daysBetween(now, f.expiryDate) <= 7).length;
  const views: FoodView[] = foods.map((f) => ({
    id: f.id, name: f.name, quantity: f.quantity, storage: f.storage,
    expiryDate: f.expiryDate.toISOString(), category: f.category,
  }));
  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">🧊 我的冰箱</h1>
      {soonCount > 0 && (
        <div className="rounded bg-red-100 text-red-700 px-3 py-2 mb-3 text-sm">
          有 {soonCount} 样食品临期或已过期，注意查看
        </div>
      )}
      {views.length === 0 ? (
        <p className="text-gray-500">还没有食品，点底部「录入」添加。</p>
      ) : (
        views.map((f) => <FoodCard key={f.id} food={f} />)
      )}
    </main>
  );
}
