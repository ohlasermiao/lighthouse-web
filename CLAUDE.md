# lighthouse-web

Nunu 社区自营品牌站(Astro+夜海航图设计系统),含 ToS/公约/隐私/特商法法务页。经营背景看 ../sync-value 与 discord 项目。

本仓库无独立状态文件,进度记录在 dispatch 卡片

## Dispatch 上报纪律（2026-07-06 接入）

本项目由 ~/Dev/00-dispatch 中枢调度（仪表盘模式，协议全文见 dispatch 仓库的 DISPATCH-PROTOCOL.md）。

1. **关键节点当场落盘**：完成里程碑/做出决策/遇到阻塞 → 当场更新本项目状态文件（ROADMAP/STATUS）并中文 commit，不等会话结束。
2. **收尾动作**：任务完成或 Ethan 说收工 → 更新状态文件 → commit → 最后回复末尾单独一行「上报摘要:<一句话进展> | 下一步:<一句话> | 卡点:<无或一句话> | 落盘:<commit短hash>+<更新的状态文件名>」（Ethan 会带回 dispatch）。无「落盘」字段的摘要视为未收尾。（本仓库无独立状态文件，落盘字段可写"无独立状态文件，见 dispatch 卡片"）
3. **模型策略**：Fable 5 仅用于本项目最关键的规划/架构/评审时刻；常规执行用 Sonnet/Opus（不必节省）；允许 ultracode/subagent/workflows；批量机械工作降档 sonnet。
4. **Code review**：触碰关键路径（支付/下单/风控/安全/合规结论）的代码改动，merge 前必跑 codex review --uncommitted（或 --base main）；其余按需。
5. **边界**：本项目的指挥层卡片在 ~/Dev/00-dispatch/projects/ 下，仅由 dispatch 维护，本项目不要改它。
