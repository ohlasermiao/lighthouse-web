# 缺 `TURNSTILE_SECRET` 时两个表单入口 fail-closed(2026-09-11)

- 性质:派活(dispatch,mainline `hk-operation` / node `hk-m4`);session `c6840884-c469-49dc-8c31-60b76e25f1bf`;日期 2026-09-11(JST)
- 起因:独立评审(codex)对 `a9d9e38` 提的 P1,原文在 dispatch 仓 `docs/2026-09-11-a9d9e38-codex-review.md`。
- 红线遵守:**没有推送、没有部署、没有合并 main、没有改 DNS / 域 / 生产变量或 Secret**;本轮没有对 Cloudflare 账号发起任何读写。夹具里的值只有两类:自造假值(`local-preview-dummy-not-a-real-secret`、`LHDUMMY-not-a-real-resend-key-0911`),以及 Cloudflare 文档公开的 Turnstile 必败测试键 `2x0000000000000000000000000000000AA`。都不是凭据。后台进程一律按 pid 杀,没有用模式匹配。

---

## 结论(先说)

**已改,只落分支:`7cc1ae1`。缺 `TURNSTILE_SECRET` 时,`/api/apply` 与 `/api/contact` 都直接返回 500 `{"ok":false,"error":"not_configured"}`,不再越过人机校验;有 secret 时校验行为和改前一字不差。**

| 条件(本地 workerd 预览,同一套夹具) | 改前(`8d9f0e7`) | 改后(`7cc1ae1`) |
|---|---|---|
| F0 无 `TURNSTILE_SECRET`、无 `RESEND_API_KEY` | 两者 500 `not_configured`(**越过了校验**,是走到 RESEND 检查才停) | 两者 500 `not_configured`(**在 Turnstile 这一关就停**) |
| F1 放公开必败测试键 | 两者 403 `captcha` | 两者 403 `captcha` ✅ 读到了、也在校验 |
| F2 无 `TURNSTILE_SECRET`、`RESEND_API_KEY` 放假值 | **没跑**(会越过校验去真发信 / 写生产库,脚本守卫拒跑) | 两者 500 `not_configured` ✅ |
| 四类出口表(32 行) | 与上一轮一致 | 与改前**逐行一致**(机械 `diff` 只差 F2 那一段) |

- **保留「禁止构建期回退」**:`src` 里 `import.meta.env` 只剩 `src/lib/supabase.ts:5-6` 的两个 `PUBLIC_*`(与改前相同)。
- **`APPLY_SECRET` 降级路径没碰**(`src/pages/api/apply.ts:89` 等四处原样)。
- **codex 复审(命令行,`gpt-6-astra`,只读沙箱)**:原样 `--base 8d9f0e7` 一次、带逐条要求一次,**两次都判「可以合并」,没有任何分级(P0–P3)评审意见**。它订正了我评审要求里的一个说法:拒绝发生在 DNS 查询**之后**,不是「任何外部调用之前」(见 ④)。原文见 ④。

