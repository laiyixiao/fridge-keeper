import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { daysBetween, toShanghaiDateString } from "@/lib/date";
import { foodStatus, toneChip, toneDot } from "@/lib/food-status";
import DeleteFoodButton from "@/components/DeleteFoodButton";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-[14px] text-stone-500">{label}</span>
      <span className="text-[15px] font-medium text-stone-900">{value}</span>
    </div>
  );
}

export default async function FoodDetailPage({ params }: { params: { id: string } }) {
  const f = await prisma.foodItem.findUnique({ where: { id: params.id } });
  if (!f) notFound();

  const daysLeft = daysBetween(new Date(), f.expiryDate);
  const status = foodStatus(daysLeft);

  return (
    <main>
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="btn btn-ghost -ml-2 px-2 py-1.5 text-[14px]">
          ← 返回
        </Link>
        <Link href={`/edit/${f.id}`} className="btn btn-primary px-4 py-2 text-[14px]">
          编辑
        </Link>
      </div>

      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className={`h-3 w-3 rounded-full ${toneDot[status.tone]}`} />
          <h1 className="text-[28px] font-bold text-stone-900">{f.name}</h1>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`chip text-[13px] ${toneChip[status.tone]}`}>{status.label}</span>
          <span className="text-[14px] text-stone-500">{toShanghaiDateString(f.expiryDate)} 到期</span>
        </div>
      </header>

      <div className="app-card divide-y divide-stone-100">
        {f.quantity && <Row label="数量" value={f.quantity} />}
        {f.productionDate && <Row label="生产日期" value={toShanghaiDateString(f.productionDate)} />}
        {f.shelfLifeDays != null && <Row label="保质期" value={`${f.shelfLifeDays} 天`} />}
        <Row label="到期日" value={toShanghaiDateString(f.expiryDate)} />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[14px] text-stone-500">提醒节点</span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {f.reminderDays.map((d) => (
              <span key={d} className="chip bg-teal-50 text-teal-700">
                前 {d} 天
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DeleteFoodButton id={f.id} />
      </div>
    </main>
  );
}
