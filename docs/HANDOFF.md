## handoff
- 停在：生产事故「13 条 SSR 路由 404」只读诊断 + 本地预览验证已完成,**未部署、未切流、未推送**;根因=@astrojs/cloudflare 14 不支持 Pages、Pages 输出目录 dist/client 只发静态半边(断站起点实为 2026-08-08 f119c61,不是 08-17);第二层故障=代码 locals.runtime.env 在 adapter 14 下抛错(API/确认页 500),已在本地分支 `fix/ssr-workers-migration` 修复(commit `a9d9e38`,改走 cloudflare:workers env);修复构建在本地 wrangler dev(workerd)上四类出口全活(静态 200 / /my 302→登录 / /api/apply/status 400 JSON、表单 POST 422 / /auth/login 200、callback 302);报告 `docs/2026-09-11-ssr-routes-404-root-cause-and-preview-verification.md`。
- 未落盘的判断：①另有一项同源安全发现(旧部署暴露构建期内联的 secret),细节只在 dispatch 私有回执,本仓公开故不写;②两个香港站 form-mail.ts 有同一行 locals.runtime 陷阱,c-346 迁 Workers 时必须一并改,否则联系表单从 404 变 500;③分支基于 chore/astro-patch-7.2.8,合并即同时带上 astro 7.3.2 补丁升级;④推送本分支会触发 Pages 预览构建(无害但不是 SSR 预览),所以没推。
- 下一步：引擎室先处理私有回执里的安全事项(轮换两把键 + 删旧部署,Ethan 定),再按报告 ④ 的切流清单建卡请 Ethan 授权:先 codex review `a9d9e38`,再首发 workers.dev 复跑四类出口,最后切自定义域。
- session：7b14b862-31e6-410d-a96c-abeb90d1ed01
- 更新：2026-09-11 04:10
