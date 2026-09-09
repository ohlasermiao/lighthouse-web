# astro AVIF RCE(GHSA-26w7-cxv4-gfx2)在 lighthouse 两仓的实际暴露面 + 修复破坏面(只读评估)

- 派活:gov D287①(期限 2026-09-11);session `0dc2cd4e-b7a3-4edf-b393-fa9d6018be23`;评估日 2026-09-09
- 范围:`lighthouse-web`(本仓)与 `lighthouse-fortuna`(`/Users/miao/Dev/02-active/lighthouse-fortuna`)
- 红线遵守:两仓 `package.json` / `package-lock.json` / 源码 / Cloudflare 配置一个字节没动(`git status` 两仓全程干净;`npm audit fix` 只跑了 `--dry-run`)

## 结论一句话

**① 运行期不可达,只可能在构建期,而两仓构建期也没有任何一张图经过 sharp。** ⇒ 不落 D287② 的「生产事故」,不建 `needs_human` 卡;按例行升级办。
**② 「升 astro 7」这个前提是过期的:两仓 2026-08-07 起就已在 astro 7.2.0 / @astrojs/cloudflare 14.2.0。** 真正要做的是补丁级升级 astro 7.2.0 → ≥7.2.8(sharp 0.35.3 → 0.35.4 是那条 RCE 的真正修复),`npm audit fix`(**不带 `--force`**)干跑显示只动 lockfile、不需改 `package.json`,预计半天内两仓可完;部署另议。

---

## 第①问:AVIF 图像优化跑在构建期还是运行期?

### 结论:**只构建期**(运行期零暴露;且构建期也零图像经过 sharp)

