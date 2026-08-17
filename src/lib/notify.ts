export async function sendServerChan(sendkey: string, title: string, desp: string): Promise<boolean> {
  if (!sendkey) return false;
  const url = `https://sctapi.ftqq.com/${encodeURIComponent(sendkey)}.send`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title, desp }).toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { code?: number };
    return data.code === 0;
  } catch {
    return false;
  }
}
