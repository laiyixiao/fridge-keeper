const TZ = "Asia/Shanghai";

export function toShanghaiDateString(d: Date): string {
  // en-CA 输出 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

function shanghaiMidnightUtcMs(d: Date): number {
  // 取该时刻在上海的日期，再解析为当天 00:00 的 UTC 毫秒
  const [y, m, day] = toShanghaiDateString(d).split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function daysBetween(from: Date, to: Date): number {
  const ms = shanghaiMidnightUtcMs(to) - shanghaiMidnightUtcMs(from);
  return Math.round(ms / 86_400_000);
}

export function computeExpiryDate(productionDate: Date, shelfLifeDays: number): Date {
  const base = shanghaiMidnightUtcMs(productionDate);
  return new Date(base + shelfLifeDays * 86_400_000);
}
