# c-353 独立迁移进度

> 当前态：正式域名已于 2026-09-11 15:15 JST 切到 Worker，机械验收通过；等待真人邮箱、Discord 登录及申请确认验收。下方早期「缺Resend、域名未切」是历史记录，已被末节完成记录覆盖。

用户授权（2026-09-11，本 Codex 对话）：「批准了。
记住现在dispatch和Claude已经因为没有token而卡死了。从现在开始我们独立推进。」

## 已完成
- 在 fix/ssr-workers-migration / fd4a3cf 基础新增 wrangler.jsonc；当前独立施工不等待其他席位。未合并、未推送，避免触发 Pages。
- Worker lighthouse-web 已部署：https://lighthouse-web.miaoyf.workers.dev 。首次版本 cb2d7849-f1fe-4ffd-b0d1-53fef9c27461；之后添加两项 secret 会产生新版本。
- 本机构建 PUBLIC_SUPABASE_ANON_KEY 与 Pages 正式值不一致：已从 Pages API 取正式 PUBLIC_* 仅用于构建，重新构建上传。以后构建亦必须使用正式 PUBLIC_*，不能直接沿用本地 .env。
- SESSION KV 已创建并固定 ID 3024529f59fb4bae9333dfea9e56ed1f；ASSETS 只绑定 dist/client；适配器生成 server 配置，使用其部署指针。构建、dry-run、类型生成通过，Worker startup 20ms。
- TURNSTILE_SECRET 从官方挂件配置取得并写入 Worker（原值、未轮换）；新增独立 APPLY_SECRET。未存明文于仓库或日志。Turnstile 限 sync-value.com 及其子域，workers.dev 不可完成真人验证码，这是预览限制。
- 云端静态与中英文登录200；my/account/callback/discord/signout302；坏申请token400 JSON；中英文坏token确认页200（非成功确认）；/server/entry.mjs、旧chunk、/.env、/wrangler.json 均404。
- 两表单有效基本字段但无验证码均403 captcha；申请表单需同源 Origin，跨站 POST 403。未发邮件、未写有效申请。
- 原Pages域名/DNS/构建/键名快照附后，正式域名未切；c-352 三域12路径再次仅返回Access HTML，三条策略仍只有deny everyone。

## 唯一当前凭据阻塞
RESEND_API_KEY 尚未迁入。Pages API不返回secret值。尝试申请通过一次性Service Auth访问旧构建取回原键并保存到0600临时文件，被自动审批拒绝；整个命令未执行，未创建令牌或策略、未保存密钥。拒绝理由：迁移授权未明确覆盖非标准来源的凭据提取与本地保存。不得绕过；需用户明确授权该取回方式，或用户经安全渠道提供既有键。不要求轮换。

## 下一步
取得Resend原键并通过stdin写入Worker；完整构建/绑定复验与merge前review；预览通过后按授权切域，真人邮箱/Discord/申请确认验收待用户。切域前复核快照仍与当前一致；未达到这些条件，不宣称c-353完成。

## 回退快照（无密钥值）

```json
{
  "pages_domains": [
    {
      "id": "cea1886a-ef54-4fb0-af71-93da4890ac8d",
      "domain_id": "cea1886a-ef54-4fb0-af71-93da4890ac8d",
      "name": "lighthouse.sync-value.com",
      "status": "active",
      "verification_data": {
        "status": "active"
      },
      "validation_data": {
        "status": "active",
        "method": "http"
      },
      "certificate_authority": "google",
      "zone_tag": "549abe16006dbd9fbd3eb985cd7fcf1d",
      "created_on": "2026-06-08T11:59:46.023073Z"
    }
  ],
  "dns": [
    {
      "id": "dbd08327d25abaa27b4e5fee6584e233",
      "name": "lighthouse.sync-value.com",
      "type": "CNAME",
      "content": "lighthouse-web.pages.dev",
      "proxiable": true,
      "proxied": true,
      "ttl": 1,
      "settings": {
        "flatten_cname": false
      },
      "meta": {},
      "comment": null,
      "tags": [],
      "created_on": "2026-06-08T11:59:45.758919Z",
      "modified_on": "2026-06-08T11:59:45.758919Z"
    }
  ],
  "source": {
    "type": "github",
    "config": {
      "owner": "ohlasermiao",
      "owner_id": "70562294",
      "repo_name": "lighthouse-web",
      "repo_id": "1262861156",
      "production_branch": "main",
      "pr_comments_enabled": true,
      "deployments_enabled": true,
      "production_deployments_enabled": true,
      "preview_deployment_setting": "all",
      "preview_branch_includes": [
        "*"
      ],
      "preview_branch_excludes": [],
      "path_includes": [
        "*"
      ],
      "path_excludes": []
    }
  },
  "build": {
    "build_command": "npm run build",
    "destination_dir": "dist/client",
    "build_caching": true,
    "root_dir": "",
    "web_analytics_tag": null,
    "web_analytics_token": null
  },
  "env_keys": [
    "PUBLIC_SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_URL",
    "RESEND_API_KEY",
    "TURNSTILE_SECRET"
  ],
  "worker": "lighthouse-web",
  "zone_id": "549abe16006dbd9fbd3eb985cd7fcf1d",
  "account_id": "8a6e61b2ffd51e907007911aad4000d0"
}
```