有三处与派活稿对不上,以我核到的为准:
1. **按派活稿的夹具,改前和改后的响应一模一样,测不出区别。** 派活稿写「无 `TURNSTILE_SECRET` ⇒ 500 `not_configured`(改前是越过校验)」。但夹具里本来就没有 `RESEND_API_KEY`,改前越过校验后会在 RESEND 检查处返回**同一个** 500 `not_configured`(实测见 ② F0 改前)。所以我加了 F2:放一个假的 `RESEND_API_KEY`,改后仍是 500 `not_configured`,才证明拦下它的是 Turnstile 这一关。F2 改前那一格没跑 —— 改前会越过校验,`/api/contact` 拿假 key 去调 Resend,`/api/apply` 会调 `create_web_application` 往生产 Supabase 写一条 pending 申请。「改前越过校验」的依据是代码(改前 `if (tsSecret) {…}`,见 ①)加 F0 改前那一格:缺 TS 却走到了 RESEND 检查。
2. **`codex review --base <提交>` 不能和自定义评审要求同时用。** 按派活稿第一种写法加 `-` 读要求,codex 直接报错 `error: the argument '--base <BRANCH>' cannot be used with '[PROMPT]'`(rc=2)。所以分成两次跑:一次原样 `--base 8d9f0e7`(codex 默认评审口径),一次把逐条要求从 stdin 喂进去、在要求里写明范围 `8d9f0e7..7cc1ae1`。两份原文都在 ④。
3. **上一轮的 `.dev.vars` 夹具已经不在了。** `dist/server/.dev.vars` 和仓根 `.dev.vars` 都不存在;换入口找过:`find . -name '.dev.vars*'`(排除 node_modules)零命中;上一轮 session 的 scratchpad 里找到了探针脚本 `probe3.sh`,里面写着夹具内容(只放 `APPLY_SECRET` 假值)。原因:`npm run build` 会重建 `dist/`,夹具随之消失,而且上一轮脚本收尾时本来就会 `rm` 掉它。所以这属于「本来就不留」,不是找错了地方。本轮按 `probe3.sh` 原样重建,出口表的 URL 清单也从它逐字搬过来。

---

## 〇 我据以行动的前提与出处(D107)

| # | 前提 | 出处 | 一手? | 核对结果 |
|---|---|---|---|---|
| P1 | 缺 TS 时两个入口 `if (tsSecret)` 跳过校验 | `src/pages/api/apply.ts:64-77`、`src/pages/api/contact.ts:72-85`(改前 HEAD `8d9f0e7`) | 一手(代码) | ✅ 与派活稿行号基本一致(contact 第 71 行是注释,判断在 72-73) |
| P2 | 缺 `RESEND_API_KEY` 时返回 500 `not_configured` | `apply.ts:79-80`、`contact.ts:122-123` | 一手(代码) | ✅ 本轮改后行号不变 |
| P3 | `serverEnv` 缺值、空串、非字符串都静默返回 `undefined` | `src/lib/server-env.ts:6-8` | 一手(代码) | ✅ 所以 `!tsSecret` 一并覆盖了这三种情况 |
| P4 | 父提交在 adapter 14 下访问 `locals.runtime.env` 一访问就抛错 | 父提交 `0ddeba1` 的 `env()` 是 `locals?.runtime?.env?.[key] ?? …`(一手,代码);抛错日志在上一轮事故文档 ③(转述,我方文档里贴的命令输出) | 部分一手 | 本轮没有重建父提交复跑。它是 P1 为什么算「这笔改变了后果」的依据,不影响本轮怎么改 |
| P5 | codex 对 `a9d9e38` 的 P1 结论 | dispatch 仓 `docs/2026-09-11-a9d9e38-codex-review.md` | 转述(我方文档,标称逐字) | 没有找 codex 原始输出核对;但它指出的缺陷我在代码里独立核到了(P1+P3),不依赖这份转述 |
| P6 | Cloudflare 的 Turnstile 测试密钥:`1x…AA` 永远通过、`2x…AA` 永远失败 | Cloudflare 文档 `developers.cloudflare.com/turnstile/troubleshooting/testing/`;F1 实测 siteverify 返回失败 ⇒ 403 `captcha` | 一手(外部文档 + 外部系统真实响应) | ✅ |
| P7 | `APPLY_SECRET` 那条归切流清单第 3 步、要 Ethan 授权 | 派活稿 + 上一轮文档(转述) | — | 没核;这条是约束,照做:不碰 |
| P8 | 上一轮出口表的条件(`.dev.vars` 只放 `APPLY_SECRET` 假值)与 URL 清单 | 上一轮 session scratchpad 的 `probe3.sh`(一手,脚本原件)+ 上一轮文档 2.4(转述) | 一手 | ✅ 逐字复用 |
| P9 | 前端两个表单遇到非 2xx 一律显示「没有成功」 | `src/pages/apply.astro:103-121`、`src/pages/contact.astro:59-70` | 一手(代码) | ✅ 前端只看 `res.ok`,不区分错误码 ⇒ 新的 500 不需要改前端 |
| P10 | 分支 `fix/ssr-workers-migration`,HEAD `8d9f0e7`,工作区干净 | `git status` / `git log` | 一手 | ✅ |

