import { describe, it, expect, vi, afterEach } from "vitest";
import { sendServerChan } from "@/lib/notify";

afterEach(() => vi.restoreAllMocks());

describe("sendServerChan", () => {
  it("posts to the sendkey URL and returns true on code 0", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0 }) });
    vi.stubGlobal("fetch", fetchMock);
    const ok = await sendServerChan("SCT123", "标题", "内容");
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("SCT123");
  });
  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await sendServerChan("SCT123", "t", "d")).toBe(false);
  });
  it("returns false on non-zero code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 40001 }) }));
    expect(await sendServerChan("SCT123", "t", "d")).toBe(false);
  });
});
