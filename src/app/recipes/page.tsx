"use client";
import { useState } from "react";

interface Recipe { name: string; ingredients: string[]; steps: string[]; usesExpiring: string[]; calories?: string; }

export default function RecipesPage() {
  const [preference, setPreference] = useState<"homestyle" | "fatloss">("homestyle");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  async function generate() {
    setLoading(true); setErr(""); setRecipes([]);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST", headers: { "Content-Type": "application/json", "x-app-secret": localStorage.getItem("appSecret") ?? "" },
        body: JSON.stringify({ preference }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "生成失败"); return; }
      setRecipes(data.recipes ?? []);
    } catch { setErr("网络错误，请稍后再试"); }
    finally { setLoading(false); }
  }

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">🍳 今天吃什么</h1>
      <div className="flex gap-2 mb-3">
        {(["homestyle", "fatloss"] as const).map((p) => (
          <button key={p} onClick={() => setPreference(p)}
            className={`flex-1 rounded py-2 border ${preference === p ? "bg-blue-600 text-white" : "bg-white"}`}>
            {p === "homestyle" ? "家常" : "减脂"}
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading} className="w-full bg-green-600 text-white rounded py-2 mb-3 disabled:opacity-50">
        {loading ? "生成中…" : "根据冰箱食材推荐"}
      </button>
      {err && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{err}</div>}
      {recipes.map((r, i) => (
        <div key={i} className="rounded-lg border bg-white p-3 mb-3">
          <div className="font-semibold">{r.name}{r.calories ? ` · ${r.calories}` : ""}</div>
          {r.usesExpiring.length > 0 && (
            <div className="text-xs text-red-600 mt-1">用掉临期：{r.usesExpiring.join("、")}</div>
          )}
          <div className="text-sm mt-2">用料：{r.ingredients.join("、")}</div>
          <ol className="text-sm mt-1 list-decimal list-inside">
            {r.steps.map((s, j) => <li key={j}>{s}</li>)}
          </ol>
        </div>
      ))}
    </main>
  );
}
