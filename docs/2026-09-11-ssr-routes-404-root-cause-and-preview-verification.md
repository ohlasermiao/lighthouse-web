# lighthouse.sync-value.com 13 条 SSR 路由 404:根因 + 修复方案 + 预览实测(不切生产)

- 性质:生产事故 · 只读诊断 + 本地预览验证;派活 dispatch(mainline `hk-operation` / node `hk-m4`,与 `c-346` 同线)
- 日期:2026-09-11(JST);session `7b14b862-31e6-410d-a96c-abeb90d1ed01`
- 红线遵守:**没有部署、没有切流、没有改 DNS / 自定义域、没有改生产变量或 Secret**;对 Cloudflare 只做了 GET 类读取;凭据的**值**没有打印、没有落盘(环境变量只取了键名);没有读取或导出任何会员数据。
- 代码改动只落在本地分支 `fix/ssr-workers-migration`(commit `a9d9e38`),**未推送**(推送会触发 Pages 预览构建,见 ④)。
- 🔴 另有一项与本事故同源的安全发现,**已单独报引擎室**。本仓是 GitHub 公开仓,细节只写在 dispatch 私有回执里,这里不写。

---

## 结论(先说)

1. **根因:`@astrojs/cloudflare` 14 起不再支持 Cloudflare Pages,而这个站还在 Pages 上。** 适配器 14 的产物是 Workers 形态:`dist/client`(静态资产)+ `dist/server`(Worker 入口 `entry.mjs` + 生成的 `wrangler.json`),**没有 `_worker.js`,也没有 Pages Functions 目录**。Pages 只能把某个目录当静态资产发出去。09-09 止血把输出目录改成 `dist/client` 后,静态页回来了;但 13 条 `prerender = false` 路由只存在于 `dist/server`,Pages 根本没有发布它们,所以全部 404。
2. **当前生产发布方式(一手:Cloudflare API 实读)**:Pages 项目 `lighthouse-web`,GitHub 集成(`ohlasermiao/lighthouse-web`),生产分支 `main`,构建命令 `npm run build`,输出目录 `dist/client`(09-09 16:18 UTC 起;之前是 `dist`),所有分支都自动出预览构建。仓内没有 CI(`.github/` 只有 `dependabot.yml`)。当前生产部署 `28cd6328` = `main@cba8800`。自定义域 `lighthouse.sync-value.com` 是 CNAME → `lighthouse-web.pages.dev`(proxied)。**没有同名 Worker**(`wrangler deployments list --name lighthouse-web` → `This Worker does not exist`)。
3. 🔴 **断站起点要订正:不是 08-17,是 2026-08-08 14:30 UTC(JST 23:30)。** 那一次生产部署(commit `f119c61`,即 adapter 12→14 升级)就已经整站 404;此后 08-13(`a1581da`)、08-17(`cba8800`)两次生产部署形态相同。最后一个正常的生产部署是 08-06 的 `ecab62c0`(adapter 12),至今打开它的哈希 URL,`/my` 仍返回 302,`/api/apply/status` 仍返回 400。
4. 🔴 **只迁 Workers 不够,还有第二层故障:代码里的 `locals.runtime.env` 在 adapter 14 下一访问就抛错。** 本地 workerd 实测:`/api/apply/status` 返回 **500**,日志逐字为 `Astro.locals.runtime.env has been removed in Astro v6. Use 'import { env } from "cloudflare:workers"' instead.`。受影响的是申请提交、申请状态、联系表单,以及带 token 的中英两个确认页。**已在分支修复**(`a9d9e38`,改为从 `cloudflare:workers` 读变量,并去掉 `import.meta.env` 回退)。修后同一探测返回 400 JSON。
5. **推荐修法:迁 Cloudflare Workers(路径 A)+ 上面的代码修复。** 这是适配器 14 唯一受支持的形态。降回 adapter 12(路径 B)只适合作为 Workers 切流受阻时的应急退路。
6. **预览实测(本地 `wrangler dev --local`,即 workerd 运行时,跑修复分支的构建):四类出口全部不是 404。** 静态页 200;SSR 页面 302 到登录页(未登录时这是正确行为);API 400/422 JSON;认证页 200、回调 302。13 条 SSR 路由逐条都打到了,见 ③。
7. **和 gov 手上「两个香港站 Pages→Workers」是同一根因:是。** 而且第 4 条那个代码陷阱在两个香港站里原样存在:`lighthouse-fortuna/src/lib/form-mail.ts:14`、`fortunavirtu-web/src/lib/form-mail.ts:12`,都是 `locals?.runtime?.env?.[key] ?? (import.meta.env as any)[key]`。⇒ `c-346` 的迁移方案如果不改这一行,迁完后联系表单会从 404 变成 500。

