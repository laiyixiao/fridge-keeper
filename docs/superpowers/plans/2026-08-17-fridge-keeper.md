# 冰箱管家（Fridge Keeper）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个自用网页应用，管理冰箱食品、临期微信提醒、按偏好 AI 推荐菜。

**Architecture:** Next.js（App Router）全栈应用部署到 Vercel，页面 + API 路由 + Vercel Cron 在一个代码库内；数据存 Neon Postgres（Prisma ORM）；到期提醒经 Server酱推送微信，推菜调用阿里云百炼（Qwen）。核心到期/提醒判定抽成纯函数便于测试。

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Prisma, Neon Postgres, Vitest（单元/集成测试）, Vercel Cron, Server酱, 阿里云百炼（DashScope OpenAI 兼容接口）。

## Global Constraints

- 单用户、免登录；写操作 API 用 `APP_SECRET` 校验请求头 `x-app-secret`。
- Cron 接口用 `CRON_SECRET` 校验（Vercel Cron 自动带 `Authorization: Bearer <CRON_SECRET>`）。
- 时区固定 `Asia/Shanghai`；每天推送时间中午 12:00；当天多条提醒合并为一条。
- 默认提醒节点 `[30, 7, 3]`（到期前天数）；单个食品可覆盖。
- 提醒去重：`reminder_log` 中过期项的 `reminder_day` 用特殊值 `-1`。
- 判定用"剩余天数 ≤ 节点 且 未发过"，保证漏跑可补发。
- 所有日期以「日」为粒度按 Asia/Shanghai 计算，避免时区导致差一天。
- TDD：核心纯函数先写测试；频繁提交。

---

## 文件结构

```
fridge-keeper/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── vercel.json                       # Cron 配置
├── .env.example
├── prisma/
│   └── schema.prisma                 # food_item / reminder_log / settings
├── src/
│   ├── lib/
│   │   ├── db.ts                     # Prisma 客户端单例
│   │   ├── date.ts                   # Asia/Shanghai 按日计算工具（纯函数）
│   │   ├── expiry.ts                 # 到期/提醒判定 + 消息组装（纯函数）
│   │   ├── notify.ts                 # Server酱推送封装
│   │   ├── ai.ts                     # 百炼推菜封装（可替换）
│   │   └── auth.ts                   # 简单密钥校验
│   ├── app/
│   │   ├── layout.tsx                # 根布局 + 底部标签栏
│   │   ├── globals.css
│   │   ├── page.tsx                  # 首页：食品列表
│   │   ├── add/page.tsx              # 录入
│   │   ├── edit/[id]/page.tsx        # 编辑
│   │   ├── recipes/page.tsx          # 推菜
│   │   ├── settings/page.tsx         # 设置
│   │   └── api/
│   │       ├── foods/route.ts        # GET 列表 / POST 新建
│   │       ├── foods/[id]/route.ts   # GET / PUT / DELETE
│   │       ├── recipes/route.ts      # POST 生成推菜
│   │       ├── settings/route.ts     # GET / PUT
│   │       └── cron/check/route.ts   # GET（每日检查+推送）
│   └── components/
│       ├── FoodForm.tsx              # 录入/编辑共用表单
│       ├── FoodCard.tsx              # 食品卡片
│       └── TabBar.tsx                # 底部导航
└── tests/
    ├── lib/
    │   ├── date.test.ts
    │   ├── expiry.test.ts
    │   ├── notify.test.ts
    │   └── ai.test.ts
    └── api/
        └── foods.test.ts
```

---

### Task 1: 项目脚手架与测试环境

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.example`
- Test: `tests/lib/date.test.ts`（用作冒烟测试）

**Interfaces:**
- Consumes: 无
- Produces: 可运行的 Next.js 应用；`npm test` 可跑 Vitest。

- [ ] **Step 1: 初始化 package.json 与依赖**

```json
{
  "name": "fridge-keeper",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.18.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.0.0",
    "prisma": "^5.18.0"
  }
}
```

安装：`npm install`

- [ ] **Step 2: 配置 TypeScript / Next / Tailwind / Vitest**

`tsconfig.json`：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`：
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`：
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`tailwind.config.ts`：
```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

`vitest.config.ts`：
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { environment: "node", globals: true },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`src/app/globals.css`：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: 写最小根布局与首页占位**

`src/app/layout.tsx`：
```tsx
import "./globals.css";
export const metadata = { title: "冰箱管家", description: "冰箱食品管理与临期提醒" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`：
```tsx
export default function Home() {
  return <main className="p-4">冰箱管家</main>;
}
```

- [ ] **Step 4: 写冒烟测试确认 Vitest 可用**

`tests/lib/date.test.ts`：
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test`
Expected: 1 passed

- [ ] **Step 6: 写 .env.example**

```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
APP_SECRET="change-me"
CRON_SECRET="change-me"
SERVERCHAN_SENDKEY=""
DASHSCOPE_API_KEY=""
DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_MODEL="qwen-plus"
```

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

### Task 2: Prisma 数据模型与迁移

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Modify: `.env`（本地，从 `.env.example` 复制，不提交）

**Interfaces:**
- Consumes: 无
- Produces: Prisma 客户端 `prisma`（`@/lib/db`）；模型 `FoodItem`、`ReminderLog`、`Settings`。

FoodItem 字段：`id:string(cuid)`, `name:string`, `category:string?`, `quantity:string?`, `storage:Storage(枚举 FRIDGE|FREEZER|PANTRY)`, `productionDate:DateTime?`, `shelfLifeDays:int?`, `expiryDate:DateTime`, `reminderDays:int[]`, `createdAt`, `updatedAt`。
ReminderLog 字段：`id`, `foodItemId:string`, `reminderDay:int`（过期为 -1）, `sentAt:DateTime`，唯一约束 `@@unique([foodItemId, reminderDay])`。
Settings 单行：`id:int @default(1)`, `defaultReminderDays:int[] @default([30,7,3])`, `serverchanSendkey:string?`, `pushHour:int @default(12)`。

- [ ] **Step 1: 写 schema.prisma**

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Storage { FRIDGE FREEZER PANTRY }

model FoodItem {
  id             String   @id @default(cuid())
  name           String
  category       String?
  quantity       String?
  storage        Storage  @default(FRIDGE)
  productionDate DateTime?
  shelfLifeDays  Int?
  expiryDate     DateTime
  reminderDays   Int[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  reminders      ReminderLog[]
}

model ReminderLog {
  id          String   @id @default(cuid())
  foodItem    FoodItem @relation(fields: [foodItemId], references: [id], onDelete: Cascade)
  foodItemId  String
  reminderDay Int
  sentAt      DateTime @default(now())
  @@unique([foodItemId, reminderDay])
}

model Settings {
  id                  Int     @id @default(1)
  defaultReminderDays Int[]   @default([30, 7, 3])
  serverchanSendkey   String?
  pushHour            Int     @default(12)
}
```