前史:`bash ~/Dev/00-dispatch/scripts/prior-art.sh TURNSTILE_SECRET fail-closed` 命中 61 份,和本仓直接相关的只有上面 P5 那份 codex 评审;决定记录里命中的 D195 是签字册的 fail-closed,与本事无关。

---

## ① 改动(`7cc1ae1`,2 个文件,+25 −25,大半是去掉一层缩进)

`git diff -w 8d9f0e7 7cc1ae1 -- src/pages/api`(忽略缩进后的全部改动):

```diff
--- a/src/pages/api/apply.ts
+++ b/src/pages/api/apply.ts
@@ -61,8 +61,9 @@
+  // Turnstile 人机校验是必需配置：缺 secret 就拒绝请求（fail-closed），不静默跳过
   const tsSecret = env(locals, 'TURNSTILE_SECRET');
-  if (tsSecret) {
+  if (!tsSecret) return json({ ok: false, error: 'not_configured' }, 500);
   try {
@@ -74,7 +75,6 @@
   } catch {
     return json({ ok: false, error: 'captcha_error' }, 502);
   }
-  }
--- a/src/pages/api/contact.ts
+++ b/src/pages/api/contact.ts
@@ -68,9 +68,10 @@
-  // Cloudflare Turnstile 人机校验（设了 secret 才校验；本地 dev 无 secret 则跳过）
+  // Cloudflare Turnstile 人机校验（必需配置：缺 secret 就拒绝请求，fail-closed，不静默跳过；
+  // 本地 dev 在 .dev.vars 里放 Cloudflare 公开测试键 1x0000000000000000000000000000000AA 即可放行）
   const tsSecret = env(locals, 'TURNSTILE_SECRET');
-  if (tsSecret) {
+  if (!tsSecret) return json({ ok: false, error: 'not_configured' }, 500);
   try {
@@ -82,7 +83,6 @@
   } catch {
     return json({ ok: false, error: 'captcha_error' }, 502);
   }
-  }
```

- **位置没动**:判断仍在字段校验(422 `invalid`)和邮箱域名检查(422 `email_undeliverable`)之后、RESEND 检查之前。所以空表单仍是 422,出口表不变。
- **错误形状**沿用缺 `RESEND_API_KEY` 时的 `{ ok:false, error:'not_configured' }` + 500。
- 改后行号:`apply.ts:64-77`(判断在 66),`contact.ts:71-85`(判断在 74);RESEND 检查仍是 `apply.ts:79-80`、`contact.ts:122-123`。
- **本地开发的影响**:改前,开发机没配 TS 键时表单会越过校验,但因为通常也没配 RESEND 键,最后同样是 500 `not_configured`。只有「配了 RESEND、没配 TS」的开发机才会变:改前能发出信,改后是 500。要在本地走通表单,需在 `.dev.vars` 里放公开测试键 `1x0000000000000000000000000000000AA`(已写进 `contact.ts` 的注释)。README 目前没有本地变量说明,本轮没加。

---

## ② 实测(本地 workerd 预览)

**方式**:`node_modules/.bin/wrangler dev -c <快照>/server/wrangler.json --local --ip 127.0.0.1 --port 8791`,跑 `npm run build` 的产物。改前、改后各构建一次,各复制一份快照到 scratchpad,在快照上跑,互不覆盖。`compatibility_date` 两者都是 `2026-09-10`。脚本:session scratchpad 的 `probe.sh`(出口表部分逐字取自上一轮 `probe3.sh`)。

