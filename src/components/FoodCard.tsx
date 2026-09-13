"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { daysBetween, toShanghaiDateString } from "@/lib/date";
import { foodStatus } from "@/lib/food-status";

export interface FoodView {
  id: string;
  name: string;
  quantity: string | null;
  expiryDate: string;
}

const ACTION_W = 84; // 删除按钮宽度（px）

// 苹果式橡皮筋阻尼：越过边界越拉越沉（Designing Fluid Interfaces）
function rubberband(overshoot: number, dim: number, c = 0.55) {
  return (overshoot * dim * c) / (dim + c * Math.abs(overshoot));
}

export default function FoodCard({ food }: { food: FoodView }) {
  const daysLeft = daysBetween(new Date(), new Date(food.expiryDate));
  const status = foodStatus(daysLeft);
  const dimmed = status.tone === "expired";
  const numColor =
    status.tone === "urgent"
      ? "text-rose-600"
      : status.tone === "soon"
        ? "text-amber-600"
        : "text-[var(--accent)]";
  const router = useRouter();

  const [tx, setTx] = useState(0); // 当前左移距离（0 ~ -ACTION_W）
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const start = useRef({ x: 0, base: 0, moved: false, lastX: 0, lastT: 0, v: 0 });

  function onDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, base: tx, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > 6) start.current.moved = true;
    // 记录瞬时速度（px/ms），释放时用来判断轻扫方向
    const now = performance.now();
    const dt = now - start.current.lastT;
    if (dt > 0) start.current.v = (e.clientX - start.current.lastX) / dt;
    start.current.lastX = e.clientX;
    start.current.lastT = now;

    let next = start.current.base + dx;
    if (next > 0) next = rubberband(next, ACTION_W); // 往右拉过头：阻尼回弹
    else if (next < -ACTION_W) next = -ACTION_W - rubberband(-ACTION_W - next, ACTION_W); // 往左拉过头：阻尼
    setTx(next);
  }
  function onUp() {
    setDragging(false);
    const v = start.current.v; // <0 向左，>0 向右
    setTx((t) => {
      if (v < -0.35) return -ACTION_W; // 快速左扫 → 展开
      if (v > 0.35) return 0; // 快速右扫 → 收回
      return t < -ACTION_W / 2 ? -ACTION_W : 0; // 否则按位置
    });
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
        className={`relative flex items-center gap-3.5 bg-[var(--card)] px-4 py-4 ${dimmed ? "opacity-65" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[17px] font-semibold text-[var(--ink)]">{food.name}</span>
            {food.quantity && <span className="shrink-0 text-[12px] text-[var(--muted)]">{food.quantity}</span>}
          </div>
          <div className="nums mt-1 text-[12.5px] text-[var(--muted)]">
            {toShanghaiDateString(new Date(food.expiryDate))} 到期
          </div>
        </div>
        <div className="shrink-0 pl-2 text-right">
          {status.tone === "expired" ? (
            <span className="text-[15px] text-stone-400">已过期</span>
          ) : daysLeft === 0 ? (
            <span className="text-[15px] font-semibold text-rose-600">今天</span>
          ) : (
            <span className="flex items-baseline gap-0.5">
              <span className={`nums text-[27px] font-semibold leading-none ${numColor}`}>{daysLeft}</span>
              <span className="text-[11px] text-[var(--muted)]">天</span>
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
