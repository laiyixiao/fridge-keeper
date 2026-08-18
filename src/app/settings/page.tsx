"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [defaultReminderDays, setDefault] = useState("30,7,3");
  const [sendkey, setSendkey] = useState("");
  const [hasSendkey, setHasSendkey] = useState(false);
  const [pushHour, setPushHour] = useState("12");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        setDefault((s.defaultReminderDays ?? [30, 7, 3]).join(","));
        setPushHour(String(s.pushHour ?? 12));
        setHasSendkey(Boolean(s.hasSendkey));
      })
      .catch(() => {});
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMsg("");
    try {
      const body: Record<string, unknown> = {
        defaultReminderDays: defaultReminderDays
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
        pushHour: Number(pushHour),
      };
      if (sendkey) body.serverchanSendkey = sendkey;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg("已保存");
        if (sendkey) {
          setHasSendkey(true);
          setSendkey("");
        }
      } else {
        setMsg("保存失败，请稍后再试");
      }
    } catch {
      setMsg("网络错误，请稍后再试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <header className="mb-5">
        <h1 className="text-[26px] font-bold text-stone-900">设置</h1>
        <p className="mt-0.5 text-[14px] text-stone-500">提醒规则与推送渠道</p>
      </header>

      {msg && (
        <div className="mb-4 rounded-xl bg-teal-50 px-4 py-3 text-[14px] text-teal-700">{msg}</div>
      )}

      <div className="app-card space-y-4 p-4">
        <div>
          <label className="label">默认提醒节点（天，逗号分隔）</label>
          <input className="field" value={defaultReminderDays} onChange={(e) => setDefault(e.target.value)} />
          <p className="mt-1.5 text-[12px] text-stone-400">新食材未单独设置时，按这些天数在到期前提醒</p>
        </div>
        <div>
          <label className="label">
            Server酱 SendKey{hasSendkey && <span className="ml-2 text-teal-600">已配置</span>}
          </label>
          <input
            className="field"
            placeholder={hasSendkey ? "已配置，留空则不修改" : "填入以开启微信推送"}
            value={sendkey}
            onChange={(e) => setSendkey(e.target.value)}
          />
        </div>
        <div>
          <label className="label">每日推送时间（0–23 时，北京时间）</label>
          <input className="field" type="number" value={pushHour} onChange={(e) => setPushHour(e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn btn-primary mt-6 w-full">
        {saving ? "保存中…" : "保存"}
      </button>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-stone-400">
        提醒推送由服务器每天定时触发（默认中午 12:00）。<br />
        此处时间用于记录与后续扩展。
      </p>
    </main>
  );
}
