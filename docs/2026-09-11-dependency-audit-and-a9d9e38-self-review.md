# 三站依赖漏洞清账 + `a9d9e38` 对抗自评(2026-09-11)

- 性质:派活(dispatch,mainline `hk-operation` / node `hk-m4`);session `2fd8c834-7c33-40e0-950c-9e4b24259dc8`;日期 2026-09-11(JST)
- 红线遵守:**没有部署、没有推送任何分支、没有改 DNS / 生产变量 / Secret**;对 Cloudflare 只做了一次只吐键名的读取(`wrangler pages secret list`);凭据的值没有出现在任何命令输出里,也没有落盘;没有读取会员数据;没用 `--force`;三个仓的 `package.json` 一个字没改;两个香港站没碰任何构建配置。
- 本机探测用到的「值」只有两类:自造的假值(`LHDUMMY…0911`、`local-preview-dummy-not-a-real-secret`),以及 Cloudflare 文档公开的 Turnstile 必败测试键 `2x0000000000000000000000000000000AA`。都不是凭据。
- ② 是**自评**,不能替代 codex / 引擎室复核。

---

## 结论(先说)

**① 依赖清账:三个仓的 high/critical 都已归零,并已进各自当前分支的 HEAD;三条验收判据原样跑,全绿。**

| 仓 | 分支(本轮提交) | 修前 | 修后 | 构建 |
|---|---|---|---|---|
| lighthouse-web | `fix/ssr-workers-migration`(`7061d1f`) | 4 high | 0 | ✅ 19 条预渲染路由一致,静态页 0 变化 |
| lighthouse-fortuna | `chore/astro-patch-7.2.8`(`fa3edcd`;该分支仍冻结) | 4 high | 0 | ✅ 23 条一致,静态页 0 变化,付款门 8/8 |
| fortunavirtu-web | 新建 `chore/deps-audit-2026-09-11`(`bdf42b8`) | 6 high + 1 critical | 0 | ✅ 12 条一致,静态页 0 变化(只跑 audit fix 会构建失败,见 1.2) |

有三处与派活稿对不上,以我核到的为准:
1. **lighthouse 两站的高危早就不是 nanoid 了。** 两仓 HEAD 的 lockfile 里 nanoid 已是 3.3.18(`d5154fe` / `1a87307`),不在名单里。此刻的 4 条高危同出一源:miniflare 精确钉死的 sharp 0.35.2(GHSA-rgj7-g3m4-5g8c),往上连带 miniflare / wrangler / @cloudflare/vite-plugin。
2. **fortunavirtu-web 那 7 条「新的」不是依赖变了,是通告新了。** lockfile 自 2026-08-17(`0af6810`)起没动过;7 条对应的 6 个通告全部在 **2026-09-08** 才发布。
3. **不需要 `overrides`。** 09-09 的判据备注写着「剩下的 sharp 要改 package.json 加 overrides —— 另案」;这两天上游 miniflare 5.20260910.0-alpha 已经把 sharp 改成 0.35.4,`npm audit fix` 就够了。

🔴 **判据绿 ≠ 进了 main。** 三条判据是在仓目录里跑 `npm audit`,再查依赖文件与 HEAD 有没有差异,而 HEAD 是**当前检出的分支**。三个仓当前都不在 main;main(也就是生产)的 lockfile 仍然带着这些高危。谁把某个仓切回 main,对应判据就会重新变红。`c226-fortunavirtu-astro-cve` 现在提示「建议 status: closed」—— 要不要关,建议按「合并进 main 才算」来定。

修不掉的:**无**。

**② `a9d9e38` 自评:可以合并进 main。** 这笔本身没有阻断项:密钥不再进构建产物(改前 5 个文件,改后 0 个,有正向对照);行为与改前等价;两种运行时下都能读到变量。但下面三件事要和「可以」放在一起说:
- **合并这个动作本身就是一次 Pages 生产部署**(本仓 main 接了 Pages 的 GitHub 集成),须 Ethan 授权。而且合并**修不好** 13 条 SSR 路由 —— Pages 不跑 `dist/server`,要修好得切 Workers。
- **缺 `TURNSTILE_SECRET` 时,人机校验会被静默跳过**(`src/pages/api/apply.ts:64-65`、`src/pages/api/contact.ts:72-73`)。这是这笔之前就有的逻辑,不是它引入的。但切 Workers 时 secret 要一条条手动 `wrangler secret put`,漏掉这一条不会报任何错,表单照样能交,只是没有了人机校验。⇒ 切流(不是合并)之前,清单里要加一条放行条件:不带 Turnstile token 的 POST 必须返回 403 `captcha`。
- `APPLY_SECRET` 降级路径**仍然存在**(4 处,行号见 2.3);生产上确实没有 `APPLY_SECRET`。本轮按要求没动。

