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

// 从模型返回中提取 JSON：容忍前后多余文字、```json 包裹、思考内容
function parseRecipes(raw: string): Recipe[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("模型未返回可解析的 JSON");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { recipes?: Recipe[] };
  return parsed.recipes ?? [];
}

// Anthropic Messages 格式（阿里云 coding plan 等代理走这套）
async function generateViaAnthropic(input: RecipeInput): Promise<Recipe[]> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL!;
  const token = process.env.ANTHROPIC_AUTH_TOKEN;
  const model = process.env.ANTHROPIC_MODEL ?? "qwen3.7-plus";
  if (!token) throw new Error("ANTHROPIC_AUTH_TOKEN 未配置");

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": token, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: "你是家庭料理助手，只输出合法 JSON，不要输出 JSON 以外的任何内容。",
      messages: [{ role: "user", content: buildPrompt(input) }],
    }),
  });
  if (!res.ok) throw new Error(`AI 调用失败：${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  return parseRecipes(text);
}

// OpenAI 兼容格式（百炼标准模型服务）
async function generateViaOpenAI(input: RecipeInput): Promise<Recipe[]> {
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
  return parseRecipes(data.choices[0].message.content);
}

export async function generateRecipes(input: RecipeInput): Promise<Recipe[]> {
  // 用显式的 AI_PROVIDER 选择格式，默认 OpenAI 兼容。
  // 注意：不能用 ANTHROPIC_BASE_URL 是否存在来判断——某些运行环境（如 Claude Code）
  // 会向进程注入自己的 ANTHROPIC_BASE_URL，会被子进程继承而误触发。
  return process.env.AI_PROVIDER === "anthropic" ? generateViaAnthropic(input) : generateViaOpenAI(input);
}
