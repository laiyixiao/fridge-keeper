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