- [ ] **Step 2: 生成迁移**（需已在 `.env` 配好本地/Neon `DATABASE_URL`）

Run: `npx prisma migrate dev --name init`
Expected: 迁移创建成功，生成 `prisma/migrations/*`

- [ ] **Step 3: 写 Prisma 客户端单例**

`src/lib/db.ts`：
```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add prisma schema and client"
```

---

### Task 3: 日期工具（Asia/Shanghai 按日）

**Files:**
- Create: `src/lib/date.ts`
- Test: `tests/lib/date.test.ts`（替换 Task 1 的冒烟测试）

**Interfaces:**
- Consumes: 无
- Produces:
  - `toShanghaiDateString(d: Date): string` → `"YYYY-MM-DD"`
  - `daysBetween(from: Date, to: Date): number` → 按上海时区整日差（`to - from`，可为负）
  - `computeExpiryDate(productionDate: Date, shelfLifeDays: number): Date`

- [ ] **Step 1: 写失败测试**

`tests/lib/date.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { toShanghaiDateString, daysBetween, computeExpiryDate } from "@/lib/date";

describe("date utils", () => {
  it("formats a date in Shanghai timezone", () => {
    // 2026-08-17T20:00:00Z = 2026-08-18 04:00 上海
    expect(toShanghaiDateString(new Date("2026-08-17T20:00:00Z"))).toBe("2026-08-18");
  });
  it("computes whole-day difference", () => {
    const a = new Date("2026-08-17T00:00:00+08:00");
    const b = new Date("2026-08-20T00:00:00+08:00");
    expect(daysBetween(a, b)).toBe(3);
    expect(daysBetween(b, a)).toBe(-3);
  });
  it("adds shelf life days to production date", () => {
    const p = new Date("2026-08-01T00:00:00+08:00");
    expect(toShanghaiDateString(computeExpiryDate(p, 10))).toBe("2026-08-11");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/lib/date.test.ts`
Expected: FAIL（模块/函数未定义）

- [ ] **Step 3: 实现 date.ts**

`src/lib/date.ts`：
```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/lib/date.test.ts`
Expected: 3 passed

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add Shanghai-timezone date utilities"
```

---

### Task 4: 到期/提醒判定与消息组装（核心纯函数）

**Files:**
- Create: `src/lib/expiry.ts`
- Test: `tests/lib/expiry.test.ts`

**Interfaces:**
- Consumes: `daysBetween`, `toShanghaiDateString`（`@/lib/date`）
- Produces:
  ```ts
  export interface FoodForCheck {
    id: string; name: string; quantity?: string | null;
    expiryDate: Date; reminderDays: number[];
  }
  export interface SentReminder { foodItemId: string; reminderDay: number; }
  export interface DueItem {
    foodId: string; name: string; quantity?: string | null;
    daysLeft: number; reminderDay: number; expired: boolean;
  }
  export function findDueReminders(foods: FoodForCheck[], sent: SentReminder[], today: Date): DueItem[];
  export function buildReminderMessage(due: DueItem[], today: Date): { title: string; desp: string };
  ```
- 规则：过期 `daysLeft < 0` → `reminderDay = -1, expired = true`；否则取满足 `daysLeft <= d` 的**最小**节点 `d`（当前最相关的阈值），**仅当该节点未发过**时才提醒（**不下探**到更大的未发节点）；每样食品当天最多一条。

- [ ] **Step 1: 写失败测试**

`tests/lib/expiry.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { findDueReminders, buildReminderMessage, FoodForCheck } from "@/lib/expiry";

const today = new Date("2026-08-17T12:00:00+08:00");
const mk = (id: string, name: string, daysFromToday: number, reminderDays = [30, 7, 3]): FoodForCheck => ({
  id, name, expiryDate: new Date(new Date("2026-08-17T00:00:00+08:00").getTime() + daysFromToday * 86400000), reminderDays,
});

describe("findDueReminders", () => {
  it("hits the 3-day node when 3 days left and not sent", () => {
    const due = findDueReminders([mk("a", "牛奶", 3)], [], today);
    expect(due).toEqual([{ foodId: "a", name: "牛奶", quantity: undefined, daysLeft: 3, reminderDay: 3, expired: false }]);
  });
  it("does not resend an already-sent node", () => {
    const due = findDueReminders([mk("a", "牛奶", 3)], [{ foodItemId: "a", reminderDay: 3 }], today);
    expect(due).toEqual([]);
  });
  it("catches up a missed node (7 left but 30 not sent picks 7)", () => {
    const due = findDueReminders([mk("a", "鸡蛋", 6)], [{ foodItemId: "a", reminderDay: 30 }], today);
    expect(due[0].reminderDay).toBe(7);
  });
  it("marks expired items with reminderDay -1", () => {
    const due = findDueReminders([mk("a", "豆腐", -2)], [], today);
    expect(due[0]).toMatchObject({ reminderDay: -1, expired: true });
  });
  it("does not resend expired once logged", () => {
    const due = findDueReminders([mk("a", "豆腐", -2)], [{ foodItemId: "a", reminderDay: -1 }], today);
    expect(due).toEqual([]);
  });
});