---

## ① 根因(带可复跑的实据)

### 1.1 重新构建后的产物形状

```
$ rm -rf dist && npm run build
03:33:11 [build] output: "static"
03:33:11 [build] mode: "server"
03:33:11 [build] adapter: @astrojs/cloudflare
 prerendering static routes   (19 个静态页)
03:33:20 [build] Complete!

$ ls -la dist dist/client dist/server
dist:        client  server
dist/client: .assetsignore 404.html _astro _headers _redirects about apply assets contact en faq index.html inside legal news pricing robots.txt welcome
dist/server: chunks entry.mjs virtual_astro_middleware.mjs wrangler.json

$ find dist -name '_worker.js' -o -name '_routes.json' -o -name 'functions'
(无输出)

$ cat dist/server/wrangler.json   (节选)
"name":"lighthouse-web","compatibility_date":"2026-09-08","main":"entry.mjs",
"kv_namespaces":[{"binding":"SESSION"}],"images":{"binding":"IMAGES"},
"assets":{"binding":"ASSETS","directory":"../client"},"observability":{"enabled":true}
```

版本:`astro@7.3.2`、`@astrojs/cloudflare@14.3.1`、`wrangler@4.130.0`(本分支 lockfile;`main` 的 lockfile 仍是 astro 7.2.0 / 适配器 14.2.0,形态相同)。

⇒ **这个产物要让 SSR 活,只能作为一个 Worker 发布**:入口 `dist/server/entry.mjs`,静态资产 `dist/client` 经 `ASSETS` binding 挂上去。`npx wrangler deploy` 会通过 `.wrangler/deploy/config.json` 自动找到 `dist/server/wrangler.json`。dry-run 实测能打包:

```
$ npx wrangler deploy --dry-run -c dist/server/wrangler.json
Total (33 modules)  1432.30 KiB
✨ Read 46 files from the assets directory .../dist/client
Your Worker has access to the following bindings:
env.SESSION  KV Namespace / env.IMAGES  Images / env.ASSETS  Assets
--dry-run: exiting now.
```

官方原文(Astro 文档):「The Astro Cloudflare adapter no longer supports deployment on Cloudflare Pages.」

### 1.2 13 条 SSR 路由,全部只在 `dist/server`

```
$ grep -rln 'prerender.*=.*false' src/pages | sort
src/pages/account.astro            src/pages/auth/callback.ts
src/pages/api/apply.ts             src/pages/auth/discord.ts
src/pages/api/apply/status.ts      src/pages/auth/login.astro
src/pages/api/contact.ts           src/pages/auth/signout.ts
src/pages/apply/confirmed.astro    src/pages/en/apply/confirmed.astro
src/pages/en/auth/login.astro      src/pages/en/my.astro
src/pages/my.astro
$ ... | wc -l
13
```

服务端 manifest(`grep -o '"route":"[^"]*"' dist/server/...`)里有 `/my /account /auth/login /auth/callback /auth/discord /auth/signout /api/apply /api/apply/status /api/contact /apply/confirmed /en/my /en/auth/login /en/apply/confirmed`;`dist/client` 里没有这些路径。**这里核对下来与派活令给的 13 条一致。**

### 1.3 当前生产怎么发的(Cloudflare API,白名单输出,env 只取键名)