## 路由原始结果
```json
[
  {
    "path": "/",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/auth/login",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/en/auth/login",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/my",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/en/my",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/account",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/auth/callback",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/auth/discord",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/auth/signout",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/api/apply/status?token=a.b",
    "result": "400 application/json",
    "rc": 0
  },
  {
    "path": "/apply/confirmed?token=a.b",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/en/apply/confirmed?token=a.b",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/server/entry.mjs",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "/server/chunks/apply_B_lQ0cjB.mjs",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "/.env",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "/wrangler.json",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "POST /api/contact",
    "result": "{\"ok\":false,\"error\":\"captcha\"}\n403",
    "rc": 0
  },
  {
    "path": "POST /api/apply",
    "result": "{\"ok\":false,\"error\":\"bad_request\"}\n400",
    "rc": 0
  }
]
```
补验：同源 application/x-www-form-urlencoded 的 /api/apply 返回403 captcha；上表JSON请求400仅为解析拒绝，不作验证码验收。

## 正式切换完成记录（本轮取键授权后）
用户针对一次性认证取回原 Resend 键的明确答复：「授权」。坐标：本Codex对话本轮，2026-09-11；未编造精确用户消息时间。

- 使用仅限本次 service token 的 Service Auth，保留公众 deny everyone；前两次因策略序号重复失败，令牌均清除。修正为唯一序号后取得原键，直接经内存及stdin写入 Worker；未保存任何密钥文件、未打印密钥。
- 临时策略和令牌全部删除；令牌列表复验临时名称数量0，原应用仅deny策略。原两把键未轮换。
- Worker secret键名复验 APPLY_SECRET、RESEND_API_KEY、TURNSTILE_SECRET 三项齐全。
- 独立 codex review --base main 无可操作回归；该评审进程内构建因ECONNRESET未完成，不冒充其构建通过。实际部署前构建、dry-run和云端预览已通过，正式域名验收另见下。
- 15:15 JST 将正式域名从Pages解绑、删除旧CNAME、绑定Worker。解绑至绑定API完成约0.95秒；首次四项正式验证在解绑后约2.56秒完成。不等同于测得所有地区无中断。
- 正式域名18项复验：主页/中英文登录200，会员/账户/回调/Discord/退出302；坏token状态400，坏token确认页200错误态；源码/环境/config四项404；两个表单无验证码403 captcha。未发送真实邮件、未创建有效申请。
- Pages项目保留作回退；尚未合并或推送源分支，Pages自动构建目前仍保留。不能删除回退项目或宣称整卡完成，直到真人验收和观察结束。
- wrangler.jsonc 已同步自定义域名与既有KV绑定，下一次部署必须仍使用正式PUBLIC_*构建并保留三secret；勿直接用本机.env重建部署。
- 下一步由当前Codex独立续办，无需dispatch/Claude：请用户完成邮箱登录、Discord登录和申请确认收信；通过后再处理源分支合并/发布入口与观察收尾。

