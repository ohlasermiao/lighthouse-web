## handoff
- 停在：c-353 经 Ethan 明确授权，由 Codex 独立施工；2026-09-11 15:15 JST 正式域名 lighthouse.sync-value.com 已从 Pages 切到 Worker lighthouse-web。18项机械复验通过。原 Resend/Turnstile 未换，新增独立 APPLY_SECRET；一次性取键认证已清除，无密钥落盘。
- 未落盘的判断：无。全部证据、原配置回退快照、版本和时间线见 docs/2026-09-11-workers-cutover-progress.md。
- 下一步：用户真实邮箱登录、Discord登录、申请确认收信验收；尚未合并/推送，不可把卡报全完。Pages保留回退，自动构建仍开。未来部署必须用Pages正式PUBLIC_*（本地.env不同），保留三secret。dispatch/Claude因token停摆，当前Codex独立续办。
- 更新：2026-09-11
