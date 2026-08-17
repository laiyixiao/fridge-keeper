import { describe, it, expect, vi, afterEach } from "vitest";
import { generateRecipes } from "@/lib/ai";

afterEach(() => vi.restoreAllMocks());

function mockCompletion(payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
  });
}

describe("generateRecipes", () => {
  it("parses recipes from model JSON and includes preference + expiring in prompt", async () => {
    const fetchMock = mockCompletion({
      recipes: [{ name: "番茄炒蛋", ingredients: ["番茄", "鸡蛋"], steps: ["打蛋", "翻炒"], usesExpiring: ["鸡蛋"], calories: "约300千卡" }],
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.DASHSCOPE_API_KEY = "sk-test";
    const recipes = await generateRecipes({ ingredients: ["番茄", "鸡蛋"], expiringSoon: ["鸡蛋"], preference: "fatloss" });
    expect(recipes[0].name).toBe("番茄炒蛋");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = JSON.stringify(body.messages);
    expect(prompt).toContain("减脂");
    expect(prompt).toContain("鸡蛋");
  });
});
