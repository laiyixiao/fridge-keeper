import { describe, it, expect, beforeEach } from "vitest";
import { checkAppSecret, checkCronSecret } from "@/lib/auth";

beforeEach(() => { process.env.APP_SECRET = "app-x"; process.env.CRON_SECRET = "cron-x"; });

describe("auth", () => {
  it("accepts correct app secret", () => {
    const req = new Request("http://t", { headers: { "x-app-secret": "app-x" } });
    expect(checkAppSecret(req)).toBe(true);
  });
  it("rejects wrong app secret", () => {
    const req = new Request("http://t", { headers: { "x-app-secret": "nope" } });
    expect(checkAppSecret(req)).toBe(false);
  });
  it("accepts correct cron bearer", () => {
    const req = new Request("http://t", { headers: { authorization: "Bearer cron-x" } });
    expect(checkCronSecret(req)).toBe(true);
  });
});
