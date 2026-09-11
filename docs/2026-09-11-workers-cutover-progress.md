# c-353 独立迁移进度

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