**夹具**(写在 `<快照>/server/.dev.vars`,每轮跑完即删):

```
F0  APPLY_SECRET=local-preview-dummy-not-a-real-secret                         (= 上一轮出口表条件)
F1  F0 + TURNSTILE_SECRET=2x0000000000000000000000000000000AA                  (Cloudflare 公开必败测试键)
F2  F0 + RESEND_API_KEY=LHDUMMY-not-a-real-resend-key-0911,不放 TURNSTILE_SECRET
    守卫:快照的 server 产物里 grep 不到 `!tsSecret` 就拒跑(改前会越过校验去发信/写库)
合法字段 POST = -H "Origin: <同源>" -F name=probe -F email=probe@example.com -F message=x|motivation=x
```

### 改后(`7cc1ae1`)完整输出

```
  compatibility_date = 2026-09-10
== [after] F0 .dev.vars 只放 APPLY_SECRET 假值(无 TURNSTILE / 无 RESEND)
  GET /                                    200
  GET /legal/tos/                          200
  GET /legal/guidelines/                   200
  GET /legal/privacy/                      200
  GET /legal/tokushoho/                    200
  GET /legal/tos                           307 http://127.0.0.1:8791/legal/tos/
  GET /legal/tos.html                      301 http://127.0.0.1:8791/legal/tos/
  GET /my                                  302 http://127.0.0.1:8791/auth/login
  GET /my/                                 302 http://127.0.0.1:8791/auth/login
  GET /en/my                               302 http://127.0.0.1:8791/en/auth/login
  GET /account                             302 http://127.0.0.1:8791/my
  GET /apply/confirmed                     200
  GET /apply/confirmed?token=a.b           200
  GET /en/apply/confirmed                  200
  GET /en/apply/confirmed?token=a.b        200
  GET /api/apply/status                    400
  GET /api/apply/status?token=a.b          400
  GET /auth/login                          200
  GET /en/auth/login                       200
  GET /auth/callback                       302 http://127.0.0.1:8791/auth/login?e=nocode
  GET /auth/callback?code=x                302 http://127.0.0.1:8791/auth/login?e=exchange
  GET /auth/discord                        302 → *.supabase.co
  GET /auth/signout                        302 http://127.0.0.1:8791/
  GET /server/entry.mjs                    404
  GET /wrangler.json                       404
  GET /.dev.vars                           404
  GET /nonexistent-xyz                     404
  POST /api/apply (空表单,同源 Origin)          {"ok":false,"error":"invalid"} [422]
  POST /api/contact (空表单,同源 Origin)        {"ok":false,"error":"invalid"} [422]
  POST /api/apply (不带 Origin)              Cross-site POST form submissions are forbidden [403]
  安全头 /: X-Frame-Options=1 HSTS=1
  安全头 /my: X-Frame-Options=1 HSTS=1
  wrangler 日志:ERROR 行 0 · 5xx 行 0
  -- 以上为出口表;以下为本轮新增
  POST /api/contact (合法字段,同源)              {"ok":false,"error":"not_configured"} [500]
  POST /api/apply (合法字段,同源)                {"ok":false,"error":"not_configured"} [500]
== [after] F1 F0 + TURNSTILE_SECRET=公开必败测试键
  POST /api/contact (合法字段,同源)              {"ok":false,"error":"captcha"} [403]
  POST /api/apply (合法字段,同源)                {"ok":false,"error":"captcha"} [403]
== [after] F2 F0 + RESEND_API_KEY 假值,不放 TURNSTILE_SECRET
  POST /api/contact (合法字段,同源)              {"ok":false,"error":"not_configured"} [500]
  POST /api/apply (合法字段,同源)                {"ok":false,"error":"not_configured"} [500]
== 清理核对
  无残留 .dev.vars
  8791 无监听
```

### 改前(`8d9f0e7`)与改后逐行对比

