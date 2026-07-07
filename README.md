# lighthouse-web

[Lighthouse Club](https://lighthouse.sync-value.com) 品牌站 —— Astro（v2.0.0）+ Supabase 认证/会员体系。

运营方：シンクバリュー株式会社（Syncvalue Inc.）。本站定位为社区的**新用户申请加入入口门户**，含 Supabase 驱动的会员中心（`/my`）与 Discord 账号绑定登录；同时作为运营方业务的公开说明页。

## 结构

```
src/pages/
  index.astro           落地页 /
  about.astro            关于
  account.astro          旧会员中心占位页，已废弃 → 302 重定向到 /my
  apply.astro             申请加入表单
  apply/confirmed.astro   申请提交确认页
  contact.astro           联系我们
  faq.astro               FAQ
  inside.astro            社区内部介绍
  my.astro                会员中心（SSR，需登录，查询本人会员状态）
  news.astro              动态
  pricing.astro           定价 / CTA 入口（统一指向 /apply）
  welcome.astro           付费/加入成功页 → 引导进 Discord
  legal/                  法务页（tos / privacy / tokushoho / guidelines）
  en/                     英文镜像页面（about/apply/contact/index/my/pricing）
  api/
    apply.ts              申请表单提交 API
    contact.ts             联系表单提交 API
  auth/
    login.astro            登录页
    callback.ts             OAuth 回调
    discord.ts               Discord OAuth 发起
    signout.ts               登出
  404.astro

src/components/     Header.astro / Footer.astro
src/i18n/           ui.ts（中英文案字典）
src/data/           site.ts（站点级配置数据）
src/lib/            supabase.ts（Supabase client 封装）等
```

## 本地开发

```bash
npm install
npm run dev       # astro dev，本地预览
npm run build     # astro build
npm run preview   # astro preview，本地预览构建产物
```

## 部署（Cloudflare）

`astro.config.mjs` 中 `output: 'static'` + `adapter: cloudflare()`：绝大多数页面预渲染为静态资源，仅 `/my`、`/auth/*`、`/account` 等页面显式 `export const prerender = false`，以 Cloudflare Pages Functions（Workers 运行时）走 SSR，用于读取登录态与调用 Supabase。部署方式为 Cloudflare Pages，构建命令 `npm run build`，输出目录 `dist/`（非纯静态托管，需 Pages 的 Functions 能力支持 SSR 路由）。

## 会员 / 支付流程现状

- **加入流程**：落地页与 Pricing 的 CTA 已统一指向 `/apply`（申请加入表单），不再使用旧版 `data-stripe-link` 占位方案——当前代码库未接入 Stripe，实际付费渠道以运营侧（人工/其他支付方式）处理，`apply` 提交后走确认页 `/apply/confirmed`。
- **会员中心**：`account/` 旧占位页已废弃，实现为 302 重定向到 `/my`；`/my` 为真正的会员中心，基于 Supabase 认证（`/auth/login`、`/auth/discord`、`/auth/callback`、`/auth/signout`），SSR 查询本人会员状态（tier / 到期日 / 支付渠道 / Discord 绑定情况）。
- **法律页**：`legal/*` 当前为占位结构，内容待律师终审后发布；公司 PII 未写入仓库，特商法页以占位符标注「準備中（弁護士確認後に記載）」。

## 文案口径（合规红线）

去金融化：市场只是并列板块之一，统一写「个人交流·非投资建议」；不突出荐股/投资，不编业绩。运营方提供的是交流环境与社区服务，不提供投资建议。
