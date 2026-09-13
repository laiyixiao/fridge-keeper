"use client";
import { useRecipes } from "@/components/RecipesProvider";

export default function RecipesPage() {
  const { preference, setPreference, loading, error, recipes, touched, generate } = useRecipes();

  return (
    <main>
      <header className="mb-6">
        <h1 className="text-[29px] font-bold tracking-[-0.025em] text-[var(--ink)]">今天吃什么</h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">根据冰箱现有食材，优先用掉临期的</p>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-stone-100 p-1.5">
        {(
          [
            { key: "homestyle", label: "家常" },
            { key: "fatloss", label: "减脂" },
          ] as const
        ).map((p) => (
          <button
            key={p.key}
            onClick={() => setPreference(p.key)}
            className={`rounded-xl py-2.5 text-[15px] font-semibold transition duration-150 active:scale-[0.97] ${
              preference === p.key ? "bg-[var(--card)] text-[var(--accent)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button onClick={generate} disabled={loading} className="btn btn-primary press mb-6 w-full">
        {loading ? "正在为你想菜谱…" : recipes.length > 0 ? "换一批" : "根据冰箱食材推荐"}
      </button>

      {error && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[14px] text-rose-600">{error}</div>}

      {loading && (
        <div className="flex flex-col gap-3.5">
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
            <article
              key={i}
              className="app-card rise p-4"
              style={{ animationDelay: `${Math.min(i, 6) * 0.06}s` }}
            >
              <h2 className="text-[19px] leading-snug text-[var(--ink)]">{r.name}</h2>
              {r.calories && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-[var(--accent)]">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-[2px] shrink-0"
                  >
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
                  </svg>
                  <span>{r.calories}</span>
                </p>
              )}
              {r.usesExpiring.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.usesExpiring.map((x) => (
                    <span key={x} className="chip bg-amber-100 text-amber-800">
                      用掉临期 · {x}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[13px] text-[var(--muted)]">用料</p>
              <p className="text-[14px] text-stone-700">{r.ingredients.join("、")}</p>
              <ol className="mt-3 space-y-1.5">
                {r.steps.map((s, j) => (
                  <li key={j} className="flex gap-2.5 text-[14px] leading-relaxed text-stone-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-semibold text-[var(--accent)]">
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