---

## 〇 我据以行动的前提与出处(D107)

| # | 前提 | 出处 | 一手? | 核对结果 |
|---|---|---|---|---|
| P1 | 三条判据此刻是红的 | `task-verify.py` 实跑输出 | 一手(命令输出) | ✅ 开工时实跑:fortunavirtu「当前 4,基线 11 —— 倒退」;两条 nanoid「有回执但 verify 未命中」 |
| P2 | 判据的定义 | `task-verify.py` 里**没有**这三条 → 换入口 `grep -rl` 找到 `00-dispatch/state/task-effects.yaml:600/623/631` | 一手(判据代码) | verify 都是 `git diff --quiet HEAD -- package.json package-lock.json` 加 `npm audit --json`,按**当前检出分支**判 |
| P3 | fortunavirtu 此刻有 7 个 high/critical | `npm audit --json` | 一手 | ✅ high 6 + critical 1 |
| P4 | lighthouse 两站最后 1 个高危是 nanoid | 派活稿(转述) | — | ❌ 与事实不符,见结论第 1 条。`task-effects.yaml:630/638` 里,引擎室 09-09 已订正过这条的归因(转述),与我核到的一致 |
| P5 | nanoid 经 `@astrojs/cloudflare → vite → postcss` 引入,不进产物 | 派活稿(转述) | — | 路径 ✅(`npm ls nanoid`:`@astrojs/cloudflare@14.3.1 → vite@8.2.1 → postcss@8.5.26 → nanoid@3.3.18`);「不进产物」没有再核 —— 它已经不在名单里,不需要写理由 |
| P6 | fortunavirtu 那 7 个是 08-17 之后新出现的 | 派活稿(转述) | — | ✅,但原因是**通告新**,不是依赖新:`git log -- package-lock.json` 最后一次是 `0af6810 2026-08-17 10:24`;6 个 GHSA 的 `published_at` 全是 2026-09-08(`gh api /advisories/…`) |
| P7 | 生产环境没有 `APPLY_SECRET` | 派活稿(转述) | — | ✅ `wrangler pages secret list --env production` 只列出 `RESEND_API_KEY`、`TURNSTILE_SECRET`(一手)。⚠️ 这个接口只列 `secret_text` 类(我读过 wrangler 源码,确认它只打印键名);`plain_text` 类没覆盖,那部分只能引上一轮的 API 读数(转述):只有两个 `PUBLIC_SUPABASE_*` |
| P8 | lighthouse-web 推送即触发 Pages 预览构建;合并 main 即生产部署 | 上一轮文档 §1.3 引用的 Cloudflare API 读数(转述) | — | 本轮没重读;本轮不推送、不合并,不依赖这条 |
| P9 | 两个香港站在等 c-346 定构建输出目录 | 派活稿(转述) | — | 没核;照做:只提交 lockfile,没碰 `astro.config.*` 和任何 wrangler 配置 |
| P10 | codex MCP 两条路都堵(MD-036) | 派活稿(转述) | — | 未核;不影响本轮 |

**找不到 ≠ 不存在,本轮撞到三处:**
- 在 `task-verify.py` 里找不到三条判据 → 不是没有,是登记在 `state/task-effects.yaml`(全仓 `grep -rl` 找到)。
- `ls wrangler.*` 在 lighthouse-web 根目录零命中 → 换 `ls -a` 看顶层真实结构:这个仓确实**没有** wrangler 配置文件,`wrangler.json` 是构建时在 `dist/server/` 生成的。
- `npm audit` 里 nanoid 零命中 → 属于「它不存在」:lockfile 里是 3.3.18,正好是 GHSA-2v37-7h3g-55p8 的首个修复版本。

---

## ① 三站依赖清账

### 1.1 修前清单(`npm audit --json`,2026-09-11 07:1x JST)

**lighthouse-web 与 lighthouse-fortuna(两仓完全相同,各 4 high / 0 critical)**