describe("buildReminderMessage", () => {
  it("groups items by daysLeft and lists expired", () => {
    const due = [
      { foodId: "a", name: "牛奶", quantity: "2盒", daysLeft: 3, reminderDay: 3, expired: false },
      { foodId: "b", name: "菠菜", quantity: null, daysLeft: 3, reminderDay: 3, expired: false },
      { foodId: "c", name: "豆腐", quantity: null, daysLeft: -2, reminderDay: -1, expired: true },
    ];
    const { title, desp } = buildReminderMessage(due, today);
    expect(title).toContain("冰箱提醒");
    expect(desp).toContain("还有 3 天到期：牛奶(2盒)、菠菜");
    expect(desp).toContain("已过期：豆腐");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/lib/expiry.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 expiry.ts**

`src/lib/expiry.ts`：
```ts
import { daysBetween, toShanghaiDateString } from "@/lib/date";

export interface FoodForCheck {
  id: string; name: string; quantity?: string | null;
  expiryDate: Date; reminderDays: number[];
}
export interface SentReminder { foodItemId: string; reminderDay: number; }
export interface DueItem {
  foodId: string; name: string; quantity?: string | null;
  daysLeft: number; reminderDay: number; expired: boolean;
}

export function findDueReminders(foods: FoodForCheck[], sent: SentReminder[], today: Date): DueItem[] {
  const sentSet = new Set(sent.map((s) => `${s.foodItemId}:${s.reminderDay}`));
  const out: DueItem[] = [];
  for (const f of foods) {
    const daysLeft = daysBetween(today, f.expiryDate);
    if (daysLeft < 0) {
      if (!sentSet.has(`${f.id}:-1`)) {
        out.push({ foodId: f.id, name: f.name, quantity: f.quantity, daysLeft, reminderDay: -1, expired: true });
      }
      continue;
    }
    // 取满足 daysLeft <= d 的最小节点（当前最相关阈值），仅当它未发过才提醒，不下探
    const nodes = [...f.reminderDays].sort((a, b) => a - b);
    const applicable = nodes.find((d) => daysLeft <= d);
    if (applicable !== undefined && !sentSet.has(`${f.id}:${applicable}`)) {
      out.push({ foodId: f.id, name: f.name, quantity: f.quantity, daysLeft, reminderDay: applicable, expired: false });
    }
  }
  return out;
}

function label(item: DueItem): string {
  return item.quantity ? `${item.name}(${item.quantity})` : item.name;
}

export function buildReminderMessage(due: DueItem[], today: Date): { title: string; desp: string } {
  const dateStr = toShanghaiDateString(today);
  const title = `🧊 冰箱提醒（${dateStr}）`;
  const active = due.filter((d) => !d.expired);
  const expired = due.filter((d) => d.expired);
  const byDays = new Map<number, DueItem[]>();
  for (const it of active) {
    if (!byDays.has(it.daysLeft)) byDays.set(it.daysLeft, []);
    byDays.get(it.daysLeft)!.push(it);
  }
  const lines: string[] = [title, ""];
  for (const days of [...byDays.keys()].sort((a, b) => a - b)) {
    const names = byDays.get(days)!.map(label).join("、");
    const icon = days <= 3 ? "⚠️" : "⏳";
    lines.push(`${icon} 还有 ${days} 天到期：${names}`);
  }
  if (expired.length) lines.push(`❌ 已过期：${expired.map(label).join("、")}`);
  return { title, desp: lines.join("\n") };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/lib/expiry.test.ts`
Expected: 全部 passed

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add expiry reminder detection and message builder"
```

---

### Task 5: Server酱推送封装

**Files:**
- Create: `src/lib/notify.ts`
- Test: `tests/lib/notify.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `export async function sendServerChan(sendkey: string, title: string, desp: string): Promise<boolean>`
  - 成功返回 `true`，失败（网络异常或返回码非 0）返回 `false`，不抛异常。

- [ ] **Step 1: 写失败测试（mock fetch）**

`tests/lib/notify.test.ts`：
```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/lib/notify.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 notify.ts**

`src/lib/notify.ts`：
```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/lib/notify.test.ts`
Expected: 3 passed

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add Server酱 push helper"
```

---

### Task 6: 百炼推菜封装（可替换）

**Files:**
- Create: `src/lib/ai.ts`
- Test: `tests/lib/ai.test.ts`

**Interfaces:**
- Consumes: 无（读环境变量 `DASHSCOPE_API_KEY` / `DASHSCOPE_BASE_URL` / `DASHSCOPE_MODEL`）
- Produces:
  ```ts
  export interface RecipeInput { ingredients: string[]; expiringSoon: string[]; preference: "homestyle" | "fatloss"; }
  export interface Recipe { name: string; ingredients: string[]; steps: string[]; usesExpiring: string[]; calories?: string; }
  export async function generateRecipes(input: RecipeInput): Promise<Recipe[]>;
  ```
  - 内部用 OpenAI 兼容 `POST {BASE_URL}/chat/completions`，要求模型返回 JSON。失败抛错（由 API 层捕获）。

- [ ] **Step 1: 写失败测试（mock fetch，校验 prompt 与解析）**

`tests/lib/ai.test.ts`：
```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/lib/ai.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 ai.ts**

`src/lib/ai.ts`：
```ts
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

export async function generateRecipes(input: RecipeInput): Promise<Recipe[]> {
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
  const parsed = JSON.parse(data.choices[0].message.content) as { recipes: Recipe[] };
  return parsed.recipes ?? [];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/lib/ai.test.ts`
Expected: passed

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add Bailian (Qwen) recipe generation helper"
```

---

### Task 7: API 密钥校验工具

**Files:**
- Create: `src/lib/auth.ts`
- Test: `tests/lib/auth.test.ts`

**Interfaces:**
- Consumes: 无（读 `process.env.APP_SECRET` / `process.env.CRON_SECRET`）
- Produces:
  - `export function checkAppSecret(req: Request): boolean` — 校验请求头 `x-app-secret === APP_SECRET`
  - `export function checkCronSecret(req: Request): boolean` — 校验 `Authorization === "Bearer <CRON_SECRET>"`

- [ ] **Step 1: 写失败测试**

`tests/lib/auth.test.ts`：
```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/lib/auth.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 auth.ts**

`src/lib/auth.ts`：
```ts
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
```

- [ ] **Step 4: 运行确认通过并提交**

Run: `npm test -- tests/lib/auth.test.ts`
Expected: 3 passed
```bash
git add -A
git commit -m "feat: add API secret checks"
```

---

### Task 8: 食品 CRUD API + 输入规整

**Files:**
- Create: `src/lib/food-input.ts`（纯函数：把表单输入规整为可写入的记录）, `src/app/api/foods/route.ts`, `src/app/api/foods/[id]/route.ts`
- Test: `tests/lib/food-input.test.ts`

**Interfaces:**
- Consumes: `computeExpiryDate`（`@/lib/date`）, `prisma`（`@/lib/db`）, `checkAppSecret`（`@/lib/auth`）
- Produces:
  ```ts
  export interface FoodInput {
    name: string; category?: string | null; quantity?: string | null;
    storage?: "FRIDGE" | "FREEZER" | "PANTRY";
    productionDate?: string | null; shelfLifeDays?: number | null;
    expiryDate?: string | null; reminderDays?: number[] | null;
  }
  export interface NormalizedFood {
    name: string; category: string | null; quantity: string | null;
    storage: "FRIDGE" | "FREEZER" | "PANTRY";
    productionDate: Date | null; shelfLifeDays: number | null;
    expiryDate: Date; reminderDays: number[];
  }
  // 抛 Error(message) 表示校验失败；defaultReminderDays 用于未指定时兜底
  export function normalizeFood(input: FoodInput, defaultReminderDays: number[]): NormalizedFood;
  ```
  - 规则：`name` 必填；到期日来源二选一——有 `expiryDate` 直接用；否则用 `productionDate + shelfLifeDays` 计算；两者都无则抛错。`shelfLifeDays` 若给出须为正整数。`reminderDays` 缺省用 `defaultReminderDays`。
- REST：`GET /api/foods`（列表，按 expiryDate 升序）；`POST /api/foods`（创建）；`GET/PUT/DELETE /api/foods/[id]`。写操作要求 `checkAppSecret`，否则 401。

- [ ] **Step 1: 写 normalizeFood 失败测试**

`tests/lib/food-input.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { normalizeFood } from "@/lib/food-input";
import { toShanghaiDateString } from "@/lib/date";

const DEF = [30, 7, 3];

describe("normalizeFood", () => {
  it("uses explicit expiryDate when provided", () => {
    const n = normalizeFood({ name: "牛奶", expiryDate: "2026-09-01" }, DEF);
    expect(n.name).toBe("牛奶");
    expect(toShanghaiDateString(n.expiryDate)).toBe("2026-09-01");
    expect(n.reminderDays).toEqual(DEF);
  });
  it("computes expiry from production + shelf life", () => {
    const n = normalizeFood({ name: "酸奶", productionDate: "2026-08-01", shelfLifeDays: 10 }, DEF);
    expect(toShanghaiDateString(n.expiryDate)).toBe("2026-08-11");
  });
  it("throws when neither expiry nor (production+shelfLife) given", () => {
    expect(() => normalizeFood({ name: "x" }, DEF)).toThrow();
  });
  it("throws on non-positive shelf life", () => {
    expect(() => normalizeFood({ name: "x", productionDate: "2026-08-01", shelfLifeDays: 0 }, DEF)).toThrow();
  });
  it("keeps custom reminderDays", () => {
    const n = normalizeFood({ name: "x", expiryDate: "2026-09-01", reminderDays: [1] }, DEF);
    expect(n.reminderDays).toEqual([1]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/lib/food-input.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 food-input.ts**

`src/lib/food-input.ts`：
```ts
import { computeExpiryDate } from "@/lib/date";

export interface FoodInput {
  name: string; category?: string | null; quantity?: string | null;
  storage?: "FRIDGE" | "FREEZER" | "PANTRY";
  productionDate?: string | null; shelfLifeDays?: number | null;
  expiryDate?: string | null; reminderDays?: number[] | null;
}
export interface NormalizedFood {
  name: string; category: string | null; quantity: string | null;
  storage: "FRIDGE" | "FREEZER" | "PANTRY";
  productionDate: Date | null; shelfLifeDays: number | null;
  expiryDate: Date; reminderDays: number[];
}

function parseDate(s: string): Date {
  const d = new Date(`${s}T00:00:00+08:00`);
  if (isNaN(d.getTime())) throw new Error(`无效日期：${s}`);
  return d;
}

export function normalizeFood(input: FoodInput, defaultReminderDays: number[]): NormalizedFood {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("名称必填");

  const shelfLifeDays = input.shelfLifeDays ?? null;
  if (shelfLifeDays !== null && (!Number.isInteger(shelfLifeDays) || shelfLifeDays <= 0)) {
    throw new Error("保质期天数须为正整数");
  }
  const productionDate = input.productionDate ? parseDate(input.productionDate) : null;

  let expiryDate: Date;
  if (input.expiryDate) {
    expiryDate = parseDate(input.expiryDate);
  } else if (productionDate && shelfLifeDays) {
    expiryDate = computeExpiryDate(productionDate, shelfLifeDays);
  } else {
    throw new Error("请填写到期日，或同时填写生产日期与保质期天数");
  }

  const reminderDays = input.reminderDays && input.reminderDays.length ? input.reminderDays : defaultReminderDays;

  return {
    name,
    category: input.category?.trim() || null,
    quantity: input.quantity?.trim() || null,
    storage: input.storage ?? "FRIDGE",
    productionDate, shelfLifeDays, expiryDate, reminderDays,
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/lib/food-input.test.ts`
Expected: 全部 passed

- [ ] **Step 5: 实现列表/创建路由**

`src/app/api/foods/route.ts`：
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAppSecret } from "@/lib/auth";
import { normalizeFood, FoodInput } from "@/lib/food-input";

async function defaultReminderDays(): Promise<number[]> {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return s?.defaultReminderDays ?? [30, 7, 3];
}

export async function GET() {
  const foods = await prisma.foodItem.findMany({ orderBy: { expiryDate: "asc" } });
  return NextResponse.json(foods);
}

export async function POST(req: Request) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as FoodInput;
    const n = normalizeFood(body, await defaultReminderDays());
    const created = await prisma.foodItem.create({ data: n });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

`src/app/api/foods/[id]/route.ts`：
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAppSecret } from "@/lib/auth";
import { normalizeFood, FoodInput } from "@/lib/food-input";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const food = await prisma.foodItem.findUnique({ where: { id: params.id } });
  if (!food) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(food);
}

export async function PUT(req: Request, { params }: Ctx) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as FoodInput;
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    const n = normalizeFood(body, s?.defaultReminderDays ?? [30, 7, 3]);
    const updated = await prisma.foodItem.update({ where: { id: params.id }, data: n });
    // 修改后清掉旧提醒记录，让新到期日重新按节点提醒
    await prisma.reminderLog.deleteMany({ where: { foodItemId: params.id } });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.foodItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: 手动验证 CRUD（需本地 DB）**

Run（先 `npm run dev`）:
```bash
curl -s localhost:3000/api/foods
curl -s -XPOST localhost:3000/api/foods -H "x-app-secret: $APP_SECRET" -H "Content-Type: application/json" -d '{"name":"牛奶","expiryDate":"2026-09-01"}'
```
Expected: 第一条返回 `[]` 或已有数据；第二条返回 201 与新建对象。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: add food CRUD API with input normalization"
```

---

### Task 9: 设置 API

**Files:**
- Create: `src/app/api/settings/route.ts`

**Interfaces:**
- Consumes: `prisma`（`@/lib/db`）, `checkAppSecret`（`@/lib/auth`）
- Produces: `GET /api/settings`（读取，不存在则用默认值创建）；`PUT /api/settings`（更新 `defaultReminderDays` / `serverchanSendkey` / `pushHour`）。
- 注意：`GET` 返回时**不回传** `serverchanSendkey` 明文，用布尔 `hasSendkey` 表示是否已配置。

- [ ] **Step 1: 实现 settings 路由**

`src/app/api/settings/route.ts`：
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkAppSecret } from "@/lib/auth";

async function getOrCreate() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function GET() {
  const s = await getOrCreate();
  return NextResponse.json({
    defaultReminderDays: s.defaultReminderDays,
    pushHour: s.pushHour,
    hasSendkey: Boolean(s.serverchanSendkey),
  });
}

export async function PUT(req: Request) {
  if (!checkAppSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    defaultReminderDays?: number[]; serverchanSendkey?: string; pushHour?: number;
  };
  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(body.defaultReminderDays ? { defaultReminderDays: body.defaultReminderDays } : {}),
      ...(body.serverchanSendkey !== undefined ? { serverchanSendkey: body.serverchanSendkey } : {}),
      ...(body.pushHour !== undefined ? { pushHour: body.pushHour } : {}),
    },
    create: { id: 1, ...body },
  });
  return NextResponse.json({ defaultReminderDays: s.defaultReminderDays, pushHour: s.pushHour, hasSendkey: Boolean(s.serverchanSendkey) });
}
```

- [ ] **Step 2: 手动验证并提交**

Run: `curl -s localhost:3000/api/settings`
Expected: 返回默认 `{"defaultReminderDays":[30,7,3],"pushHour":12,"hasSendkey":false}`
```bash
git add -A
git commit -m "feat: add settings API"
```

---

### Task 10: 推菜 API

**Files:**
- Create: `src/app/api/recipes/route.ts`

**Interfaces:**
- Consumes: `prisma`（`@/lib/db`）, `generateRecipes`（`@/lib/ai`）, `daysBetween`（`@/lib/date`）
- Produces: `POST /api/recipes` body `{ preference: "homestyle" | "fatloss" }` → `{ recipes: Recipe[] }`。
- 逻辑：取全部食品，`expiringSoon` = 距到期 ≤7 天（含已过期）的名称；`ingredients` 按距到期升序排列的名称（快到期在前）。AI 失败返回 502 与友好错误。

- [ ] **Step 1: 实现 recipes 路由**

`src/app/api/recipes/route.ts`：
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRecipes } from "@/lib/ai";
import { daysBetween } from "@/lib/date";

export async function POST(req: Request) {
  const { preference } = (await req.json()) as { preference: "homestyle" | "fatloss" };
  const foods = await prisma.foodItem.findMany();
  const now = new Date();
  const sorted = [...foods].sort((a, b) => daysBetween(now, a.expiryDate) - daysBetween(now, b.expiryDate));
  const ingredients = sorted.map((f) => f.name);
  const expiringSoon = sorted.filter((f) => daysBetween(now, f.expiryDate) <= 7).map((f) => f.name);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "冰箱是空的，先添加一些食材吧" }, { status: 400 });
  }
  try {
    const recipes = await generateRecipes({ ingredients, expiringSoon, preference: preference ?? "homestyle" });
    return NextResponse.json({ recipes });
  } catch (e) {
    return NextResponse.json({ error: "推菜暂时不可用，请稍后再试" }, { status: 502 });
  }
}
```

- [ ] **Step 2: 手动验证并提交**

Run: `curl -s -XPOST localhost:3000/api/recipes -H "Content-Type: application/json" -d '{"preference":"homestyle"}'`
Expected: 返回 `{"recipes":[...]}`（需已配置 `DASHSCOPE_API_KEY` 且冰箱有食材）
```bash
git add -A
git commit -m "feat: add recipe recommendation API"
```

---

### Task 11: 每日 Cron 检查与推送端点

**Files:**
- Create: `src/app/api/cron/check/route.ts`, `vercel.json`

**Interfaces:**
- Consumes: `prisma`（`@/lib/db`）, `findDueReminders` / `buildReminderMessage`（`@/lib/expiry`）, `sendServerChan`（`@/lib/notify`）, `checkCronSecret`（`@/lib/auth`）
- Produces: `GET /api/cron/check` — Vercel Cron 触发；返回 `{ sent: boolean, count: number }`。
- 逻辑：校验 CronSecret → 读所有食品 + 已发提醒 + settings.sendkey → `findDueReminders` → 无命中直接返回 → 有命中则 `buildReminderMessage` 并 `sendServerChan` → **仅当推送成功**才写入 `reminder_log`（失败不写，下次补发）。

- [ ] **Step 1: 实现 cron 路由**

`src/app/api/cron/check/route.ts`：
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findDueReminders, buildReminderMessage, FoodForCheck } from "@/lib/expiry";
import { sendServerChan } from "@/lib/notify";
import { checkCronSecret } from "@/lib/auth";

export async function GET(req: Request) {
  if (!checkCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [foods, logs, settings] = await Promise.all([
    prisma.foodItem.findMany(),
    prisma.reminderLog.findMany({ select: { foodItemId: true, reminderDay: true } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const forCheck: FoodForCheck[] = foods.map((f) => ({
    id: f.id, name: f.name, quantity: f.quantity, expiryDate: f.expiryDate, reminderDays: f.reminderDays,
  }));
  const today = new Date();
  const due = findDueReminders(forCheck, logs, today);
  if (due.length === 0) return NextResponse.json({ sent: false, count: 0 });

  const sendkey = settings?.serverchanSendkey ?? process.env.SERVERCHAN_SENDKEY ?? "";
  const { title, desp } = buildReminderMessage(due, today);
  const ok = await sendServerChan(sendkey, title, desp);
  if (!ok) return NextResponse.json({ sent: false, count: due.length, error: "push failed" }, { status: 502 });

  await prisma.reminderLog.createMany({
    data: due.map((d) => ({ foodItemId: d.foodId, reminderDay: d.reminderDay })),
    skipDuplicates: true,
  });
  return NextResponse.json({ sent: true, count: due.length });
}
```

- [ ] **Step 2: 配置 vercel.json 定时任务**

`vercel.json`（Vercel Cron 用 UTC；中午 12:00 Asia/Shanghai = 04:00 UTC）：
```json
{
  "crons": [
    { "path": "/api/cron/check", "schedule": "0 4 * * *" }
  ]
}
```

- [ ] **Step 3: 手动验证（带 CRON_SECRET）并提交**

Run: `curl -s localhost:3000/api/cron/check -H "Authorization: Bearer $CRON_SECRET"`
Expected: 返回 `{"sent":false,"count":0}`（无临期时）或推送成功 `{"sent":true,...}`
```bash
git add -A
git commit -m "feat: add daily cron check with Server酱 push"
```

---

### Task 12: 底部导航 + 食品列表首页

**Files:**
- Create: `src/components/TabBar.tsx`, `src/components/FoodCard.tsx`
- Modify: `src/app/layout.tsx`（加入 TabBar 与底部留白）, `src/app/page.tsx`（列表页）

**Interfaces:**
- Consumes: `GET /api/foods`, `daysBetween`（`@/lib/date`）
- Produces: 首页展示食品卡片，按到期日升序；临期（≤7天）红色、已过期灰色；顶部提醒条汇总临期数量。

- [ ] **Step 1: 写 TabBar**

`src/components/TabBar.tsx`：
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "冰箱" },
  { href: "/add", label: "录入" },
  { href: "/recipes", label: "推菜" },
  { href: "/settings", label: "设置" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href}
          className={`flex-1 text-center py-3 text-sm ${path === t.href ? "text-blue-600 font-semibold" : "text-gray-500"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: 写 FoodCard**

`src/components/FoodCard.tsx`：
```tsx
import Link from "next/link";
import { daysBetween, toShanghaiDateString } from "@/lib/date";

export interface FoodView {
  id: string; name: string; quantity: string | null; storage: string;
  expiryDate: string; category: string | null;
}

const storageLabel: Record<string, string> = { FRIDGE: "冷藏", FREEZER: "冷冻", PANTRY: "常温" };

export default function FoodCard({ food }: { food: FoodView }) {
  const daysLeft = daysBetween(new Date(), new Date(food.expiryDate));
  const expired = daysLeft < 0;
  const soon = !expired && daysLeft <= 7;
  const tone = expired ? "bg-gray-100 text-gray-400" : soon ? "bg-red-50 border-red-300" : "bg-white";
  return (
    <Link href={`/edit/${food.id}`} className={`block rounded-lg border p-3 mb-2 ${tone}`}>
      <div className="flex justify-between">
        <span className="font-medium">{food.name}{food.quantity ? `（${food.quantity}）` : ""}</span>
        <span className="text-sm">{storageLabel[food.storage] ?? food.storage}</span>
      </div>
      <div className="text-sm mt-1">
        到期：{toShanghaiDateString(new Date(food.expiryDate))}
        {expired ? "（已过期）" : `（还有 ${daysLeft} 天）`}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: 更新 layout 加入 TabBar**

`src/app/layout.tsx`：
```tsx
import "./globals.css";
import TabBar from "@/components/TabBar";
export const metadata = { title: "冰箱管家", description: "冰箱食品管理与临期提醒" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 pb-16">
        {children}
        <TabBar />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 写列表首页（Server Component 直接查库）**

`src/app/page.tsx`：
```tsx
import { prisma } from "@/lib/db";
import { daysBetween } from "@/lib/date";
import FoodCard, { FoodView } from "@/components/FoodCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const foods = await prisma.foodItem.findMany({ orderBy: { expiryDate: "asc" } });
  const now = new Date();
  const soonCount = foods.filter((f) => daysBetween(now, f.expiryDate) <= 7).length;
  const views: FoodView[] = foods.map((f) => ({
    id: f.id, name: f.name, quantity: f.quantity, storage: f.storage,
    expiryDate: f.expiryDate.toISOString(), category: f.category,
  }));
  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">🧊 我的冰箱</h1>
      {soonCount > 0 && (
        <div className="rounded bg-red-100 text-red-700 px-3 py-2 mb-3 text-sm">
          有 {soonCount} 样食品临期或已过期，注意查看
        </div>
      )}
      {views.length === 0 ? (
        <p className="text-gray-500">还没有食品，点底部「录入」添加。</p>
      ) : (
        views.map((f) => <FoodCard key={f.id} food={f} />)
      )}
    </main>
  );
}
```

- [ ] **Step 5: 手动验证并提交**

Run: `npm run dev` → 打开 `localhost:3000`
Expected: 列表页渲染；有临期数据时顶部出现红色提醒条。
```bash
git add -A
git commit -m "feat: add tab bar and food list home page"
```

---

### Task 13: 录入/编辑表单

**Files:**
- Create: `src/components/FoodForm.tsx`, `src/app/add/page.tsx`, `src/app/edit/[id]/page.tsx`

**Interfaces:**
- Consumes: `POST /api/foods`, `GET /api/foods/[id]`, `PUT /api/foods/[id]`, `DELETE /api/foods/[id]`
- Produces: 共用表单组件，支持新建与编辑；提交时带 `x-app-secret` 头（从 `NEXT_PUBLIC` 不安全——见备注，改由用户在设置里保存到 localStorage）。
- 备注：单用户自用，前端把 `APP_SECRET` 存 localStorage（键 `appSecret`），请求写操作时带上 `x-app-secret`。设置页提供输入框保存该值。

- [ ] **Step 1: 写 FoodForm（客户端组件）**

`src/components/FoodForm.tsx`：
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FoodFormValues {
  id?: string;
  name: string; category: string; quantity: string;
  storage: "FRIDGE" | "FREEZER" | "PANTRY";
  productionDate: string; shelfLifeDays: string; expiryDate: string;
  reminderDays: string; // 逗号分隔
}

const empty: FoodFormValues = {
  name: "", category: "", quantity: "", storage: "FRIDGE",
  productionDate: "", shelfLifeDays: "", expiryDate: "", reminderDays: "",
};

export default function FoodForm({ initial }: { initial?: FoodFormValues }) {
  const [v, setV] = useState<FoodFormValues>(initial ?? empty);
  const [err, setErr] = useState("");
  const router = useRouter();
  const editing = Boolean(v.id);

  function set<K extends keyof FoodFormValues>(k: K, val: FoodFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit() {
    setErr("");
    const secret = localStorage.getItem("appSecret") ?? "";
    const payload = {
      name: v.name, category: v.category || null, quantity: v.quantity || null, storage: v.storage,
      productionDate: v.productionDate || null,
      shelfLifeDays: v.shelfLifeDays ? Number(v.shelfLifeDays) : null,
      expiryDate: v.expiryDate || null,
      reminderDays: v.reminderDays ? v.reminderDays.split(",").map((s) => Number(s.trim())).filter((n) => n > 0) : null,
    };
    const res = await fetch(editing ? `/api/foods/${v.id}` : "/api/foods", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "x-app-secret": secret },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { setErr((await res.json()).error ?? "保存失败"); return; }
    router.push("/");
    router.refresh();
  }

  async function remove() {
    const secret = localStorage.getItem("appSecret") ?? "";
    await fetch(`/api/foods/${v.id}`, { method: "DELETE", headers: { "x-app-secret": secret } });
    router.push("/"); router.refresh();
  }

  const field = "w-full border rounded px-3 py-2 mb-3";
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">{editing ? "编辑食品" : "录入食品"}</h1>
      {err && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{err}</div>}
      <input className={field} placeholder="名称*" value={v.name} onChange={(e) => set("name", e.target.value)} />
      <input className={field} placeholder="分类（如 乳制品）" value={v.category} onChange={(e) => set("category", e.target.value)} />
      <input className={field} placeholder="数量（如 2盒）" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} />
      <select className={field} value={v.storage} onChange={(e) => set("storage", e.target.value as FoodFormValues["storage"])}>
        <option value="FRIDGE">冷藏</option><option value="FREEZER">冷冻</option><option value="PANTRY">常温</option>
      </select>
      <label className="text-sm text-gray-600">生产日期</label>
      <input type="date" className={field} value={v.productionDate} onChange={(e) => set("productionDate", e.target.value)} />
      <input className={field} type="number" placeholder="保质期天数" value={v.shelfLifeDays} onChange={(e) => set("shelfLifeDays", e.target.value)} />
      <label className="text-sm text-gray-600">或直接填到期日</label>
      <input type="date" className={field} value={v.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
      <input className={field} placeholder="提醒节点（留空用默认，如 30,7,3）" value={v.reminderDays} onChange={(e) => set("reminderDays", e.target.value)} />
      <button onClick={submit} className="w-full bg-blue-600 text-white rounded py-2 mb-2">保存</button>
      {editing && <button onClick={remove} className="w-full bg-red-100 text-red-700 rounded py-2">删除</button>}
    </div>
  );
}
```

- [ ] **Step 2: 写 add 页**

`src/app/add/page.tsx`：
```tsx
import FoodForm from "@/components/FoodForm";
export default function AddPage() { return <FoodForm />; }
```

- [ ] **Step 3: 写 edit 页（服务端取数据后传入表单）**

`src/app/edit/[id]/page.tsx`：
```tsx
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import FoodForm, { FoodFormValues } from "@/components/FoodForm";
import { toShanghaiDateString } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: { id: string } }) {
  const f = await prisma.foodItem.findUnique({ where: { id: params.id } });
  if (!f) notFound();
  const initial: FoodFormValues = {
    id: f.id, name: f.name, category: f.category ?? "", quantity: f.quantity ?? "",
    storage: f.storage,
    productionDate: f.productionDate ? toShanghaiDateString(f.productionDate) : "",
    shelfLifeDays: f.shelfLifeDays?.toString() ?? "",
    expiryDate: toShanghaiDateString(f.expiryDate),
    reminderDays: f.reminderDays.join(","),
  };
  return <FoodForm initial={initial} />;
}
```

- [ ] **Step 4: 手动验证并提交**

Run: 打开 `/add` 录入一条 → 回到首页看到卡片 → 点卡片进 `/edit/[id]` 改动保存/删除。
Expected: 增改删均生效（需先在设置里保存 `appSecret`，见 Task 15）。
```bash
git add -A
git commit -m "feat: add food create/edit form and pages"
```

---

### Task 14: 推菜页

**Files:**
- Create: `src/app/recipes/page.tsx`

**Interfaces:**
- Consumes: `POST /api/recipes`
- Produces: 选择「家常/减脂」→ 生成 → 展示 2-3 道菜（菜名、用料、步骤、热量、"用掉临期食材"标注）。含加载中与错误提示。

- [ ] **Step 1: 写推菜页（客户端组件）**

`src/app/recipes/page.tsx`：
```tsx
"use client";
import { useState } from "react";

interface Recipe { name: string; ingredients: string[]; steps: string[]; usesExpiring: string[]; calories?: string; }

export default function RecipesPage() {
  const [preference, setPreference] = useState<"homestyle" | "fatloss">("homestyle");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  async function generate() {
    setLoading(true); setErr(""); setRecipes([]);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "生成失败"); return; }
      setRecipes(data.recipes ?? []);
    } catch { setErr("网络错误，请稍后再试"); }
    finally { setLoading(false); }
  }

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-3">🍳 今天吃什么</h1>
      <div className="flex gap-2 mb-3">
        {(["homestyle", "fatloss"] as const).map((p) => (
          <button key={p} onClick={() => setPreference(p)}
            className={`flex-1 rounded py-2 border ${preference === p ? "bg-blue-600 text-white" : "bg-white"}`}>
            {p === "homestyle" ? "家常" : "减脂"}
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading} className="w-full bg-green-600 text-white rounded py-2 mb-3 disabled:opacity-50">
        {loading ? "生成中…" : "根据冰箱食材推荐"}
      </button>
      {err && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{err}</div>}
      {recipes.map((r, i) => (
        <div key={i} className="rounded-lg border bg-white p-3 mb-3">
          <div className="font-semibold">{r.name}{r.calories ? ` · ${r.calories}` : ""}</div>
          {r.usesExpiring.length > 0 && (
            <div className="text-xs text-red-600 mt-1">用掉临期：{r.usesExpiring.join("、")}</div>
          )}
          <div className="text-sm mt-2">用料：{r.ingredients.join("、")}</div>
          <ol className="text-sm mt-1 list-decimal list-inside">
            {r.steps.map((s, j) => <li key={j}>{s}</li>)}
          </ol>
        </div>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: 手动验证并提交**

Run: 打开 `/recipes` → 选偏好 → 点生成
Expected: 展示菜谱；冰箱空时提示先添加食材；AI 不可用时显示友好错误。
```bash
git add -A
git commit -m "feat: add recipe recommendation page"
```

---

### Task 15: 设置页（含 appSecret 本地保存）

**Files:**
- Create: `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `GET /api/settings`, `PUT /api/settings`
- Produces: 表单设置默认提醒节点、Server酱 SendKey、推送小时；并提供「访问密钥（appSecret）」输入，保存到 localStorage 供写操作使用。

- [ ] **Step 1: 写设置页**

`src/app/settings/page.tsx`：
```tsx
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
```

- [ ] **Step 2: 手动验证并提交**

Run: 打开 `/settings` → 填 appSecret 与 SendKey → 保存
Expected: 显示"已保存"；随后录入/编辑食品可正常写入。
```bash
git add -A
git commit -m "feat: add settings page with local appSecret"
```

---

### Task 16: PWA、README 与部署收尾

**Files:**
- Create: `public/manifest.webmanifest`, `README.md`
- Modify: `src/app/layout.tsx`（引用 manifest）

**Interfaces:**
- Consumes: 前述全部
- Produces: 可"添加到主屏幕"的 PWA 元信息；部署与配置说明。

- [ ] **Step 1: 写 manifest**

`public/manifest.webmanifest`：
```json
{
  "name": "冰箱管家",
  "short_name": "冰箱管家",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#2563eb",
  "icons": []
}
```

- [ ] **Step 2: layout 引用 manifest**

在 `src/app/layout.tsx` 的 `metadata` 中加入：
```tsx
export const metadata = {
  title: "冰箱管家",
  description: "冰箱食品管理与临期提醒",
  manifest: "/manifest.webmanifest",
};
```

- [ ] **Step 3: 写 README（部署步骤）**

`README.md`：
```markdown
# 冰箱管家 Fridge Keeper

自用的冰箱食品管理、临期微信提醒、AI 推菜网页应用。

## 本地运行
1. `npm install`
2. 复制 `.env.example` 为 `.env`，填入 `DATABASE_URL`（Neon）、`APP_SECRET`、`CRON_SECRET`、`DASHSCOPE_API_KEY`
3. `npx prisma migrate dev`
4. `npm run dev`

## 部署到 Vercel
1. 推到 GitHub，Vercel 导入该仓库
2. 在 Vercel 环境变量中配置 `.env.example` 里的所有键
3. `vercel.json` 已配置每日 04:00 UTC（= 中午 12:00 北京时间）触发 `/api/cron/check`
4. 首次部署后在 Neon 上执行 `prisma migrate deploy`

## 配置提醒
- 在 Server酱（sct.ftqq.com）获取 SendKey，填入应用「设置」页或环境变量 `SERVERCHAN_SENDKEY`
- 在应用「设置」页填入 `appSecret`（= 环境变量 `APP_SECRET`）后方可增删改
```

- [ ] **Step 4: 全量测试 + 提交**

Run: `npm test && npm run build`
Expected: 所有测试通过；构建成功。
```bash
git add -A
git commit -m "feat: add PWA manifest and deployment docs"
```

---

## 自检（对照设计文档）

- **食品 CRUD**：Task 8（API）+ Task 12/13（页面）✓
- **到期日计算（生产日期+保质期 或 直接填）**：Task 3 + Task 8（normalizeFood）✓
- **默认提醒 30/7/3 + 单项自定义**：Task 4（判定）+ Task 8/9（存取）✓
- **临期微信推送 + 合并 + 去重 + 漏跑补发**：Task 4 + Task 5 + Task 11 ✓
- **页面内临期高亮**：Task 12（FoodCard/提醒条）✓
- **AI 推菜（家常/减脂 + 临期优先 + 可替换）**：Task 6 + Task 10 + Task 14 ✓
- **每日 12:00 Asia/Shanghai 定时**：Task 11（vercel.json `0 4 * * *`）✓
- **错误处理（推送失败不写 log 补发 / AI 失败友好提示 / 表单校验）**：Task 11 / Task 10、14 / Task 8 ✓
- **单用户免登录 + 写操作密钥保护**：Task 7 + Task 13/15 ✓

