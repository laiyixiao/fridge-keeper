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
    expiryDate: f.expiryDate.toISOString(),
  }));

  return (
    <main>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[29px] font-bold tracking-[-0.025em] text-[var(--ink)]">我的冰箱</h1>
          <p className="nums mt-1 text-[14px] text-[var(--muted)]">
            共 {foods.length} 样食材{soonCount > 0 ? ` · ${soonCount} 样需尽快` : ""}
          </p>
        </div>
        <Link href="/add" className="btn btn-primary shrink-0 px-4 py-2 text-[14px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          录入
        </Link>
      </header>

      {soonCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-[13.5px] text-amber-800">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
            <line x1="12" y1="9" x2="12" y2="13.5" />
            <line x1="12" y1="17" x2="12" y2="17" />
          </svg>
          <span>
            有 <span className="nums font-semibold">{soonCount}</span> 样食品临期或已过期，记得尽快处理
          </span>
        </div>
      )}

      {views.length === 0 ? (
        <div className="app-card mt-6 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="text-[44px]">🧊</span>
          <p className="text-[15px] font-medium text-[var(--ink)]">冰箱还是空的</p>
          <p className="-mt-1 text-[13px] text-[var(--muted)]">点下方「录入」把食材加进来吧</p>
          <Link href="/add" className="btn btn-primary mt-2">
            录入第一样食材
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {views.map((f) => (
            <FoodCard key={f.id} food={f} />
          ))}
        </div>
      )}
    </main>
  );
}