| 包 | 严重度 | 通告 | 路径 | 构建期 / 本地开发? |
|---|---|---|---|---|
| sharp 0.35.2 | high | GHSA-rgj7-g3m4-5g8c(libheif,<0.35.4) | `wrangler` / `@cloudflare/vite-plugin` → `miniflare@5.20260908.0-alpha` → `sharp@0.35.2`(`npm view miniflare@5.20260908.0-alpha dependencies.sharp` = `0.35.2`,精确钉死) | 是。miniflare 是本地模拟器 |
| miniflare | high | 自身无通告,因 sharp 连带 | 同上 | 是 |
| wrangler | high | 自身无通告,因 miniflare 连带 | `@astrojs/cloudflare` → `@cloudflare/vite-plugin` → `wrangler` | 是 |
| @cloudflare/vite-plugin | high | 自身无通告,因 miniflare / wrangler 连带 | `@astrojs/cloudflare` → `@cloudflare/vite-plugin` | 是 |

⇒ 4 条里只有 **1 个真通告**,另外 3 条是它上层的包被连带计数。这两仓的顶层 sharp 已经是 0.35.4(`9708d12` / `61db29e` 升过)。

**fortunavirtu-web(6 high + 1 critical)**

| 包 | 严重度 | 通告 | 路径 | 构建期? |
|---|---|---|---|---|
| astro 7.2.2 | **critical** | GHSA-26w7-cxv4-gfx2(AVIF 图片优化 RCE,<7.2.8);GHSA-376h-93r7-7g6f(剥离 base 路径时缺边界检查,≤7.2.3,GitHub 定级 medium) | 直接依赖 | AVIF 优化发生在构建期(这是 gov D287① 评估的结论,转述;本轮没有重评)。第二条只在配置了 `base` 时相关,本仓 `astro.config` 没有 `base` |
| sharp 0.35.3(顶层)+ 0.35.2(miniflare 内) | high | GHSA-rgj7-g3m4-5g8c | `astro` 图片服务 / miniflare | 是 |
| svgo 4.0.2 | high | GHSA-w27v-7q3p-w38r;GHSA-4vpr-x523-8j87(medium) | `astro` → `svgo` | 构建期 SVG 优化 |
| js-yaml 4.3.1 | high | GHSA-2883-xcg3-v3hh | `astro` → `js-yaml`(也经 `@astrojs/internal-helpers`) | 构建期 |
| miniflare / wrangler / @cloudflare/vite-plugin | high | 连带 | 同上 | 是 |

通告发布时间(`gh api /advisories/<id>`):

```
GHSA-rgj7-g3m4-5g8c  high      2026-09-08T21:25:11Z  sharp < 0.35.4 -> 0.35.4
GHSA-26w7-cxv4-gfx2  critical  2026-09-08T21:26:16Z  astro < 7.2.8 -> 7.2.8
GHSA-376h-93r7-7g6f  medium    2026-09-08T21:26:02Z  astro <= 7.2.3 -> 7.2.4
GHSA-2883-xcg3-v3hh  high      2026-09-08T21:24:51Z  js-yaml >= 4.0.0, < 4.3.2 -> 4.3.2; …
GHSA-w27v-7q3p-w38r  high      2026-09-08T21:20:28Z  svgo >= 4.0.0, < 4.1.0 -> 4.1.0; …
GHSA-4vpr-x523-8j87  medium    2026-09-08T21:20:05Z  svgo >= 4.0.0, < 4.1.0 -> 4.1.0; …
GHSA-2v37-7h3g-55p8  high      2026-07-29T15:31:12Z  nanoid < 3.3.18 -> 3.3.18      ← 旧的那条,早已修掉
```

另外,产物的 server 侧不引用 sharp / miniflare:两个香港站 `dist/server` 里 `from "sharp"` / `import("sharp")` / `require("sharp")` 命中 0 个文件,`miniflare` 也命中 0 个文件。

### 1.2 修法

**两个 lighthouse 站**:`npm audit fix`(不带 `--force`)。lockfile 变了 36 个条目:9 个版本变化,27 个删除(旧的 sharp 0.35.2 及其平台二进制)。

```
miniflare 5.20260908.0-alpha -> 5.20260910.0-alpha   (新版 dependencies.sharp = 0.35.4)
wrangler 4.130.0 -> 4.131.0
@cloudflare/vite-plugin 1.54.6 -> 1.54.7
workerd(及 5 个平台包) 1.20260908.1 -> 1.20260910.1
```