改前输出与上面逐行相同,只有 F2 那一段不同。机械对比(把标签 `[before]` / `[after]` 统一后 `diff`):

```
$ diff <(sed 's/\[before\]/[X]/' probe-before.out) <(sed 's/\[after\]/[X]/' probe-after.out)
43c43,44
<   拒跑:构建里没有 fail-closed 逻辑,这条会越过校验去发信/写库
---
>   POST /api/contact (合法字段,同源)              {"ok":false,"error":"not_configured"} [500]
>   POST /api/apply (合法字段,同源)                {"ok":false,"error":"not_configured"} [500]
diff rc=1
```

⇒ 出口表 32 行、F0 / F1 的四个 POST,改前改后**完全一致**;唯一的差别是 F2(改前被守卫拒跑)。

### 与上一轮出口表逐项对比

上一轮(`docs/2026-09-11-dependency-audit-and-a9d9e38-self-review.md` §2.4)的条目与本轮 F0 出口表逐项对上:静态 200 ×5、`/legal/tos` 307、`/legal/tos.html` 301、`/my` `/my/` 302→`/auth/login`、`/en/my` 302→`/en/auth/login`、`/account` 302→`/my`、确认页 200 ×4、`/api/apply/status` 400 ×2、`/auth/login` `/en/auth/login` 200、`/auth/callback` 302 `?e=nocode` / `?code=x` 302 `?e=exchange`、`/auth/discord` 302→`*.supabase.co`、`/auth/signout` 302→`/`、服务端文件与不存在路径 404 ×4、空表单 POST 422 ×2、无 Origin POST 403、安全头各 1、日志 ERROR 0 / 5xx 0。**无变化。**

### 产物比对(改前快照 vs 改后快照)

```
预渲染页数 before=18 after=18
dist/client 差异文件:(无)
dist/server:
  apply_*.mjs / contact_*.mjs   内容差异就是这一处(两文件相同):
      <  if (tsSecret) try {
      >  if (!tsSecret) return json({ ok: false, error: "not_configured" }, 500);
      >  try {
  entry.mjs、static-image-collection_*.mjs   把 chunk 文件名里的哈希统一掉之后 0 差异
  entrypoints_*.mjs   只有 manifest 那一行不同;值不同的顶层键只有 entryModules(chunk 文件名)与 key(每次构建随机生成)
  before 快照多一个 .wrangler/(是先在它上面跑了 wrangler dev 留下的本地状态,不是构建差异)
```

(对 manifest 只列了键名,没打印值 —— `key` 是每次构建生成的加密键。)

---

## ③ 命令留档(可复跑)

```
git -C <仓> rev-parse --short HEAD                     # 8d9f0e7,工作区干净
npm run build && cp -R dist <scratch>/dist-before       # 改前快照
zsh <scratch>/probe.sh <scratch>/dist-before before F0 F1 F2
# 改 src/pages/api/{apply,contact}.ts
npm run build && cp -R dist <scratch>/dist-after
zsh <scratch>/probe.sh <scratch>/dist-after after F0 F1 F2
diff <(sed 's/\[before\]/[X]/' probe-before.out) <(sed 's/\[after\]/[X]/' probe-after.out)
grep -rn 'import\.meta\.env' src                        # 只剩 supabase.ts:5-6 的 PUBLIC_*
python3 ~/Dev/00-dispatch/scripts/worksurface.py hook --self <session> --paths src/pages/api/apply.ts src/pages/api/contact.ts   # 无输出,rc=0
git add src/pages/api/apply.ts src/pages/api/contact.ts && git commit    # 7cc1ae1
```

---

## ④ codex 复审(原文)

