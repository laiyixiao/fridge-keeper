"use client";
import { useRecipes } from "@/components/RecipesProvider";

export default function RecipesPage() {
  const { preference, setPreference, loading, error, recipes, touched, generate } = useRecipes();

  return (
    <main>
      <header className="mb-5">
        <h1 className="text-[26px] font-bold text-stone-900">今天吃什么</h1>
        <p className="mt-0.5 text-[14px] text-stone-500">根据冰箱现有食材，优先用掉临期的</p>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-stone-100 p-1.5">
        {([
          { key: "homestyle", label: "家常", icon: "🍚" },
          { key: "fatloss", label: "减脂", icon: "🥗" },
        ] as const).map((p) => (
          <button
            key={p.key}
            onClick={() => setPreference(p.key)}
            className={`rounded-xl py-2.5 text-[15px] font-semibold transition ${
              preference === p.key ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      <button onClick={generate} disabled={loading} className="btn btn-primary mb-5 w-full">
        {loading ? "正在为你想菜谱…" : recipes.length > 0 ? "换一批" : "根据冰箱食材推荐"}
      </button>

      {error && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[14px] text-rose-600">{error}</div>}

      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="app-card animate-pulse space-y-3 p-4">
              <div className="h-5 w-1/3 rounded bg-stone-200" />
              <div className="h-3 w-2/3 rounded bg-stone-100" />
              <div className="h-3 w-full rounded bg-stone-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {recipes.map((r, i) => (
            <article key={i} className="app-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[17px] font-bold text-stone-900">{r.name}</h2>
                {r.calories && <span className="shrink-0 text-[13px] font-medium text-teal-700">{r.calories}</span>}
              </div>
              {r.usesExpiring.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.usesExpiring.map((x) => (
                    <span key={x} className="chip bg-amber-100 text-amber-800">
                      用掉临期 · {x}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[13px] text-stone-500">用料</p>
              <p className="text-[14px] text-stone-700">{r.ingredients.join("、")}</p>
              <ol className="mt-3 space-y-1.5">
                {r.steps.map((s, j) => (
                  <li key={j} className="flex gap-2.5 text-[14px] leading-relaxed text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[12px] font-semibold text-teal-700">
                      {j + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}

      {!loading && touched && !error && recipes.length === 0 && (
        <p className="mt-8 text-center text-[14px] text-stone-400">没有推荐结果，换个偏好再试试</p>
      )}
    </main>
  );
}