漏洞机制(一手:advisory 原文):「A vulnerability in `libheif`, used by the default Sharp image service in Astro, can lead to remote code execution when a malicious AVIF image is optimized」;「projects are affected when an attacker can cause Astro to process an untrusted AVIF image」;受影响 `< 7.2.8`,修复 7.2.8(2026-08-26 发布),CVSS 9.8。7.2.8 的实际改动只有一条:「Updates the minimum supported version of Sharp to 0.35.4」(PR #17837)。
⇒ 漏洞代码住在 **sharp(原生 Node 插件,内含 libvips/libheif)** 里。要够得着它,必须让**我们的进程**用 sharp 去解一张攻击者给的 AVIF。

三条路逐条跟到底:

**路 A:运行期 `/_image` 端点。** 两仓的 Worker 里确实注入了 `/_image` 路由,但它的处理器不是 sharp:
- `dist/server/entry.mjs:496`(两仓同):`"route":"/_image","component":"node_modules/@astrojs/cloudflare/dist/entrypoints/image-transform-endpoint.js"`
- 适配器默认图像模式是 `cloudflare-binding`:`node_modules/@astrojs/cloudflare/dist/utils/image-config.js:2-11`(`const mode = config ?? "cloudflare-binding"`),两仓 `astro.config.mjs:8` 都是裸 `cloudflare()`,没传 `imageService`。
- 该模式下运行期服务 = `@astrojs/cloudflare/image-service-workerd`(`image-config.js:49-54`),它的 `transform()` **原样返回输入**(`dist/server/chunks/image-service-workerd_DYTqPjOM.mjs:6-12`)。
- 端点 `GET` 调 `transform(ctx.request.url, env.IMAGES, env.ASSETS)`(`dist/server/chunks/image-transform-endpoint_DxmazWGC.mjs:11-18`),最终 `images.input(body).transform(...).output(...)`(`dist/server/chunks/image-binding-transform_CEDkcG7V.mjs:630-676`)—— 这是 **Cloudflare Images binding**,转码在 Cloudflare 托管服务里做,不在我们的 Worker 进程内。
- sharp 被显式排除出 Worker 产物:`node_modules/@astrojs/cloudflare/dist/index.js:425` `vite.build.rolldownOptions.external = ["sharp"]`;适配器自己的告警原文(`image-config.js:66`):「The Sharp image service cannot run inside the workerd runtime, so '/_image' requests will fail in dev and production」。
- 实证:`grep -rl "sharp\|libheif\|heif" dist/server/` 两仓命中的只是 MIME 类型表字符串(`mrmime`),没有 sharp 模块被打进 `dist/server`。
- 旧版适配器同理:线上站可能还跑着 08-07 之前的构建(见下「线上探测」),我在 scratchpad 解包了 `@astrojs/cloudflare@12.6.13`(当时 HEAD 的版本):默认 `imageService: "compile"`(`dist/index.js:96`),运行期端点 `dist/entrypoints/image-endpoint.js` 只做 `fetch(proxied)` 原样代理,并且 `dist/index.js:140` 原文「Cloudflare does not support sharp at runtime」。

**路 B:构建期 sharp 处理仓内/远程图片。** 构建期 sharp 只处理经 `astro:assets` 引用的图(`<Image>` / `<Picture>` / `getImage()` / 内容集合 `image()`)或 `image.domains`/`remotePatterns` 允许的远程图:
- 两仓 `grep -rniE "astro:assets|getImage|<Image|<Picture|\.avif|/_image|image\(|inferRemoteSize"` `src/` + `astro.config.mjs` **零命中**。
- 两仓唯一的图是 `public/assets/img/lighthouse.svg`,通过普通 `<img>` 引用(web:`src/components/Header.astro:17`、`Footer.astro:15`;fortuna:`Header.astro:16`、`Footer.astro:18`),`public/` 原样拷贝不经 sharp。
- 两仓 `astro.config.mjs` 无 `image.domains` / `remotePatterns` / `base`;无 `src/content`。
⇒ 构建输入全是我们自己的仓内文件,没有任何一张图(更没有 AVIF)会被 sharp 解码。

**路 C:`astro dev` 本地开发。** dev 模式下适配器把 `/_image` 指到 `image-transform-endpoint`(`image-config.js:53`),同样走 binding/passthrough,不走 sharp。这条只在开发机上,不是生产面。

同一行 audit 里还有第二条 critical:GHSA-376h-93r7-7g6f(去 `base` 前缀时缺少路径段边界检查 ⇒ 授权绕过)。两仓都没配 `base`,不适用。

### 线上探测(只发 GET,2026-09-09 16:5x JST)

| URL | 结果 |
|---|---|
| `https://lighthouse.fortuna-virtu.com/_image` | HTTP 400,text/plain,30 字节 |
| `…/_image?href=%2Fassets%2Fimg%2Flighthouse.svg&w=10&f=avif` | HTTP 200,**image/svg+xml**,1492 字节(与原 svg 同大小 ⇒ 原样透传,没转码) |
| `…/_image?href=https%3A%2F%2Fexample.com%2Fx.avif&w=10&f=webp` | HTTP 403(远程域被拒) |
| `https://lighthouse.sync-value.com/`、`/en/`、`/faq/`、`/my`、`/_image`、`/assets/img/lighthouse.svg` | **全部 HTTP 404**,`cache-control: no-store`,响应里没有本仓 `_headers` 下发的任何安全头 |

fortuna 线上 `/_image` 是活的运行期面,但行为是透传/binding,与代码分析一致。线上首页引用的 CSS 是 `/_astro/about.BDT4MNmY.css`,本地 `dist/client/index.html` 是 `/_astro/Base.TtTx_JCu.css` ⇒ 线上是另一个(更早的)构建;两仓 `HANDOFF.md` 都记着 08-17 起「不部署」。
`lighthouse.sync-value.com` 全站 404 **不在本次范围**,但它是一个我探到的事实:这个域现在没有在服务本仓的产物(原因查不出来:可能是自定义域没绑到新部署、也可能是有意下线)。已写进回执请引擎室定性。

### 对派活令三选一的回答

**只构建期** —— 更准确地说:运行期不可达(处理器是 Cloudflare Images binding,sharp 被 external 掉且 workerd 跑不了原生插件);构建期理论上是 sharp 能跑的唯一位置,但两仓没有任何图像经过它。**D287② 的条件触发不成立。**

---

## 第②问:升 astro 7 的破坏面有多大?

### 结论:**「升 7」已经完成;剩下的是补丁级升级,量级半天以内,预计只动 lockfile**

事实修正(一手:代码与 git):
- `package.json:11-14`(web)已是 `"astro": "^7.2.0"`, `"@astrojs/cloudflare": "^14.2.0"`;fortuna 同。`npm ls astro` 两仓均 `astro@7.2.0`、`@astrojs/cloudflare@14.2.0`,HEAD 干净。
- 落地提交:web `f119c61`(2026-08-07,`^5.0.0 → ^7.2.0`、`^12.6.13 → ^14.2.0`),fortuna `c58d3a5`。
- 引擎室的效果账 `state/task-effects.yaml:607` 自己也写着「同族两个 lighthouse 站早已迁完(astro ^7.2.0)」。派活令里「astro 5→7 是破坏性升级」那句描述的是 8 月 7 日之前的状态。
- D287③ 要并入的 `c226-fortunavirtu-astro-cve` 指向的是**第三个仓 `fortunavirtu-web`**(不是 `lighthouse-fortuna`),它也已在 astro ^7.2.2 / 适配器 ^14.2.1,`npm audit` 同样 high 7 + critical 1。

### 修复路径与干跑结果

`npm audit fix --dry-run`(两仓,不落地)给出的变更清单要点:

| 包 | 现在 | 干跑后 | 备注 |
|---|---|---|---|
| astro | 7.2.0 | 7.3.2 | RCE 修在 7.2.8;registry latest 7.3.2(2026-09-08) |
| sharp | 0.35.3 | 0.35.4 | **这一条才是 RCE 的真修复**(libheif 补丁) |
| @astrojs/cloudflare | 14.2.0 | 14.3.1 | 仍在 `^14.2.0` 范围内 |
| wrangler | 4.122.0(fortuna 4.119.0) | 4.130.0 | 适配器 14.2.5 起要求 `^4.125.0` |
| miniflare / workerd | 5.20260811 / 1.20260811.1 | 5.20260908 / 1.20260908.1 | 本地 dev 工具链 |
| js-yaml / svgo | 4.3.1 / 4.0.2 | 4.3.2 / 4.1.0 | 两条 high 清掉 |

全部在 `package.json` 现有 `^` 范围内 ⇒ **`package.json` 不需要改,只动 `package-lock.json`**。

### 真正的行为变化(官方 changelog,7.2.1 → 7.3.2 与适配器 14.2.1 → 14.3.1 逐条看过)

1. **适配器 14.2.5(PR #17819)**:默认 `compatibility_date` 改为跟随安装的 workerd 版本(当前产物 `dist/server/wrangler.json` 是 `2026-04-15`,升级后会前移)。这是唯一会改 Worker 运行时旗标的一条;本仓没有自带 `wrangler.*`,日期由适配器生成。**建议:升级后 `npm run build` 看生成的 `compatibility_date`,再 `npm run preview` 过一遍 SSR 路由。**
2. astro 7.2.5(PR #17719):session cookie 非 UUID 即拒。两仓源码没用 Astro 的 `context.session`(web 的 `session` 只是 Supabase 的对象,`src/pages/auth/callback.ts:15`),不受影响。
3. astro 7.2.4(PR #17701)base 路径边界修复、7.3.2(PR #17908)i18n fallback 修复:两仓没配 `base`、没配 i18n `fallback`,不受影响。
4. astro 7.3.0:图像服务/缓存提供者拿到 logger、`memoryCache()` 行为收紧 —— 两仓都没用。
5. 其余全是 dev 服务器、增量构建、内容集合、MDX 的修复,两仓不涉及。

生态兼容矩阵:两仓直接依赖里 `@astrojs/*` 只有 `@astrojs/cloudflare` 一个(`npm ls` 无其他 `@astrojs/*` 直接依赖);`@astrojs/cloudflare@14.3.1` peer = `astro ^7.2.0` + `wrangler ^4.125.0`,干跑结果都满足。web 另有 `@supabase/ssr` / `@supabase/supabase-js`,与 astro 版本无关。Node:本机 v26.7.0,astro 7.x 要求 ≥22.12.0。

### 三条硬警告

- 🔴 **绝不要跑 `npm audit fix --force`**:npm 的建议是把 `@astrojs/cloudflare` **降级到 12.6.13**(audit 原文「Will install @astrojs/cloudflare@12.6.13, which is a breaking change」)—— 那会和 astro 7 直接不兼容,是反方向。
- 升级后 `npm audit` **不会归零**:`miniflare@latest`(5.20260908.0-alpha)仍钉死 `sharp: 0.35.2`,`node_modules/miniflare/node_modules/sharp` 那条 high 及其上游链(miniflare / wrangler / @cloudflare/vite-plugin / @astrojs/cloudflare「depends on vulnerable」)会留下。这是本地 dev 模拟器,不进产物。要清它得在 `package.json` 加 `overrides`,那是改 `package.json` 的决定,不在本轮。剩几条以升级后实跑为准,我没有编数字。
- 「做完」的定义是「进了 HEAD」(效果账 `c226-*` 的 HEAD 闸):升级要提交 lockfile。**部署是另一件事**:两仓 08-17 起都「不部署」,线上跑的是旧构建;修 RCE 的意义只有部署后才落到线上(虽然线上本来也够不着它)。

### 量级

每仓:`npm audit fix`(不带 `--force`)→ `npm run build`(fortuna 用 `npm run verify`,它带付款路由门)→ 看 `dist/server/wrangler.json` 的 `compatibility_date` → `npm run preview` 目测 SSR 路由 → 提交 `package-lock.json`。**改的文件类别:只有 lockfile;源码零改动。** 两仓加起来半天以内。可以一次升完。

---

## 我没查的 / 我不确定的

- **没查**:`fortunavirtu-web`(c226 卡真正指向的仓)的图像调用面 —— 只看了它的版本与 audit 计数(同为 8),没跟它的 `src/`;按结构大概率同结论,但没核,不算数。
- **没查**:两仓线上到底部署的是哪个 commit / 哪个 astro 版本。仓里没有 CI(`.github/` 只有 dependabot)、没有 `wrangler.*`,README 写的是 Cloudflare Pages,而适配器 14 生成的是 Workers 形态产物(`dist/server/wrangler.json` + assets binding);部署方式只能从 Cloudflare 后台确认,我没有那一侧的权限也没去碰。
- **不确定**:`lighthouse.sync-value.com` 全站 404 是有意下线还是断了。只有 curl 事实,没有定性。
- **不确定**:Cloudflare 构建环境的 Node 版本是否 ≥22.12(astro 7 的 `engines`)。本机 v26 满足;线上构建环境查不到。
- **没做**:任何形式的实弹验证(没有向任何端点投喂 AVIF 样本);结论全部来自代码路径追踪 + advisory 原文 + 无害 GET 探测。

## 命令留档(可复跑,全部只读)

```
npm ls astro @astrojs/cloudflare sharp                         # 两仓
npm audit                                                       # 两仓
npm audit fix --dry-run                                         # 两仓,不落地
grep -rniE "astro:assets|getImage|<Image|<Picture|\.avif|/_image" src astro.config.mjs
grep -o '"route":"[^"]*"' dist/server/entry.mjs | sort -u
grep -rl "sharp\|libheif\|heif" dist/server
npm view astro time --json                                      # 7.2.8 = 2026-08-26
curl -sS -o /dev/null -w '%{http_code}' 'https://lighthouse.fortuna-virtu.com/_image?href=%2Fassets%2Fimg%2Flighthouse.svg&w=10&f=avif'
```