codex-cli 0.154.0;三次运行的元信息都是 `model: gpt-6-astra` · `sandbox: read-only` · `approval: never` · `workdir: /Users/miao/Dev/02-active/lighthouse-web`。评审要求文件(session scratchpad 的 `codex-review-prompt.md`)一共六问:① P1 关掉没有,还有没有别的路能在无 Turnstile 配置时到达发信 / 写库;② 有 secret 时校验行为与处理顺序是否不变;③ 是否恢复了 `import.meta.env` 之类的构建期读取;④ 是否碰了 `APPLY_SECRET` 降级路径(只报告,不建议在本笔改);⑤ 其他回归(含前端对 500 的处理、本地开发体验);⑥ 总结论。另外要求它只读、不联网、不读 `.env` / `.dev.vars` 的值。

**第 1 次:派活稿第一种写法 + 读评审要求 —— 参数冲突,没跑起来**

```
$ codex review -c sandbox_mode='"read-only"' --base 8d9f0e7 - < codex-review-prompt.md
error: the argument '--base <BRANCH>' cannot be used with '[PROMPT]'

Usage: codex review --config <key=value> --base <BRANCH> [PROMPT]

For more information, try '--help'.
codex rc=2
```

**第 2 次:原样 `--base <父提交>`(codex 默认评审口径)—— 结论原文(逐字)**

```
$ codex review -c sandbox_mode='"read-only"' --base 8d9f0e7
codex
Both endpoints now reject requests when TURNSTILE_SECRET is missing while preserving existing verification and error handling when configured. No actionable regressions were identified. Runtime tests were not run.
codex rc=0
```

- 没有任何 `[P0]`–`[P3]` 评审意见(`grep -E '\[P[0-9]\]|Review comment'` 零命中)。
- 过程中它自己试了一次 `curl -IL https://developers.cloudflare.com/…`,被只读沙箱挡下(`curl: (6) Could not resolve host`),没有联网成功。
- 结论那段话在日志里连续打印了两遍(一遍是流式输出,一遍是最终消息),这里只抄一遍。

**第 3 次:逐条评审要求从 stdin 喂入,范围写明 `git diff 8d9f0e7..7cc1ae1` —— 结论原文(逐字)**

```
$ { printf '评审范围:`git diff 8d9f0e7..7cc1ae1`…\n\n'; cat codex-review-prompt.md; } | codex review -c sandbox_mode='"read-only"' -
codex
1）原 P1 已关闭：serverEnv 将缺失、空字符串及非字符串统一返回 undefined（src/lib/server-env.ts:6–8），两个入口随后返回 500 {ok:false,error:'not_configured'}（src/pages/api/apply.ts:65–66、src/pages/api/contact.ts:73–74），无法到达后面的 Supabase 写库或 Resend 发信（apply.ts:83–86、125–129；contact.ts:126–130）；但并非在任何外部调用之前拒绝，因为原有 DNS 查询仍在前面（apply.ts:21–22、60；contact.ts:25–26、67），且前置校验或 honeypot 可提前返回其他结果；2）有非空字符串 secret 时行为不变：403 captcha、502 captcha_error、通过后继续均保留（apply.ts:67–80；contact.ts:75–85、122–123），bad_request → honeypot → invalid → email_undeliverable → Turnstile → RESEND 配置检查的顺序未改。
3）没有恢复私有变量的构建期读取，仍通过 cloudflare:workers 获取运行时配置（src/lib/server-env.ts:4–8），现有 import.meta.env 仅用于公开 Supabase 配置且本笔未改（src/lib/supabase.ts:5–6）；4）没有触碰 APPLY_SECRET 降级路径，env(locals,'APPLY_SECRET') || key 保持原样（src/pages/api/apply.ts:89）。
5）未发现本笔新增的其他正确性问题：中英文申请表遇到 500 会显示错误、恢复按钮并重置 Turnstile（src/pages/apply.astro 与 src/pages/en/apply.astro:103–122），联系表会显示错误并恢复按钮（src/pages/contact.astro:59–71、src/pages/en/contact.astro:58–63），不会误报成功；本地缺 secret 从跳过校验变为拒绝是预期变化，测试键说明见 contact.ts:71–74，但本次仅做只读静态核对，未联网、未读取环境变量文件、未运行开发服务或实测测试键；6）可以合并：本笔关闭缺配置时通往发信/写库的绕过路径，同时保留既有处理顺序及明确要求不变的降级路径。
codex rc=0
```