**fortunavirtu-web**:
1. `git switch -c chore/deps-audit-2026-09-11`(不在 main 上提交)。
2. `npm audit fix` → `found 0 vulnerabilities`,但 **`npm run build` 失败**:
   ```
   [MISSING_EXPORT] "beginContentEntryCollection" is not exported by "node_modules/astro/dist/core/app/entrypoints/index.js".
      ╭─[ node_modules/@astrojs/cloudflare/dist/utils/prerender.js:2:3 ]
   ```
   原因:audit fix 把 astro 升到 7.3.2,但 `@astrojs/cloudflare` 不在漏洞名单里,没人动它,还停在 14.2.1。14.2.1 要从 `astro/app` 导入的这个符号,7.3.2 里已经没有了。lighthouse 两站本来就是 astro 7.3.2 配 adapter 14.3.1,能构建。
3. `npm update @astrojs/cloudflare` → 14.3.1(仍在 `package.json` 的 `^14.2.1` 范围内)→ 构建通过。

主要版本变化:`astro 7.2.2→7.3.2`、`@astrojs/cloudflare 14.2.1→14.3.1`、`sharp 0.35.3→0.35.4`、`svgo 4.0.2→4.1.0`、`js-yaml 4.3.1→4.3.2`、`miniflare→5.20260910.0-alpha`、`wrangler 4.123.0→4.131.0`、`zod 4.4.3→4.6.2`。

⚠️ 传递依赖里出现了几个大版本变化:`css-select 5→6`、`css-what 6→7`、`diff 8→9`、`supports-color 7→10`,另外 `entities 6.0.1→4.5.0` 是降级。它们都不是本仓的直接依赖,版本由 astro 7.3.2 / svgo 4.1.0 / miniflare 自己声明的范围决定(`npm ls`:`astro → diff@9.0.0`;`astro → svgo@4.1.0 → css-select@6.0.0 → … → entities@4.5.0`;`miniflare → youch → @poppinss/dumper → supports-color@10.2.2`)。不改 `package.json` 的前提下,这些压不回去。

**三个仓的 `package.json` 都没改**(`git diff --quiet HEAD -- package.json` 为真);`--force` 一次也没用。

### 1.3 构建验证(修前、修后各跑一次 `npm run build`,记录产物清单与 sha256)

| 仓 | 修后 build | 预渲染路由(修前/修后) | `dist/client` 内容变化 | `dist/server` 变化 | `compatibility_date` |
|---|---|---|---|---|---|
| lighthouse-web | rc=0 | 19 / 19,清单一致 | 0 个文件 | `wrangler.json` + 1 个 entrypoints chunk | 2026-09-08 → **2026-09-10** |
| lighthouse-fortuna | rc=0 | 23 / 23,清单一致 | 0 | 同上 | 2026-09-08 → **2026-09-10** |
| fortunavirtu-web | rc=0(只跑 audit fix 时 rc=1) | 12 / 12,清单一致 | 0 | 13 个 chunk 内容或哈希变了,多出 1 个 `console_*.mjs` chunk(astro / adapter 升级带来的);顶层结构仍是 `dist/client` + `dist/server` | 2026-04-15 → **2026-09-10** |

- 那个 entrypoints chunk 的变化是构建本身不可复现造成的,不是依赖带来的:同一份 lockfile 在 lighthouse-fortuna 上连续构建两次,也只有它的 sha256 不同。
- lighthouse-fortuna 付款路径门:`node scripts/verify-payment-routes.mjs` → `✓ 付款路径门通过:8 条路径在 dist/ 里都真实存在。`
- ⚠️ `compatibility_date` 前移只影响**切 Workers 以后**;Pages 只发 `dist/client` 的静态文件,不读这个值。为此,我在 09-10 这份构建上把上一轮的 workerd 预览出口表整张重跑了一遍,结果与上一轮一致(见 2.4)。

### 1.4 验收判据(原样跑)

