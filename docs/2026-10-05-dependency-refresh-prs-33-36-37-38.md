# lighthouse-web 四项依赖汇总更新（2026-10-05）

工单：`build-lighthouse-dependency-refresh-20261005`；生产者：`build:45000739-6970-4d87-b5cd-ce7900a52294`。
基线：`origin/main@291e874d2444877b22f17630c4de16b8367c20c2`，开工时 worktree 干净，沿用指定 base。

## 交付范围

汇总 Dependabot PR #33、#36、#37、#38 的四项目标版本，解决重叠锁文件更新。

| 直接依赖 | 原范围 | 新范围 | 锁定版本 |
|---|---|---|---|
| @supabase/ssr | ^0.12.0 | ^0.12.7 | 0.12.7 |
| astro | ^7.2.0 | ^7.3.5 | 7.3.5 |
| @supabase/supabase-js | ^2.110.9 | ^2.117.2 | 2.117.2 |
| @astrojs/cloudflare | ^14.2.0 | ^14.3.3 | 14.3.3 |

仅修改 package.json 的四项直接依赖、package-lock.json 和本文。业务源码与 Cloudflare 配置未改。
使用 `npm install --package-lock-only --registry=https://registry.npmjs.org` 生成锁文件。
初次审计仍有 3 high、3 moderate；随后运行无 force 的
`npm audit fix --package-lock-only --registry=https://registry.npmjs.org`，在现有范围内修复传递依赖。
最终 devalue=5.9.4、http-cache-semantics=4.3.0、undici=7.29.1、wrangler=4.147.0；未加 overrides 或直接依赖。

## 自测证据

环境：Node v26.10.0、npm 11.19.1。先通过 Node 官方 `util.parseEnv` 读取主仓 .env 并只向构建导入 PUBLIC_*；未打印任何值。
随后检查 .env 所有键均为 PUBLIC_*，原样执行工单中的环境加载与验收命令。
工单判据由 `build_order.Store.load()` 读取，不重写版本或 diff 判据。

- `exact-target-versions`：原样执行，rc=0。
- `clean-install-build-audit-dry-run`：原样执行，整体 rc=0。
  - `npm ci`：added 227 packages, audited 228 packages；0 vulnerabilities。
  - `npm run build`：19 条预渲染路由；Server built / Complete；成功。
  - `npm audit --audit-level=high`：found 0 vulnerabilities。
  - `npx wrangler deploy --dry-run`：Wrangler 4.147.0；34 个附加模块，46 个 assets 文件；
    Total Upload 1467.71 KiB / gzip 335.86 KiB；输出 `--dry-run: exiting now.`。
- `only-four-direct-dependency-lines-change`：提交后按工单原样执行；实际返回值见本轮运行日志与提交 checkpoint。
- `evidence-names-all-prs-and-no-deploy`：按工单原样执行；实际返回值见本轮运行日志与提交 checkpoint。

npm 提示 esbuild/fsevents/workerd 的 install scripts 尚未列入 allowScripts；本轮未修改此策略，构建及 dry-run 实际通过。
Wrangler 使用 Astro 生成的 dist/server/wrangler.json 和本地 .wrangler 重定向配置；生成物均被 gitignore 排除，不在提交内。
官方命令参考：[Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)。

## 状态与边界

未执行生产部署（no production deploy）。未 push、未开关/评论/合并任何 PR，未修改 Cloudflare 绑定、变量或 secrets。
本交付是本地依赖更新及 build 自测证据；独立 dispatch 验收、消费、记录以及后续 PR 操作仍待执行。
没有真人业务验收或生产运行验证，不能据此宣布线上升级完成。
