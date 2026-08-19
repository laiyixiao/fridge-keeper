"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FoodFormValues {
  id?: string;
  name: string;
  quantity: string;
  productionDate: string;
  shelfLifeDays: string;
  expiryDate: string;
  reminderDays: string; // 逗号分隔
}

const empty: FoodFormValues = {
  name: "",
  quantity: "",
  productionDate: "",
  shelfLifeDays: "",
  expiryDate: "",
  reminderDays: "",
};

export default function FoodForm({ initial }: { initial?: FoodFormValues }) {
  const [v, setV] = useState<FoodFormValues>(initial ?? empty);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const editing = Boolean(v.id);

  function set<K extends keyof FoodFormValues>(k: K, val: FoodFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit() {
    if (saving) return;
    setErr("");
    setSaving(true);
    try {
      const payload = {
        name: v.name,
        quantity: v.quantity || null,
        productionDate: v.productionDate || null,
        shelfLifeDays: v.shelfLifeDays ? Number(v.shelfLifeDays) : null,
        expiryDate: v.expiryDate || null,
        reminderDays: v.reminderDays
          ? v.reminderDays.split(",").map((s) => Number(s.trim())).filter((n) => n > 0)
          : null,
      };
      const res = await fetch(editing ? `/api/foods/${v.id}` : "/api/foods", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setErr((await res.json().catch(() => ({}))).error ?? "保存失败");
        return;
      }
      router.push(editing ? `/food/${v.id}` : "/");
      router.refresh();
    } catch {
      setErr("网络错误，请稍后再试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="btn btn-ghost -ml-2 px-2 py-1.5 text-[14px]">
          ← 返回
        </button>
        <h1 className="text-[18px] font-bold text-stone-900">{editing ? "编辑食材" : "录入食材"}</h1>
        <span className="w-12" />
      </div>

      {err && (
        <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[14px] text-rose-600">{err}</div>
      )}

      <div className="app-card space-y-4 p-4">
        <div>
          <label className="label">名称 *</label>
          <input className="field" placeholder="如 牛奶" value={v.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label">数量</label>
          <input className="field" placeholder="2 盒" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </div>
      </div>

      <div className="app-card mt-4 space-y-4 p-4">
        <p className="text-[13px] text-stone-500">
          到期日：填「生产日期 + 保质期」自动计算，<span className="text-stone-700">或</span>直接填到期日
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">生产日期</label>
            <input type="date" className="field" value={v.productionDate} onChange={(e) => set("productionDate", e.target.value)} />
          </div>
          <div>
            <label className="label">保质期（天）</label>
            <input type="number" inputMode="numeric" className="field" placeholder="如 15" value={v.shelfLifeDays} onChange={(e) => set("shelfLifeDays", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">或 直接填到期日</label>
          <input type="date" className="field" value={v.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
        </div>
        <div>
          <label className="label">提醒节点（天，逗号分隔，留空用默认 30,7,3）</label>
          <input className="field" placeholder="30,7,3" value={v.reminderDays} onChange={(e) => set("reminderDays", e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        <button onClick={submit} disabled={saving} className="btn btn-primary w-full">
          {saving ? "保存中…" : "保存"}
        </button>
        <div className="flex gap-2.5">
          {editing && (
            <button onClick={() => router.push(`/food/${v.id}`)} className="btn btn-secondary flex-1">
              取消
            </button>
          )}
          <button onClick={() => router.push("/")} className={`btn btn-ghost ${editing ? "flex-1" : "w-full"}`}>
            返回冰箱
          </button>
        </div>
      </div>
    </main>
  );
}