```
build_config: {'build_command': 'npm run build', 'destination_dir': 'dist/client', 'root_dir': '', 'build_caching': True}
source.type: github
source.config: {'owner': 'ohlasermiao', 'repo_name': 'lighthouse-web', 'production_branch': 'main',
  'deployments_enabled': True, 'production_deployments_enabled': True,
  'preview_deployment_setting': 'all', 'preview_branch_includes': ['*'], ...}
domains: ['lighthouse-web.pages.dev', 'lighthouse.sync-value.com']
[production] env KEYS+TYPE: [('PUBLIC_SUPABASE_ANON_KEY','plain_text'), ('PUBLIC_SUPABASE_URL','plain_text'),
                             ('RESEND_API_KEY','secret_text'), ('TURNSTILE_SECRET','secret_text')]
[production] compat: 2026-06-08 []
[preview]    env KEYS+TYPE: []
canonical_deployment: 28cd6328-… production 2026-09-09T16:18:58Z | branch: main | commit: cba8800 | stage: deploy success
dns: CNAME lighthouse.sync-value.com -> lighthouse-web.pages.dev | proxied: True | modified: 2026-06-08
```

另见 `npx wrangler pages project list`:`lighthouse-web │ lighthouse-web.pages.dev, lighthouse.sync-value.com │ Git Provider: Yes`。
09-09 止血前的 build_config(dispatch 私有仓里的回滚记录)是 `destination_dir: dist`,其余相同。

### 1.4 时间线(部署史 API + 逐个打开当时部署的哈希 URL 实测)

| 生产部署(UTC) | commit | 适配器 | 该部署现在打开的实测 |
|---|---|---|---|
| 08-06 08:53 `ecab62c0` | `17a0867` | 12 | `/` 200 · `/my` **302→/auth/login** · `/auth/login` 200 · `/api/apply/status` **400** ⇒ **最后一个正常版本**(Pages Functions 形态) |
| 08-08 14:30 | `f119c61`(升 14) | 14 | `/` **404 / 0 字节** · `/client/` 200(首页在子目录)· SSR 全 404 |
| 08-13 08:54 | `a1581da` | 14 | 同上 |
| 08-17 15:04 | `cba8800` | 14 | 同上 |
| 09-09 16:18 `28cd6328` | `cba8800` | 14 | 输出目录已改 `dist/client`:静态 200,**13 条 SSR 404**(= 当前生产) |

⇒ 自定义域跟随 canonical 部署,**整站 404 的起点是 08-08,不是 08-17**(dispatch 卡 `c-338` 写的是 08-17,以本表实测为准)。

### 1.5 生产现状复测(2026-09-11 03:32 JST,只发 GET)

```
/                      200 ct=text/html size=21276
/legal/tos             308 loc=https://lighthouse.sync-value.com/legal/tos/
/legal/tos/            200 size=15310
/faq/                  200
/my                    404 size=4660     ← 4660 = dist/client/404.html 的大小,即 Pages 静态兜底 404
/account               404 size=4660
/auth/login            404 size=4660
/auth/callback         404 size=4660
/apply/confirmed       404 size=4660
/api/apply/status      404 size=4660
/en/my                 404 size=4660
```

`lighthouse-web.pages.dev` 与生产部署 `28cd6328.lighthouse-web.pages.dev` 结果完全相同。

---

## ② 修复方案(推荐 A)

### A(推荐):迁 Cloudflare Workers + 代码修复 `a9d9e38`

适配器 14 的正规形态。静态和服务端两半在同一个部署单元里,`_headers` / `_redirects` 由 Workers 静态资产原生支持(本地实测生效,见 ③)。

**要动的东西全列:**