(同样没有分级评审意见;这段结论在日志里也打印了两遍,只抄一遍。)

**我方处置**

- **「不是在任何外部调用之前拒绝」—— codex 说得对,是我评审要求里的措辞过头了。** 字段校验之后、Turnstile 之前,还有一次查邮箱域名 MX/A 记录的 DoH 请求(`cloudflare-dns.com`,`apply.ts:60`、`contact.ts:67`)。这个顺序是原来就有的,本笔没改;它不发信、不写库,只查申请人邮箱的域名。本笔的目标是「缺配置时不越过人机校验」,这一点 codex 判定已达成。不需要再改。
- codex 标的行号与我核的一致(判断在 `apply.ts:66`、`contact.ts:74`;RESEND 检查在 `apply.ts:79-80`、`contact.ts:122-123`;`APPLY_SECRET` 在 `apply.ts:89`)。
- codex 两次都写了「运行期没测」,那是它的只读沙箱做不到;运行期实测由本文 ② 补上。

---

## 我没查的 / 我不确定的

- **F2 的改前一格没跑**:改前会越过校验去调 Resend(假 key)或写生产 Supabase。「改前越过校验」靠代码和 F0 改前的推断,没有直接观测到。如果一定要直接观测,可以另做一份把 `PUBLIC_SUPABASE_URL` 指向黑洞地址的构建,只测 `/api/apply`;`/api/contact` 的发信地址写死在代码里,本地没法拦,只能靠代码判断。
- **没有重建父提交 `0ddeba1` 复跑「改前一访问就抛错」**:这一条引用的是上一轮事故文档里的 wrangler 日志(我方文档,转述),本轮没有再复现。
- **Turnstile 通过(`1x…AA`)那一侧没测**:通过之后就会走到 RESEND / Supabase,本地没有真值,测它会发信或写库。所以「有 secret 且通过时照常往下走」只有代码依据(`try` 块内容和改前逐字相同)和产物 diff 依据。
- **没走真实表单链路、没做远端 `*.workers.dev` 预览**:同上一轮,超出授权。
- **切 Workers 后,如果 `wrangler secret put TURNSTILE_SECRET` 漏了**:改后表单会整体 500(响亮),不会再静默放行。这是本笔要的效果,但也意味着切流时漏这一条会让两个表单直接不可用,切流清单里的放行条件仍然要写。
- **生产 Pages 上的现状不受影响**:这笔没有推送、没有合并。生产上 `TURNSTILE_SECRET` 在位(上一轮 `wrangler pages secret list` 的一手读数,本轮没重读),而且生产上这两条 SSR 路由目前本来就是 404。
- **没跑 `astro check` / TypeScript 类型检查**:与上一轮相同,仓里没有装类型检查工具;构建 rc=0。
- **codex 那条 `--base` 不能配自定义要求的报错**:我只核了 codex-cli 0.154.0 的行为,更早或更新的版本是否一样没查。
- **codex 原始日志没进仓**:两份全量日志(678 行 / 571 行,大部分是它读文件的过程输出)只在本 session 的 scratchpad(`/private/tmp/…/scratchpad/codex-review-*.out`),重启后会被清掉。结论段已逐字抄进 ④。
- **缺 TS 时拒绝之前,仍会先发一次 DoH 查询**(codex 指出,见 ④):每个缺配置的请求仍会让 Worker 对外发一次 `cloudflare-dns.com` 查询。原来就是这个顺序,我判断无害,没改;如果要求「缺配置时零外呼」,可以把 Turnstile 配置检查挪到字段校验之前,但那样空表单的返回码会从 422 变成 500,出口表会变,所以本轮没做。
