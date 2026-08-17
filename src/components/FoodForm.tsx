"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FoodFormValues {
  id?: string;
  name: string; category: string; quantity: string;
  storage: "FRIDGE" | "FREEZER" | "PANTRY";
  productionDate: string; shelfLifeDays: string; expiryDate: string;
  reminderDays: string; // 逗号分隔
}

const empty: FoodFormValues = {
  name: "", category: "", quantity: "", storage: "FRIDGE",
  productionDate: "", shelfLifeDays: "", expiryDate: "", reminderDays: "",
};

export default function FoodForm({ initial }: { initial?: FoodFormValues }) {
  const [v, setV] = useState<FoodFormValues>(initial ?? empty);
  const [err, setErr] = useState("");
  const router = useRouter();
  const editing = Boolean(v.id);

  function set<K extends keyof FoodFormValues>(k: K, val: FoodFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit() {
    setErr("");
    const secret = localStorage.getItem("appSecret") ?? "";
    const payload = {
      name: v.name, category: v.category || null, quantity: v.quantity || null, storage: v.storage,
      productionDate: v.productionDate || null,
      shelfLifeDays: v.shelfLifeDays ? Number(v.shelfLifeDays) : null,
      expiryDate: v.expiryDate || null,
      reminderDays: v.reminderDays ? v.reminderDays.split(",").map((s) => Number(s.trim())).filter((n) => n > 0) : null,
    };
    const res = await fetch(editing ? `/api/foods/${v.id}` : "/api/foods", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "x-app-secret": secret },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { setErr((await res.json()).error ?? "保存失败"); return; }
    router.push("/");
    router.refresh();
  }

  async function remove() {
    const secret = localStorage.getItem("appSecret") ?? "";
    await fetch(`/api/foods/${v.id}`, { method: "DELETE", headers: { "x-app-secret": secret } });
    router.push("/"); router.refresh();
  }

  const field = "w-full border rounded px-3 py-2 mb-3";
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">{editing ? "编辑食品" : "录入食品"}</h1>
      {err && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{err}</div>}
      <input className={field} placeholder="名称*" value={v.name} onChange={(e) => set("name", e.target.value)} />
      <input className={field} placeholder="分类（如 乳制品）" value={v.category} onChange={(e) => set("category", e.target.value)} />
      <input className={field} placeholder="数量（如 2盒）" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} />
      <select className={field} value={v.storage} onChange={(e) => set("storage", e.target.value as FoodFormValues["storage"])}>
        <option value="FRIDGE">冷藏</option><option value="FREEZER">冷冻</option><option value="PANTRY">常温</option>
      </select>
      <label className="text-sm text-gray-600">生产日期</label>
      <input type="date" className={field} value={v.productionDate} onChange={(e) => set("productionDate", e.target.value)} />
      <input className={field} type="number" placeholder="保质期天数" value={v.shelfLifeDays} onChange={(e) => set("shelfLifeDays", e.target.value)} />
      <label className="text-sm text-gray-600">或直接填到期日</label>
      <input type="date" className={field} value={v.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
      <input className={field} placeholder="提醒节点（留空用默认，如 30,7,3）" value={v.reminderDays} onChange={(e) => set("reminderDays", e.target.value)} />
      <button onClick={submit} className="w-full bg-blue-600 text-white rounded py-2 mb-2">保存</button>
      {editing && <button onClick={remove} className="w-full bg-red-100 text-red-700 rounded py-2">删除</button>}
    </div>
  );
}