| 项 | 现在(Pages) | 迁后(Workers) |
|---|---|---|
| 代码 | `locals.runtime.env`(adapter 14 下抛错) | `cloudflare:workers` 的 `env`(`a9d9e38` 已改;**合并前需跑 `codex review`**,涉及表单与 secret 读取) |
| 构建命令 | `npm run build` | 不变 |
| 输出 | `dist/client`(只发静态) | `dist/client` 作为资产 + `dist/server/entry.mjs` 作为 Worker |
| 发布 | Pages Git 集成自动构建 | `npx wrangler deploy`(手动),或事后再决定是否开 Workers Builds。**两套自动部署不能同时抢一个域** |
| wrangler 配置 | 无(适配器每次生成 `dist/server/wrangler.json`) | 建议在仓根加一份受版本控制的 `wrangler.jsonc`(`name`、`compatibility_date`、`observability`、可选 `vars.CONTACT_TO`),**首发时不写 routes**,切域那一笔再加。适配器怎样与根配置合并,本轮**未验** |
| 构建期变量 | `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`(被 `src/lib/supabase.ts` 在构建期内联) | 仍是构建期:谁执行构建,谁的环境(或 `.env`)里就要有这两个值,**且必须与 Pages 现值一致** |
| 运行期 secret | `RESEND_API_KEY`、`TURNSTILE_SECRET`(Pages secret_text) | Worker secret(`wrangler secret put`,值不回显)。**另建议新设 `APPLY_SECRET`**:现代码缺它时会拿 `RESEND_API_KEY` 当 HMAC 签名密钥 |
| 可选变量 | `CONTACT_TO`(代码有默认值) | 可放 `vars` |
| Binding | 无 | `SESSION`(KV,Astro 会话,本站代码不用它;部署时 wrangler 会自动建一个 KV;不想要就在 astro 配置里设 `session: false`,**未验**)、`IMAGES`(Images binding,本站没有图像处理;可改 `imageService: 'passthrough'` 省掉,**未验**)、`ASSETS` |
| 自定义域 | Pages 自定义域 + CNAME → `lighthouse-web.pages.dev` | Worker Custom Domain `lighthouse.sync-value.com`(zone 在同一账号,满足官方前提「nameservers managed by Cloudflare」) |
| Supabase Auth 回跳 | 基于 origin `lighthouse.sync-value.com` | 域名不变 ⇒ 不用改;但在 `*.workers.dev` 上预览时,魔法链接和 Discord 回跳会被 Supabase 白名单拦下(**未验**) |
| Turnstile | 站点密钥按主机名放行 | 域名不变 ⇒ 不用改;`*.workers.dev` 上表单会被 captcha 拒(**未验**) |
| 旧 Pages 项目 | — | 切流后**保留不删**,作为回滚目标;观察期满再停自动构建,之后再删 |

- **迁移边界**:只动「谁来服务 `lighthouse.sync-value.com`」和代码里读变量这一处。Supabase 库和 RPC、Resend 发信域、Discord OAuth 配置、DNS zone 里的其他记录、`sync-value.com` 主站(另一个 Pages 项目 `sync-value-web`)都不动。
- **回滚边界**:回滚 = 把域名从 Worker 摘下,重建 CNAME,Pages 重新挂自定义域 ⇒ 回到**今天的状态**(静态好、SSR 404)。**不存在一个「回滚回去就全好」的 Pages 版本**(adapter 14 的产物 Pages 承载不了)。Worker 本身可用 `wrangler rollback` 在版本之间回退,不涉及域名。

### B(应急备选,不推荐常态):降回 adapter 12 + astro 5,留在 Pages

`ecab62c0` 证明 adapter 12 在 Pages 上 SSR 是活的(Pages Functions 形态,输出目录要改回 `dist`)。
- 代价:撤掉 08-07 以来三轮升级;astro 5 不在 AVIF RCE(GHSA-26w7-cxv4-gfx2)修复线上;dependabot 会持续推 14.x 的 PR,**每合一次就再炸一次**;官方已不维护 Pages 方向。
- **迁移边界**:`git revert` 升级提交(`package.json` / lockfile)+ Pages 输出目录改回 `dist`。**回滚边界**:再 revert 回来 + 输出目录回 `dist/client`。
- 本轮**没有实测** B 的构建(只验了旧部署 `ecab62c0` 的线上行为)。

### C(不推荐):在 Pages 上手搓 `_worker.js`

把适配器的 Worker 入口包装成 Pages advanced mode 的 `_worker.js`。不受官方支持,属于和工具链对着干,本轮未验,只列出来表示考虑过。

---

## ③ 预览环境实测(核心交付)

**选的方式**:本地 `npx wrangler dev -c dist/server/wrangler.json --local --port 8787`。它跑的是 workerd,和 Cloudflare 生产 Worker 是同一个运行时;构建来自分支 `fix/ssr-workers-migration`(`a9d9e38`)。
**为什么不做远端预览**:在账号里建一个 `*.workers.dev` 的 Worker 会新建云资源(KV / Images 会被自动开通),还需要把生产 secret 搬过去。这已经超出「只读 + 预览」的授权,列为 ④ 的第 3 步,由 Ethan 授权。
**本地只放了一个假值**:`dist/server/.dev.vars` 里有 `APPLY_SECRET=local-preview-dummy-not-a-real-secret`(`dist/` 已被 gitignore;`.assetsignore` 会排除它,实测 `/.dev.vars` 返回 404)。没有放 Resend / Turnstile 键,所以任何探测都不会发信。
PUBLIC 的 Supabase 值来自本机 `.env`,在构建期内联。探测全部是未登录、无害的请求,不写库、不发信。