```
$ python3 /Users/miao/Dev/00-dispatch/scripts/task-verify.py 2>&1 | grep -E 'c226-fortunavirtu-astro-cve|c226-lighthouse-web-nanoid|c226-lighthouse-fortuna-nanoid' -A1
  ✅ [已生效] c226-fortunavirtu-astro-cve — fortunavirtu-web 高危 CVE 清账(astro 5→7):高危数从 1
       进度型**已到顶**:当前 11 ≥ 终点 11 —— 数字不可能再涨,**这不是原地踏步**。建议 status: closed
--
  ✅ [已生效] c226-lighthouse-web-nanoid — lighthouse-web:最后 1 个高危(nanoid)修掉且已进 HEAD
       verify rc=0,命中期望(工作区干净,归因可信)
  ✅ [已生效] c226-lighthouse-fortuna-nanoid — lighthouse-fortuna:最后 1 个高危(nanoid)修掉且已进 HEA
       verify rc=0,命中期望(工作区干净,归因可信)
```

开工时同一条命令的基线输出:fortunavirtu「🔴 倒退:当前 4,基线 11」;两条 nanoid「🔴 有回执但 verify 未命中」。

🔴 再强调一次适用范围:这是**当前检出分支**上的绿。三个仓都不在 main:

| 仓 | 当前分支 | 领先 origin/main |
|---|---|---|
| lighthouse-web | `fix/ssr-workers-migration` | 8 个提交 |
| lighthouse-fortuna | `chore/astro-patch-7.2.8`(冻结中) | 3 |
| fortunavirtu-web | `chore/deps-audit-2026-09-11`(本轮新建) | 1 |

### 1.5 修不掉的,逐条理由

无。三个仓的 `npm audit` 全部是 `{'high': 0, 'critical': 0, 'total': 0}`(moderate / low 也是 0)。

---

## ② `a9d9e38` 对抗自评

改动面:6 个文件,+22 −8。新增 `src/lib/server-env.ts`;另外 5 个文件**只改了 `env()` 的函数体和一行 import**。`git show a9d9e38 --unified=0 -- src/pages` 的全部 `+/-` 行就是这些,没有别的。

### 2.1 `server-env.ts` 在 workerd 与本地 dev 下都成立吗?有没有「静默为空」?

`src/lib/server-env.ts:4-8`:从 `cloudflare:workers` 取 `env`,值不是非空字符串就返回 `undefined`。它自己**不抛错**,缺变量时静默返回 `undefined` —— 所以关键在调用方怎么处理 `undefined`。

**两种运行时都能读到变量(实测)。** 探针只放一个 `TURNSTILE_SECRET`,值用 Cloudflare 公开的必败测试键,然后看表单 POST 的结果:返回 403 `captcha` 说明读到了;越过校验走到 500 `not_configured` 说明没读到。

```
R1 = workerd 预览(wrangler dev 跑构建产物,compat 2026-09-10)
  C0 无任何 secret                       POST /api/contact → {"ok":false,"error":"not_configured"} [500]
  C1 dist/server/.dev.vars 放 TS 键       POST /api/contact → {"ok":false,"error":"captcha"} [403]
                                          POST /api/apply   → {"ok":false,"error":"captcha"} [403]
R2 = astro dev(@cloudflare/vite-plugin,同样跑在 workerd 里)
  C0 无任何 secret(.env 只有 PUBLIC_*)  POST /api/contact → not_configured [500]
  C1 根目录 .dev.vars 放 TS 键             POST /api/contact → captcha [403]          ✅ 读到
  C2 只放在 shell 环境变量里               POST /api/contact → not_configured [500]   ❌ 读不到
  C3 只放在 .env.local 里                  POST /api/contact → captcha [403]          ✅ 读到
  C0' 复跑无 secret                        → not_configured [500](结果可重复)
```

⇒ 本地 dev 的变量来源变了:`.dev.vars` 和 `.env*` 文件照样生效,**shell 环境变量不再生效**。改前那个 `import.meta.env` 回退是能读到 shell 环境变量的。这只影响开发机,但要写进 README 或交接说明,否则有人用 `TURNSTILE_SECRET=… npm run dev` 启动,会以为人机校验是开着的。

**缺变量时的每一条路径(逐条看过调用方):**

