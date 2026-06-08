# lighthouse-web

[Lighthouse Club](https://lighthouse.sync-value.com) 品牌站 —— 纯静态 HTML/CSS/JS，无后端、无构建。

运营方：シンクバリュー株式会社（Syncvalue Inc.）。本站定位为社区的**新用户购买入口门户**，并预留会员订阅管理入口；同时作为运营方业务的公开说明页。

## 结构

```
index.html              落地页 /
assets/css/styles.css   共享样式（暖光灯塔调）
assets/js/main.js       极简交互（移动端导航、FAQ 手风琴、滚动淡入）
assets/img/lighthouse.svg 灯塔图标 / favicon
legal/tos.html          服务条款（占位，待律师）
legal/privacy.html      隐私政策（占位，待律师）
legal/tokushoho.html    特定商取引法に基づく表記（日文法定页骨架，待律师）
account/index.html      会员中心（占位，未来接 Stripe Customer Portal）
welcome/index.html      付费成功页（占位，未来引导进 Discord）
404.html                404
```

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 部署（Cloudflare Pages）

1. 在 Cloudflare Pages 新建项目，连接本 repo，构建命令留空、输出目录为根目录（纯静态）。
2. 在 Pages 项目的 **Custom domains** 添加 `lighthouse.sync-value.com`，按提示在 DNS 配置 CNAME。
3. 无需 GitHub Pages 的 `CNAME` 文件。

## 待接入（预留位）

- **Stripe**：落地页与 Pricing 区的「加入社区」CTA 统一为 `href="#join" data-stripe-link`，未来替换为 Stripe Payment Link / Checkout；`welcome/` 为付费成功页。
- **会员管理**：`account/` 未来接 Stripe Customer Portal。
- **法律页**：`legal/*` 当前为占位结构，内容待律师终审后发布；公司 PII 未写入仓库，特商法页以占位符标注「準備中（弁護士確認後に記載）」。

## 文案口径（合规红线）

去金融化：市场只是并列板块之一，统一写「个人交流·非投资建议」；不突出荐股/投资，不编业绩。运营方提供的是交流环境与社区服务，不提供投资建议。