### 修复前(同一构建方式,代码未改)—— API 类出口是 500,不是活

```
/api/apply/status            500 size=0
/api/apply/status?token=x    500 size=0
/apply/confirmed?token=x     500 size=0
/en/apply/confirmed?token=x  500 size=0
[wrangler] ✘ [ERROR] Error: Astro.locals.runtime.env has been removed in Astro v6. Use 'import { env } from "cloudflare:workers"' instead.
[wrangler:info] GET /api/apply/status 500 Internal Server Error
```

(同一轮里,其他 SSR 页与认证路由已经是 302/200,因为它们不读 env。)
⚠️ 按「不是 404 就算活」的判据,这个 500 会被判成绿。**它是真故障**,所以在这里单列。

### 修复后(`a9d9e38`)—— 四类出口

| 出口类别 | 请求 | 实测 | 判定 |
|---|---|---|---|
| 静态页 | `GET /` | **200** text/html 21276B,`<title>Lighthouse Club — 全球华人的会员制生活社区</title>` | ✅ |
| 静态页 | `GET /legal/tos/` · `/legal/guidelines/` · `/legal/privacy/` · `/legal/tokushoho/` | **200** ×4(标题分别为 服务条款 / 社区公约 / 隐私政策 / 特定商取引法に基づく表記) | ✅ |
| 静态页 | `GET /legal/tos` | **307** → `/legal/tos/`(Workers 资产;Pages 上是 308) | ✅ |
| 静态页 | `GET /legal/tos.html` | **301** → `/legal/tos/`(`_redirects` 生效) | ✅ |
| SSR 页面 | `GET /my` · `/my/` | **302** → `/auth/login`(未登录的正确行为) | ✅ 不是 404 |
| SSR 页面 | `GET /en/my` | **302** → `/en/auth/login` | ✅ |
| SSR 页面 | `GET /account` | **302** → `/my` | ✅ |
| SSR 页面 | `GET /apply/confirmed` · `?token=a.b` · `/en/apply/confirmed` · `?token=a.b` | **200** ×4(带伪 token 时走到了验签逻辑,判 invalid 后渲染页面) | ✅ |
| API 端点 | `GET /api/apply/status` | **400** `application/json` `{"status":"invalid"}` | ✅ 路由到了代码 |
| API 端点 | `GET /api/apply/status?token=a.b` | **400** `{"status":"invalid"}` | ✅ |
| API 端点 | `POST /api/apply`(空表单,带同源 Origin) | **422** `{"ok":false,"error":"invalid"}` | ✅ |
| API 端点 | `POST /api/contact`(空表单,带同源 Origin) | **422** `{"ok":false,"error":"invalid"}` | ✅ |
| API 端点 | `POST /api/apply`(不带 Origin) | **403** `Cross-site POST form submissions are forbidden`(Astro 的 checkOrigin) | ✅(被框架拦下,不是 404) |
| 认证回调 | `GET /auth/login` · `/en/auth/login` | **200**,`<title>会员登录 — Lighthouse Club</title>` / `Member sign-in` | ✅ |
| 认证回调 | `GET /auth/callback` | **302** → `/auth/login?e=nocode` | ✅ |
| 认证回调 | `GET /auth/callback?code=x` | **302** → `/auth/login?e=exchange`(拿假 code 去换会话被拒) | ✅ |
| 认证回调 | `GET /auth/discord` | **302** → `*.supabase.co`(只核了主机后缀) | ✅ |
| 认证回调 | `GET /auth/signout` | **302** → `/` | ✅ |
| 负面 | `/server/entry.mjs` · `/wrangler.json` · `/.dev.vars` · `/nonexistent-xyz` | **404**(站内 404 页) | ✅ 服务端文件不外露 |

