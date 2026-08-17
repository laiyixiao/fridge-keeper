import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { generateRecipes } from "@/lib/ai";

const savedEnv = { ...process.env };

// 让测试对环境自洽：清掉可能从 .env 泄漏进来的 provider 变量
beforeEach(() => {
  for (const k of ["AI_PROVIDER", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_MODEL", "DASHSCOPE_API_KEY", "DASHSCOPE_BASE_URL", "DASHSCOPE_MODEL"]) {
    delete process.env[k];
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...savedEnv };
});

describe("generateRecipes (OpenAI-compatible)", () => {
  it("parses recipes from model JSON and includes preference + expiring in prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ recipes: [{ name: "番茄炒蛋", ingredients: ["番茄", "鸡蛋"], steps: ["打蛋", "翻炒"], usesExpiring: ["鸡蛋"], calories: "约300千卡" }] }) } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.DASHSCOPE_API_KEY = "sk-test";

    const recipes = await generateRecipes({ ingredients: ["番茄", "鸡蛋"], expiringSoon: ["鸡蛋"], preference: "fatloss" });
    expect(recipes[0].name).toBe("番茄炒蛋");
    expect(fetchMock.mock.calls[0][0]).toContain("/chat/completions");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    const prompt = JSON.stringify(body.messages);
    expect(prompt).toContain("减脂");
    expect(prompt).toContain("鸡蛋");
  });
});

describe("generateRecipes (Anthropic-compatible)", () => {
  it("uses the Anthropic endpoint and parses recipes from a fenced text block, ignoring thinking", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: "thinking", thinking: "先分析食材……" },
          { type: "text", text: "```json\n{\"recipes\":[{\"name\":\"清炒菠菜\",\"ingredients\":[\"菠菜\"],\"steps\":[\"洗净\",\"下锅快炒\"],\"usesExpiring\":[\"菠菜\"]}]}\n```" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_BASE_URL = "https://example.test/apps/anthropic";
    process.env.ANTHROPIC_AUTH_TOKEN = "sk-sp-test";

    const recipes = await generateRecipes({ ingredients: ["菠菜"], expiringSoon: ["菠菜"], preference: "homestyle" });
    expect(recipes[0].name).toBe("清炒菠菜");
    expect(recipes[0].usesExpiring).toEqual(["菠菜"]);
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/messages");
    const headers = (fetchMock.mock.calls[0][1] as { headers: Record<string, string> }).headers;
    expect(headers["x-api-key"]).toBe("sk-sp-test");
  });

  it("throws when no API token is configured", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.ANTHROPIC_BASE_URL = "https://example.test/apps/anthropic";
    await expect(generateRecipes({ ingredients: ["菠菜"], expiringSoon: [], preference: "homestyle" })).rejects.toThrow();
  });
});
