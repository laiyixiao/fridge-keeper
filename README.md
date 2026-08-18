# 冰箱管家 Fridge Keeper

冰箱食品管理、临期微信提醒、AI 菜谱推荐的网页应用（移动端优先，可加到手机主屏当 App 用）。

## 技术栈
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · Neon Postgres · Vitest · Vercel Cron

## 环境变量
| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | Neon Postgres 连接串（必填） |
| `DASHSCOPE_API_KEY` | 菜谱 AI 的 API Key / token（必填） |
| `DASHSCOPE_BASE_URL` | AI 接口地址（OpenAI 兼容），默认百炼标准端点 |
| `DASHSCOPE_MODEL` | 模型名，如 `qwen-plus` / `qwen3.7-plus` |
| `CRON_SECRET` | 保护每日定时任务接口（Vercel Cron 自动带此 Bearer） |
| `SERVERCHAN_SENDKEY` | Server酱 SendKey（也可在「设置」页填），用于微信推送 |
| `AI_PROVIDER` | 可选，设为 `anthropic` 时走 Anthropic 格式端点（配合 `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_MODEL`） |

> 注：当前版本为方便家庭共用，接口未做访问鉴权（定时任务除外）。公网部署即为公开访问，勿把网址随意外传；如需保护可后续加共享口令登录。

## 本地运行
1. `npm install`
2. 复制 `.env.example` 为 `.env`，至少填 `DATABASE_URL` 与 `DASHSCOPE_API_KEY`
3. `npx prisma db push`（首次建表）
4. `npm run dev`

## 部署到 Vercel
1. 代码推到 GitHub
2. Vercel 导入该仓库，在 Environment Variables 里配置上表变量
3. 部署完成后得到公网网址，手机浏览器打开即可，「添加到主屏幕」当 App 用
4. `vercel.json` 已配置每日 04:00 UTC（= 中午 12:00 北京时间）触发 `/api/cron/check`
5. 数据库表结构由 `prisma db push` / `prisma migrate` 维护（Neon 上执行一次即可）

## 配置微信提醒
在 Server酱（sct.ftqq.com）获取 SendKey，填入应用「设置」页或环境变量 `SERVERCHAN_SENDKEY`。