- **13 条 SSR 路由逐条覆盖**:account、api/apply、api/apply/status、api/contact、apply/confirmed、auth/callback、auth/discord、auth/login、auth/signout、en/apply/confirmed、en/auth/login、en/my、my。
- 安全头:静态页(`_headers`)与 SSR 页(`src/middleware.ts`)的响应里都带 `X-Frame-Options` / `Strict-Transport-Security`(脚本逐条计数为 1)。
- 修复后 wrangler dev 日志:`error lines: 0`,无 5xx。
- ⚠️ 顺带看到:`GET /api/apply` 和 `GET /api/contact` 返回 404。原因是它们只导出 POST,**用 GET 探测 POST-only 端点得到 404 是 Astro 的正常行为,不代表路由缺失**。以后验收 API 类,请用 `GET /api/apply/status`,或带 Origin 的 POST。

### 修复同时关掉的一个构建期隐患

scratch 目录试构建,只用假值:

```
改前:APPLY_SECRET=<假值> npm run build  → 假值出现在 dist/server 的 4 个文件里;未被引用的私有变量 0 个
改前:RESEND_API_KEY=<假值> …            → 5 个文件,形态为  RESEND_API_KEY: "<假值>"
改后(a9d9e38):三个假值同时给      → dummy inlined files: 0
```

也就是说,改前的代码会把构建机环境里的私有变量原样写进 server bundle。

### 这些类别 / 事项本轮**没有验**

- **远端边缘行为没验**:真实自定义域、边缘缓存、Workers Custom Domain 证书、KV / Images 的自动开通。原因:需要在账号里建资源,超出授权(④ 第 3 步)。
- **真实登录链路没验**(魔法链接收信 → `/auth/callback` 换会话 → `/my` 显示会员卡;Discord OAuth 往返)。原因:要真邮箱、真账号,并且会写 Supabase(`ensure_my_account`)。
- **真实表单链路没验**(Turnstile 通过 → 建 pending 申请 → Resend 发确认信 → `/apply/confirmed` → hello@ 收信)。原因:会写生产库、发真邮件,本地也没有真 secret。
- **`main` 的 lockfile(astro 7.2.0)构建没在 workerd 上跑**。本轮用的是分支上的 7.3.2 构建;两者产物形态相同,但运行结果没有逐一对比。
- `/_image` 本地返回 403(9 字节 text/plain),没有深究。本站没有经 `astro:assets` 的图(见 09-09 评估文档),不属于四类出口。

---

## ④ 切流步骤清单(留给 Ethan 授权,本轮不执行)

| # | 做什么 | 谁 | 做完怎么验 | 出问题怎么退 |
|---|---|---|---|---|
| 0 | **先处理 dispatch 私有回执里那项安全事项**(与切流无关,但更急) | Ethan 定,引擎室执行 | 见回执 | — |
| 1 | 对 `a9d9e38` 跑 `codex review --base main`(涉及表单与 secret 读取);决定合并基线:本分支基于 `chore/astro-patch-7.2.8`,**合并即同时带上 astro 7.3.2 补丁升级**,正好是那条冻结分支在等的「修法」 | 引擎室 | review 无阻断项 | 不合并,分支留着 |
| 2 | 仓根加 `wrangler.jsonc`(`name: lighthouse-web`,不含 routes);按需设 `session: false` / `imageService: 'passthrough'`;`npm run build && npx wrangler deploy --dry-run` | 引擎室(仓内改动,可先落分支) | dry-run 列出的 bindings 符合预期,没有 routes | `git revert` |
| 3 | **首发到 `*.workers.dev`,不绑自定义域**:`npx wrangler deploy`;再 `wrangler secret put RESEND_API_KEY / TURNSTILE_SECRET / APPLY_SECRET`,值由 Ethan 或按他授权直接从源头导入,不回显;`wrangler secret list` 只看名字 | Ethan 授权(会新建 Worker,并自动开通 KV / Images) | 在 workers.dev 上把 ③ 的四类出口表逐条重跑,除 captcha / 回跳外应该一致 | `npx wrangler delete`(没有绑域,生产零影响) |
| 4 | 选切流窗口(建议低峰);先截快照:Pages 项目的 domains、DNS 记录原值(`CNAME lighthouse → lighthouse-web.pages.dev`, proxied)、Pages env 键名 | 引擎室 | 快照文件落 dispatch 私有仓 | — |
| 5 | **切域**:① Pages 项目移除自定义域 `lighthouse.sync-value.com` ② 删除该 CNAME ③ Worker 添加 Custom Domain `lighthouse.sync-value.com`。**①到③之间有停机窗口**(预计秒级到分钟级,未实测) | Ethan 授权,引擎室执行 | 生产四类出口按 ③ 的表全跑:静态 200 · `/my` 302 · `/api/apply/status` 400 JSON · `/auth/login` 200;另查安全头,`/server/entry.mjs` 404 | 反向做:摘掉 Worker Custom Domain → 重建 CNAME(proxied)→ Pages 重新挂自定义域 ⇒ 回到今天的状态(静态好、SSR 404) |
| 6 | **真链路验收**:Ethan 用测试邮箱走一次魔法链接登录到 `/my`;走一次 Discord 登录;提交一次申请表单,确认信 → confirmed → hello@ 收到 | Ethan(真邮件、真账号) | 三条链路各有截图,或说一句「收到了」 | 按第 5 步回退,或 `wrangler rollback` 到上一版本 |
| 7 | 观察期(建议 7 天):Worker 日志(observability 已开)与 5xx | 引擎室 | 无异常 5xx | 同第 5 步 |
| 8 | **旧 Pages 项目何时停**:观察期满且第 6 步三条链路都过 ⇒ 先关 Pages 自动构建(`deployments_enabled: false`),再过一个周期删项目。在那之前**不删、不覆盖**。README 部署段(现在写的是「Cloudflare Pages,输出 dist/」,已过期)同步改掉 | Ethan 定,引擎室执行 | Pages 不再出新构建 | 重新打开自动构建 |

