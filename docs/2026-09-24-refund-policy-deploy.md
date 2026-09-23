# Lighthouse Club 例外退款条款部署记录（2026-09-24）

## 交付

- 源码提交：`de474e1935ca6323f67d834d5e7a8628a1e3464c`
- 变更范围：`src/pages/legal/tos.astro`、`src/pages/legal/tokushoho.astro`
- 审查：部署前运行 `codex review --uncommitted`，结论为未发现可操作缺陷。审查进程自身因当时 worktree 尚未安装依赖而未完成构建；随后按锁文件安装依赖并独立完成正式构建。
- 构建：从主工作区现行 `.env` 加载正式 `PUBLIC_SUPABASE_URL` 与 `PUBLIC_SUPABASE_ANON_KEY`（未输出变量值），`npm run build` 返回 0。
- 产物核对：两份法务页均包含新规则和 2026-09-24 更新日；旧的“续费周期开始后即一律不退款”绝对表述不存在。

## 生产部署

- 部署时间：2026-09-24 00:37 JST（2026-09-23 15:37 UTC）
- 发布入口：仓根 `npx wrangler deploy`，实际使用 Astro 生成的 `dist/server/wrangler.json` 重定向配置。
- 部署版本（Version ID）：`cbf259d9-2062-46fe-8ade-67d2135693c6`
- Deployment ID：`bbb8643c-5d44-4449-9b84-4b5ede2dbc78`
- Wrangler 回执：只上传 `/legal/tos/index.html` 与 `/legal/tokushoho/index.html` 两项新增或变更资产；现有 Worker、Custom Domain 与绑定保持不变。
- 未读取、输出或改写运行时 secret；未修改 DNS、Custom Domain、KV、Pages 回退项目或 Workers 配置。

## 线上回读

以下检查均在 `https://lighthouse.sync-value.com` 完成：

| 路径 | HTTP | 内容检查 |
| --- | --- | --- |
| `/legal/tos/` | 200 | 更新日、完整月规则、退款成功完成点、完成后立即终止会员资格并撤销访问均存在 |
| `/legal/tokushoho/` | 200 | 更新日、`完全な1か月単位`、退款完成后立即终止并取消访问均存在 |
| `/` | 200 | 首页出口正常 |
| `/auth/login` | 200 | 登录出口正常 |
| `/apply/` | 200 | 申请出口正常 |

线上两份法务页均未匹配旧绝对表述 `该周期一旦开始，即不予退款` / `期間開始後は返金いたしません`。

## 回退指针

- 部署前版本：`d01b7526-e898-4a1c-b2ca-120d3eefa1a0`
- 如需回退，在本仓已认证环境执行：

  ```bash
  npx wrangler rollback d01b7526-e898-4a1c-b2ca-120d3eefa1a0 --name lighthouse-web
  ```

- 回退后仍须重新回读上述五个路径；本记录仅提供指针，不代表已执行回退。
