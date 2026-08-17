export interface RecipeInput { ingredients: string[]; expiringSoon: string[]; preference: "homestyle" | "fatloss"; }
export interface Recipe { name: string; ingredients: string[]; steps: string[]; usesExpiring: string[]; calories?: string; }

function buildPrompt(input: RecipeInput): string {
  const style = input.preference === "fatloss"
    ? "偏好【减脂】：少油、优先高蛋白低碳水，并给出每道菜大致热量估计。"
    : "偏好【家常】：家常做法、简单易做。";
  return [
    "你是家庭料理助手。根据冰箱现有食材推荐 2-3 道菜。",
    style,
    `现有食材：${input.ingredients.join("、") || "（无）"}`,
    `其中即将过期、请优先使用：${input.expiringSoon.join("、") || "（无）"}`,
    "只返回 JSON，格式：{\"recipes\":[{\"name\":\"\",\"ingredients\":[],\"steps\":[],\"usesExpiring\":[],\"calories\":\"\"}]}",
    "usesExpiring 填这道菜用到的即将过期食材。不要输出 JSON 以外的任何内容。",
  ].join("\n");
}

export async function generateRecipes(input: RecipeInput): Promise<Recipe[]> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const baseUrl = process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = process.env.DASHSCOPE_MODEL ?? "qwen-plus";
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未配置");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你只输出合法 JSON。" },
        { role: "user", content: buildPrompt(input) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`百炼调用失败：${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const parsed = JSON.parse(data.choices[0].message.content) as { recipes: Recipe[] };
  return parsed.recipes ?? [];
}