| 缺什么 | 行为 | 位置 | 响亮 / 静默 | 是这笔引入的吗 |
|---|---|---|---|---|
| `TURNSTILE_SECRET` | **跳过人机校验,继续往下走** | `src/pages/api/apply.ts:64-65`、`src/pages/api/contact.ts:72-73`(`if (tsSecret) {…}`) | 🔴 **静默** | 不是:main 上 `contact.ts:71-72`、`apply.ts:63-64` 同样是 `if (tsSecret)` |
| `APPLY_SECRET` | 改用 `RESEND_API_KEY` 当 HMAC 密钥 | 见 2.3 | 🔴 **静默** | 不是 |
| `APPLY_SECRET` 与 `RESEND_API_KEY` 都缺 | 密钥为 `''` → `crypto.subtle.importKey` 抛错 → 500 | `src/lib/apply-token.ts:29-31`;调用处 `src/pages/api/apply/status.ts:18-19`、`src/pages/apply/confirmed.astro:19-20`、`src/pages/en/apply/confirmed.astro:19-20` | 响亮 | 不是 |
| `RESEND_API_KEY` | 表单直接返回 500 `not_configured` | `src/pages/api/apply.ts:79-80`、`src/pages/api/contact.ts:122-123` | 响亮 | 不是 |
| `RESEND_API_KEY`(确认页) | **先**调 `confirm_web_application` 把申请标成已确认,**再**因为没有 key 进入 error 态;申请没转发给 hello@,用户再点一次链接只会看到「已确认」 | `src/pages/apply/confirmed.astro:25` → `:33-34`(英文版同) | 🟠 静默丢件(前提:缺 Resend 键,同时手上有之前签发、仍有效的 token) | 不是 |
| `CONTACT_TO` | 回落到 `hello@sync-value.com` | `src/pages/api/contact.ts:124`、`src/pages/apply/confirmed.astro:37` | 设计如此 | 不是 |

「两个都缺就 500」这一条的实测(开发模式报错页里的原文):

```
GET /api/apply/status?token=a.b → 500
"message":"Imported HMAC key length (0) must be a non-zero value up to 7 bits less than, and no greater than, the bit length of the raw key data (0)."
"stack":"    at hmac (…/src/lib/apply-token.ts:29:35)\n    at verifyToken (…/src/lib/apply-token.ts:45:39)\n    at Module.GET (…/src/pages/api/apply/status.ts:19:25) …"
```

workerd 预览 C0 下,同一请求也是 500;Node 下同样抛 `DataError Zero-length key is not supported`。

⚠️ 所以 `a9d9e38` 提交说明里那句「/api/apply/status 由 500 变 400 JSON」,**成立的前提是至少有一个签名密钥**(上一轮预览在 `.dev.vars` 里放了假的 `APPLY_SECRET`)。两个都没有时仍然是 500。这是响亮失败,我认为可以接受,但那句话写得不够完整。

**判断**:`server-env.ts` 在两种运行时下都成立。真正危险的「静默为空」是 `TURNSTILE_SECRET` 这一条。这笔没有引入它,也没有让它变得更糟;但这笔之后,变量**只**剩运行期这一个来源,而切 Workers 时 secret 要逐条手动放,漏放的概率更高了。

### 2.2 私有变量还有没有第二条路进 bundle?

**全仓搜索**(`grep -rn -E 'import\.meta\.env|process\.env|locals\??\.runtime|cloudflare:workers|APPLY_SECRET|RESEND_API_KEY|TURNSTILE_SECRET' src`):
- `import.meta.env`:只剩 `src/lib/supabase.ts:5-6`,读的是 `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`。这两个本来就设计成公开的(anon key 受 RLS 约束),`.env.example` 也只列了这两个。
- `process.env`:0 处。`locals.runtime`:0 处(`server-env.ts:2` 的注释除外)。
- 私有键名(`APPLY_SECRET` / `RESEND_API_KEY` / `TURNSTILE_SECRET` / `CONTACT_TO`)只出现在 5 个服务端文件里;`public/`、`src/components`、`src/layouts` 里 0 处。
- `astro.config.mjs` 里没有 `vite.define` / `envPrefix` 之类的覆盖。
- 页面里的 `data-sitekey="0x4AAAAAADt8PjE4JgY0PwSh"` 是 Turnstile 的 site key,本来就公开,不是 secret。

**构建产物实测**(构建时把四个私有变量设成假值,只数命中的文件数,值不打印):

