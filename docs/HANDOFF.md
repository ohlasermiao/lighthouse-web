## handoff
- 停在：codex 对 a9d9e38 提的 P1 已修并只落分支 `fix/ssr-workers-migration`(7cc1ae1):缺 TURNSTILE_SECRET 时 /api/apply 与 /api/contact 均 500 `not_configured`,有键时校验不变;本地 workerd 预览实测(无 TS ⇒ 500 · 公开必败测试键 ⇒ 403 captcha · RESEND 假值在位仍 500 · 出口表 32 行与改前逐行一致);codex 命令行复审两次均判「可以合并」、无分级意见;报告 `docs/2026-09-11-turnstile-fail-closed.md`;未推送未部署未合并。
- 未落盘的判断：无(全部已写进报告);最要紧的两条:①切 Workers 时若漏 `wrangler secret put TURNSTILE_SECRET`,两个表单会整体 500(响亮,不再静默放行),切流清单的放行条件仍要写;②缺 TS 时拒绝发生在邮箱域名 DoH 查询之后(原有顺序,codex 指出,判断无害未改)。
- 下一步：引擎室读报告后,把「合并 fix/ssr-workers-migration 进 main(= 一次 Pages 生产部署)」与切流清单第 3 步(含新设独立 APPLY_SECRET)交 Ethan 授权;APPLY_SECRET 降级路径本轮按要求未碰。
- session：c6840884-c469-49dc-8c31-60b76e25f1bf
- 更新：2026-09-11 09:06
