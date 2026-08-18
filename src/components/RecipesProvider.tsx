"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface Recipe {
  name: string;
  ingredients: string[];
  steps: string[];
  usesExpiring: string[];
  calories?: string;
}
type Pref = "homestyle" | "fatloss";

interface RecipesCtx {
  preference: Pref;
  setPreference: (p: Pref) => void;
  loading: boolean;
  error: string;
  recipes: Recipe[];
  touched: boolean;
  generate: () => Promise<void>;
}

const Ctx = createContext<RecipesCtx | null>(null);

export function useRecipes(): RecipesCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRecipes 必须在 RecipesProvider 内使用");
  return c;
}

// 状态提到布局层，页面切换时不卸载，菜谱结果与生成进度得以保留
export function RecipesProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Pref>("homestyle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [touched, setTouched] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    setRecipes([]);
    setTouched(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成失败");
        return;
      }
      setRecipes(data.recipes ?? []);
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [preference]);

  return (
    <Ctx.Provider value={{ preference, setPreference, loading, error, recipes, touched, generate }}>
      {children}
    </Ctx.Provider>
  );
}