⚠️ 在切流之前,任何分支推送都会触发 Pages 预览构建(`preview_deployment_setting: all`)。按当前输出目录 `dist/client`,预览产物只有静态页,不会重新暴露 `dist/server`;但也不能拿它当 SSR 预览用。

---

## 我没查的 / 我不确定的

- **没查**:Cloudflare 构建环境当时的 Node 版本和构建日志(API 只看了阶段状态 `deploy success`)。
- **已实证(细节只在私有回执)**:Pages 的 `secret_text` 类变量在构建期对构建进程可见。结合修复前的 `import.meta.env` 回退,这是本文开头那项安全发现的成因。`a9d9e38` 去掉回退之后,这条通路已经关上(试构建内联数为 0)。
- **不确定**:切域的真实停机时长;另一种切法「在 zone 上加 Worker Route 覆盖现有 proxied 记录」与 Pages 自定义域能否并存,官方迁移指南只写了 Custom Domain,**我没验**。
- **不确定**:仓根 `wrangler.jsonc` 与适配器生成配置的合并规则;`session: false`、`imageService: 'passthrough'` 在 astro 7.3 / 适配器 14.3 上的实际效果。只看了文档,没跑。
- **不确定**:本账号 `*.workers.dev` 子域是否已开通。
- **没验**:两个香港站 `form-mail.ts` 那一行在 workerd 下实际会不会 500。只是代码同形(与本仓修复前逐字相同),按本仓实测推断会 500。
- **没核**:`c-338` / `c-346` 卡面上其余由我方转述的事实,只核了与本事故直接相关的几条:起点日期(订正为 08-08)、13 条路由、输出目录。
- **转述未当证据**:dispatch 的调查文档与卡面只用作索引。本文结论全部来自上面贴出的命令输出、Cloudflare API 响应和代码行。

## 命令留档(可复跑;除特别注明外只读)

```
npm run build ; ls -R dist | head -60 ; cat dist/server/wrangler.json
grep -rln 'prerender.*=.*false' src/pages | wc -l
npx wrangler pages project list
npx wrangler pages deployment list --project-name lighthouse-web
npx wrangler deployments list --name lighthouse-web          # → Worker 不存在
python3 (Cloudflare API GET /accounts/{acc}/pages/projects/lighthouse-web,白名单输出,env 只取键名)
curl -sS -o /dev/null -w '%{http_code}' https://lighthouse.sync-value.com/<path>
curl … https://ecab62c0.lighthouse-web.pages.dev/my            # adapter 12 最后一个正常生产部署
npx wrangler deploy --dry-run -c dist/server/wrangler.json    # 只打包不上传
npx wrangler dev -c dist/server/wrangler.json --local --port 8787   # 本地 workerd 预览
```