```
改前代码(0ddeba1,a9d9e38 的父提交,在临时 worktree 里构建)—— 正向对照
  LHDUMMYAPPLY0911 files=4   LHDUMMYRESEND0911 files=5   LHDUMMYTS0911 files=2   LHDUMMYTO0911 files=3
  含任一假值的文件:dist/server/chunks/{apply,contact,status,confirmed×2}_*.mjs,共 5 个
a9d9e38 代码,依赖修复前(e6c4270)
  四个假值 files=0
a9d9e38 代码,依赖修复后(7061d1f)
  四个假值 files=0
私有键名本身(不是值)出现的文件:dist/client 0 个;dist/server 中 APPLY 4 / RESEND 5 / TS 2 / TO 3 个
  —— 就是 serverEnv('RESEND_API_KEY') 这种字符串参数,正常
根目录放一个 .dev.vars(APPLY_SECRET=假值)再构建
  dist/server 下没有生成 .dev.vars;假值命中 0 个文件
```

正向对照与上一轮文档第 228 行对得上(APPLY 4 个文件、RESEND 5 个);`a9d9e38` 提交说明里的「5 个文件」是四个值合计的数。**这说明这套计数方法确实能抓到内联,不是空转。**

**明确回答:这笔之后,构建产物里搜不到密钥字面量。**
- 用的是假值做代理:构建进程能看到的私有变量,一个都不会进产物。
- 未验:用**真实**值去搜。本机没有真实值(`.env` 里只有两个 `PUBLIC_*`,secret 只存在于 Cloudflare 的 secret store),按红线也不去取。
- 这笔之前构建出来的那些 Pages 部署里有没有内联的真实值,是上一轮单独上报的事,本轮没有重查。

### 2.3 `APPLY_SECRET` 缺失时的降级路径

**仍然存在,`a9d9e38` 没有动它。** 共四处:

- `src/pages/api/apply.ts:89` —— `const secret = env(locals, 'APPLY_SECRET') || key;`(`key` 就是 `RESEND_API_KEY`,见 `:79`)
- `src/pages/api/apply/status.ts:18` —— `env(locals, 'APPLY_SECRET') || env(locals, 'RESEND_API_KEY') || ''`
- `src/pages/apply/confirmed.astro:19` —— `env('APPLY_SECRET') || key || ''`
- `src/pages/en/apply/confirmed.astro:19` —— 同上

签名用法在 `src/lib/apply-token.ts:28-34`(HMAC-SHA256,密钥原样导入)。

生产上没有 `APPLY_SECRET`(一手,只吐键名的接口):

```
$ npx wrangler pages secret list --project-name lighthouse-web --env production
The "production" environment of your Pages project "lighthouse-web" has access to the following secrets:
  - RESEND_API_KEY: Value Encrypted
  - TURNSTILE_SECRET: Value Encrypted
```

⇒ 生产上的申请 token 眼下是用 Resend API key 签的。后果有两个:一把密钥当两把用,泄露一把就等于两把都泄露;以后不管是轮换 Resend key 还是新设 `APPLY_SECRET`,都会让已经发出、24 小时内还有效的确认链接失效(有效期见 `apply.ts:10` 的 `DAY`)。按要求本轮**没修**,它归切流清单第 3 步,要 Ethan 授权。

### 2.4 行为回归:改动前后等价吗?

**代码层**,`env()` 的语义只变了两处:
1. 空串 `''` 现在会变成 `undefined`。所有调用方都只做真假判断(`if (tsSecret)`、`if (!key)`、`a || b`,行号见 2.1 的表),`''` 和 `undefined` 走的是同一个分支 ⇒ 等价。
2. 去掉了 `import.meta.env` 回退。在生产上这正是本意(构建期的值不再进包);在开发机上的影响见 2.1(shell 环境变量不再生效)。

注意,「改动前」在这个分支和 main 上本来就不能正常工作:adapter 14 下访问 `locals.runtime.env` 会直接抛错,改前的 5 个入口在 workerd 里都是 500(上一轮文档 ③ 有日志原文)。所以这里说的「等价」,比的是 adapter 12 时代的设计语义。

- **表单校验、Turnstile 校验、错误码**:这笔都没碰(见本节开头的 diff 说明)。
- **中英两套确认页**:两边改的是同样的一行。两页之间原本就有的差别(英文版邮件标题带 `·EN`、成功后跳 `/en/apply/confirmed?ok=1`)与这笔无关,`diff` 两个文件的 frontmatter 可以看到。

**运行期**:在依赖修复后的构建上(compat 2026-09-10),按上一轮 ③ 的出口表整张重跑。条件和上一轮相同:`.dev.vars` 里只放假的 `APPLY_SECRET`。

