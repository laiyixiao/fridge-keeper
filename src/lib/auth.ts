export function checkAppSecret(req: Request): boolean {
  const expected = process.env.APP_SECRET;
  if (!expected) return false;
  return req.headers.get("x-app-secret") === expected;
}

export function checkCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}
