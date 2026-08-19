"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { daysBetween, toShanghaiDateString } from "@/lib/date";
import { foodStatus, toneChip, toneDot } from "@/lib/food-status";

export interface FoodView {
  id: string;
  name: string;
  quantity: string | null;
  expiryDate: string;
}

const ACTION_W = 84; // 删除按钮宽度（px）

export default function FoodCard({ food }: { food: FoodView }) {
  const daysLeft = daysBetween(new Date(), new Date(food.expiryDate));
  const status = foodStatus(daysLeft);
  const dimmed = status.tone === "expired";
  const router = useRouter();

  const [tx, setTx] = useState(0); // 当前左移距离（0 ~ -ACTION_W）
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const start = useRef({ x: 0, base: 0, moved: false });

  function onDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, base: tx, moved: false };
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > 6) start.current.moved = true;
    let next = start.current.base + dx;
    if (next > 0) next = 0;
    if (next < -ACTION_W) next = -ACTION_W;
    setTx(next);
  }
  function onUp() {
    setDragging(false);
    setTx((t) => (t < -ACTION_W / 2 ? -ACTION_W : 0));
  }
  function onClick(e: React.MouseEvent) {
    if (start.current.moved) {
      e.preventDefault(); // 刚才是滑动，不跳转
      return;
    }
    if (tx !== 0) {
      e.preventDefault(); // 已展开时，点一下先收回
      setTx(0);
    }
  }
  async function del() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/foods/${food.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setDeleting(false);
      setTx(0);
      alert("删除失败，请稍后再试");
    }
  }

  return (
    <div className="app-card relative overflow-hidden">
      <button
        onClick={del}
        disabled={deleting}
        aria-label="删除"
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-500 text-[14px] font-semibold text-white"
        style={{ width: ACTION_W }}
      >
        {deleting ? "…" : "删除"}
      </button>
      <Link
        href={`/food/${food.id}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
        style={{
          transform: `translateX(${tx}px)`,
          touchAction: "pan-y",
          transition: dragging ? "none" : "transform 0.2s ease-out",
        }}
        className={`relative flex items-center gap-3.5 bg-white px-4 py-3.5 ${dimmed ? "opacity-70" : ""}`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[status.tone]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[16px] font-semibold text-stone-900">{food.name}</span>
            {food.quantity && <span className="shrink-0 text-[13px] text-stone-400">{food.quantity}</span>}
          </div>
          <div className="mt-1 text-[13px] text-stone-500">
            {toShanghaiDateString(new Date(food.expiryDate))} 到期
          </div>
        </div>
        <span className={`chip shrink-0 ${toneChip[status.tone]}`}>{status.label}</span>
      </Link>
    </div>
  );
}