```
GET /  /legal/{tos,guidelines,privacy,tokushoho}/          200 ×5
GET /legal/tos → 307 /legal/tos/        GET /legal/tos.html → 301 /legal/tos/
GET /my  /my/ → 302 /auth/login         GET /en/my → 302 /en/auth/login     GET /account → 302 /my
GET /apply/confirmed[?token=a.b]  /en/apply/confirmed[?token=a.b]          200 ×4
GET /api/apply/status[?token=a.b]                                            400 ×2
GET /auth/login  /en/auth/login → 200   /auth/callback → 302 ?e=nocode   ?code=x → 302 ?e=exchange
GET /auth/discord → 302 *.supabase.co    /auth/signout → 302 /
GET /server/entry.mjs  /wrangler.json  /.dev.vars  /nonexistent-xyz          404 ×4
POST /api/apply(空表单,同源 Origin)→ 422 invalid     POST /api/contact(同上)→ 422 invalid
POST /api/apply(不带 Origin)→ 403 Cross-site POST form submissions are forbidden
安全头 / 与 /my:X-Frame-Options=1  HSTS=1
wrangler 日志:ERROR 行 0 · 5xx 行 0
```

与上一轮 ③ 的表逐项一致。⇒ 没有发现行为回归。

### 2.5 结论

**可以合并进 main。** `a9d9e38` 本身没有阻断项。和这个结论一起交出去的两条:
- 合并就是一次 Pages 生产部署,须 Ethan 授权;合并修不好 SSR 路由,要修好得切 Workers。
- 切 Workers 之前,把「`wrangler secret list` 里有 `TURNSTILE_SECRET`」和「不带 token 的 POST 返回 403 `captcha`」写进切流清单,作为放行条件。

(另外,这个分支合并时会一起带进 `9708d12`(astro 7.3.2)和本轮的 `7061d1f`(lockfile)。两者都只动了 lockfile,构建和预览本轮都已验过。)

---

## 我没查的 / 我不确定的

- **没用真实 secret 验内联**:只用了假值做代理。本机没有真实值,红线也不允许去取。
- **没走真实表单链路**(Turnstile 通过 → 建 pending 申请 → Resend 发确认信 → 点确认 → hello@ 收信):会写生产库、发真邮件。
- **没做远端预览**(`*.workers.dev`):要在账号里新建资源,超出授权。
- **没跑 `astro check` / TypeScript 类型检查**:仓里没装 `@astrojs/check`,也没有 `@cloudflare/workers-types` 和 `tsconfig.json`。`cloudflare:workers` 这个模块在编辑器里可能没有类型;构建不受影响(本轮已构建多次)。
- **`compatibility_date` 是怎么算出来的,我不确定**:两个 lighthouse 站的日期正好等于本地 workerd 的版本日期(1.20260908 → 09-08,1.20260910 → 09-10),但 fortunavirtu 修前是 workerd 1.20260811.1 配 04-15,对不上这个规律。我只报观察到的值,机制没核。
- **没逐字 diff 那个 entrypoints chunk**:「构建不可复现」是在 fortuna 上用两次构建推出来的,lighthouse-web 自己的那个 chunk 没有逐字比较。
- **fortunavirtu-web 的服务端没做运行期测试**,只比了构建产物(静态页 0 变化)。另外,上一轮文档第 7 条指出的问题两个香港站都原样还在:`fortunavirtu-web/src/lib/form-mail.ts:12`、`lighthouse-fortuna/src/lib/form-mail.ts:14` 仍在用 `locals.runtime.env`(属于 c-346 的范围,本轮不碰)。所以即使这次依赖升级完全没问题,它们的联系表单在 adapter 14 下也会是 500。
- **GHSA-376h-93r7-7g6f 在 fortunavirtu 上没做可利用性分析**:本仓没配 `base`,而且已经修掉了。
- **plain_text 类变量**:我用的键名接口只列 `secret_text`;「生产上没有 plain_text 形式的 `APPLY_SECRET`」靠的是上一轮的 API 读数(转述)。
- **「合并 main = Pages 生产部署」「推分支 = 预览构建」**:依据是上一轮文档引用的 Cloudflare API 读数,本轮没有重读。
- **fortunavirtu 传递依赖的大版本变化**(css-select 6、diff 9、entities 降到 4.5 等):静态产物 0 变化,说明构建期没受影响;其他方面的影响没有专门验证。
- **codex 评审**:本轮是自评,代替不了 codex;MD-036 我没核。