### 切换时间线
```json
[
  {
    "at": "2026-09-11T06:15:26.443911+00:00",
    "event": "preflight_verified"
  },
  {
    "at": "2026-09-11T06:15:26.770728+00:00",
    "event": "pages_domain_detached"
  },
  {
    "at": "2026-09-11T06:15:27.236265+00:00",
    "event": "old_dns_removed"
  },
  {
    "at": "2026-09-11T06:15:27.720432+00:00",
    "event": "worker_domain_attached 93d0eb69367aa5091918c1a2b5348ba9b49315b2"
  },
  {
    "at": "2026-09-11T06:15:29.335312+00:00",
    "event": "checks {\"/\": \"200\", \"/my\": \"302\", \"/api/apply/status?token=a.b\": \"400\", \"/server/entry.mjs\": \"404\"}"
  },
  {
    "at": "2026-09-11T06:15:29.335610+00:00",
    "event": "cutover_mechanical_acceptance_passed"
  }
]
```
### 正式域名复验
```json
[
  {
    "path": "/",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/auth/login",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/en/auth/login",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/my",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/en/my",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/account",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/auth/callback",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/auth/discord",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/auth/signout",
    "result": "302 ",
    "rc": 0
  },
  {
    "path": "/api/apply/status?token=a.b",
    "result": "400 application/json",
    "rc": 0
  },
  {
    "path": "/apply/confirmed?token=a.b",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/en/apply/confirmed?token=a.b",
    "result": "200 text/html",
    "rc": 0
  },
  {
    "path": "/server/entry.mjs",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "/server/chunks/apply_B_lQ0cjB.mjs",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "/.env",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "/wrangler.json",
    "result": "404 text/html",
    "rc": 0
  },
  {
    "path": "POST /api/contact",
    "result": "{\"ok\":false,\"error\":\"captcha\"}\n403",
    "rc": 0
  },
  {
    "path": "POST /api/apply",
    "result": "{\"ok\":false,\"error\":\"captcha\"}\n403",
    "rc": 0
  }
]
```
### Cloudflare正式配置回读
```json
{
  "domains": [
    {
      "id": "93d0eb69367aa5091918c1a2b5348ba9b49315b2",
      "zone_id": "549abe16006dbd9fbd3eb985cd7fcf1d",
      "zone_name": "sync-value.com",
      "hostname": "lighthouse.sync-value.com",
      "service": "lighthouse-web",
      "environment": "production",
      "cert_id": "4c16d3fe-bb12-4d9e-a80e-ac452def8dab",
      "previews_enabled": false,
      "enabled": true
    }
  ],
  "pages_domains": [],
  "dns": [
    {
      "id": "fdf68fa041297f323eb5d64a7504707a",
      "name": "lighthouse.sync-value.com",
      "type": "AAAA",
      "content": "100::",
      "proxiable": true,
      "proxied": true,
      "ttl": 1,
      "settings": {},
      "meta": {
        "origin_worker_id": "93d0eb69367aa5091918c1a2b5348ba9b49315b2",
        "read_only": true
      },
      "comment": null,
      "tags": [],
      "created_on": "2026-09-11T06:15:27.577543Z",
      "modified_on": "2026-09-11T06:15:27.577543Z"
    }
  ],
  "deployments": {
    "deployments": [
      {
        "id": "12c083cf-0711-40cc-9ba8-f2f7a456af8d",
        "source": "wrangler",
        "strategy": "percentage",
        "author_email": "miaoyf@me.com",
        "annotations": {
          "workers/triggered_by": "secret"
        },
        "versions": [
          {
            "version_id": "d01b7526-e898-4a1c-b2ca-120d3eefa1a0",
            "percentage": 100
          }
        ],
        "created_on": "2026-09-11T06:13:44.308791Z"
      },
      {
        "id": "060294c2-8f73-4abd-9b06-76c294f2e14d",
        "source": "wrangler",
        "strategy": "percentage",
        "author_email": "miaoyf@me.com",
        "annotations": {
          "workers/triggered_by": "secret"
        },
        "versions": [
          {
            "version_id": "c33a248b-e3eb-492c-90f1-ccca7eff0c81",
            "percentage": 100
          }
        ],
        "created_on": "2026-09-11T06:05:30.51809Z"
      },
      {
        "id": "a0278b6f-4251-44e7-a035-847f1d2a8d88",
        "source": "wrangler",
        "strategy": "percentage",
        "author_email": "miaoyf@me.com",
        "annotations": {
          "workers/message": "Automatic deployment on upload.",
          "workers/triggered_by": "upload"
        },
        "versions": [
          {
            "version_id": "cb2d7849-f1fe-4ffd-b0d1-53fef9c27461",
            "percentage": 100
          }
        ],
        "created_on": "2026-09-11T06:04:25.374578Z"
      }
    ]
  }
}
```

## 真人验收补充：申请确认通过
用户原话「验证成功」，附截图显示「邮箱已验证，申请已提交！」；坐标本Codex对话2026-09-11本轮。截图存 docs/evidence/c353-application-confirmed-20260911.png，复制SHA-256一致。确认申请邮件验证链路通过；未将本图推断为邮箱登录进入会员页或Discord登录通过，这两项仍待用户确认。

## 真人验收全部通过
用户逐字确认：「邮箱登录进入会员页、Discord 登录，这两项都成功了。」（本Codex对话2026-09-11本轮，未提供精确消息时间）。结合上一轮申请邮件确认成功截图，三项真人验收全部通过。正式迁移及功能验收完成；源分支归并与旧Pages回退观察仍是工程收尾，不再等用户重复验收。
