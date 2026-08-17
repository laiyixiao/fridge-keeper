"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [defaultReminderDays, setDefault] = useState("30,7,3");
  const [sendkey, setSendkey] = useState("");
  const [pushHour, setPushHour] = useState("12");
  const [appSecret, setAppSecret] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setAppSecret(localStorage.getItem("appSecret") ?? "");
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setDefault((s.defaultReminderDays ?? [30, 7, 3]).join(","));
      setPushHour(String(s.pushHour ?? 12));
    });
  }, []);

  async function save() {
    setMsg("");
    localStorage.setItem("appSecret", appSecret);
    const body: Record<string, unknown> = {
      defaultReminderDays: defaultReminderDays.split(",").map((s) => Number(s.trim())).filter((n) => n > 0),
      pushHour: Number(pushHour),
    };
    if (sendkey) body.serverchanSendkey = sendkey;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-app-secret": appSecret },
      body: JSON.stringify(body),
    });
    setMsg(res.ok ? "已保存" : "保存失败（检查访问密钥）");
  }

  const field = "w-full border rounded px-3 py-2 mb-3";
  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">⚙️ 设置</h1>
      {msg && <div className="bg-green-100 text-green-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>}
      <label className="text-sm text-gray-600">默认提醒节点（逗号分隔，天）</label>
      <input className={field} value={defaultReminderDays} onChange={(e) => setDefault(e.target.value)} />
      <label className="text-sm text-gray-600">Server酱 SendKey</label>
      <input className={field} placeholder="留空则不修改" value={sendkey} onChange={(e) => setSendkey(e.target.value)} />
      <label className="text-sm text-gray-600">每日推送小时（0-23，Asia/Shanghai）</label>
      <input className={field} type="number" value={pushHour} onChange={(e) => setPushHour(e.target.value)} />
      <label className="text-sm text-gray-600">访问密钥 appSecret（保存在本机，用于增删改）</label>
      <input className={field} value={appSecret} onChange={(e) => setAppSecret(e.target.value)} />
      <button onClick={save} className="w-full bg-blue-600 text-white rounded py-2">保存</button>
      <p className="text-xs text-gray-400 mt-3">注：推送时间实际由 Vercel Cron 固定（默认中午 12:00）；此处小时用于记录/未来扩展。</p>
    </main>
  );
}
