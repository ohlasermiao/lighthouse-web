// 入会申请后端（form-first / 双重确认）：校验 → 发"确认邮件"给申请人（内含 HMAC 令牌链接）。
// 只有点击确认链接、命中 /apply/confirmed 才把申请正式送到 hello@。杜绝错邮箱退信、不给非会员建账号。
export const prerender = false;
import type { APIRoute } from 'astro';
import { signApply } from '../../lib/apply-token';

const FROM = 'Lighthouse Club <noreply@mail.sync-value.com>';

function env(locals: any, key: string): string | undefined {
  return locals?.runtime?.env?.[key] ?? (import.meta.env as any)[key];
}

// 邮箱域名可达性：Cloudflare DoH 查 MX（无则查 A）。明确无邮件服务器=拒；查询失败=放行。
async function domainDeliverable(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  const has = async (type: string) => {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
        { headers: { Accept: 'application/dns-json' } });
      const j: any = await r.json();
      return Array.isArray(j.Answer) && j.Answer.some((a: any) => a.type === (type === 'MX' ? 15 : 1));
    } catch { return null; }
  };
  const mx = await has('MX');
  if (mx === true) return true;
  if (mx === null) return true;
  const a = await has('A');
  return a !== false;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const data: Record<string, string> = {};
  try {
    const f = await request.formData();
    for (const [k, v] of f.entries()) data[k] = String(v ?? '');
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // honeypot 被填 = 机器人 → 静默"成功"丢弃
  if ((data._gotcha || '').trim()) return json({ ok: true });

  const name = (data.name || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const motivation = (data.motivation || '').trim().slice(0, 2000);
  const source = (data.source || '').trim().slice(0, 300);
  const lang = data.lang === 'en' ? 'en' : 'zh';

  if (!name || !motivation || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'invalid' }, 422);
  }
  if (!(await domainDeliverable(email))) {
    return json({ ok: false, error: 'email_undeliverable' }, 422);
  }

  // Cloudflare Turnstile 人机校验（设了 secret 才校验；本地 dev 无 secret 则跳过）
  const tsSecret = env(locals, 'TURNSTILE_SECRET');
  if (tsSecret) {
    try {
      const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: tsSecret, response: data['cf-turnstile-response'] || '' }),
      });
      const out: any = await v.json();
      if (!out?.success) return json({ ok: false, error: 'captcha' }, 403);
    } catch {
      return json({ ok: false, error: 'captcha_error' }, 502);
    }
  }

  const key = env(locals, 'RESEND_API_KEY');
  if (!key) return json({ ok: false, error: 'not_configured' }, 500);
  // 令牌密钥：优先专用 APPLY_SECRET，否则复用 RESEND_API_KEY（都在服务端、不外泄）。
  const secret = env(locals, 'APPLY_SECRET') || key;

  const token = await signApply(
    { email, name, motivation, source, lang, exp: Date.now() + 24 * 3600 * 1000 },
    secret,
  );
  const origin = new URL(request.url).origin;
  const confirmUrl = `${origin}${lang === 'en' ? '/en' : ''}/apply/confirmed?token=${encodeURIComponent(token)}`;

  const t = lang === 'en'
    ? {
        subject: 'Confirm your Lighthouse Club application',
        head: 'One last step — confirm your email',
        body: `Hi ${esc(name)}, thanks for applying to Lighthouse Club. Click the button below to confirm this email address and send us your application. The link expires in 24 hours.`,
        btn: 'Confirm & send my application',
        fallback: 'If the button doesn\'t work, copy this link into your browser:',
        ignore: 'Didn\'t apply? You can safely ignore this email — nothing will be sent.',
      }
    : {
        subject: '确认你的 Lighthouse Club 申请',
        head: '最后一步——确认你的邮箱',
        body: `${esc(name)} 你好，感谢申请加入 Lighthouse Club。点击下方按钮确认这个邮箱地址，你的申请就会正式送到我们手上。链接 24 小时内有效。`,
        btn: '确认并提交我的申请',
        fallback: '如果按钮无法点击，把下面的链接复制到浏览器打开：',
        ignore: '不是你申请的？可以安全忽略本邮件——不会有任何内容被提交。',
      };

  const html = `<div style="font-family:-apple-system,'PingFang SC',sans-serif;font-size:15px;line-height:1.7;color:#232323;max-width:520px">
    <div style="background:#16314f;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-weight:600">Lighthouse Club</div>
    <div style="border:1px solid #e6ebf1;border-top:0;border-radius:0 0 10px 10px;padding:24px 20px">
      <h2 style="margin:0 0 12px;font-size:18px">${t.head}</h2>
      <p style="margin:0 0 20px">${t.body}</p>
      <p style="margin:0 0 22px"><a href="${confirmUrl}" style="display:inline-block;background:#f0b64b;color:#3a2600;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:999px">${t.btn}</a></p>
      <p style="margin:0 0 6px;color:#6b7a88;font-size:13px">${t.fallback}</p>
      <p style="margin:0 0 20px;font-size:12px;word-break:break-all"><a href="${confirmUrl}" style="color:#2a6db5">${confirmUrl}</a></p>
      <p style="color:#9aa7b4;font-size:12px;border-top:1px solid #eef2f6;padding-top:12px;margin:0">${t.ignore}</p>
    </div>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject: t.subject, html }),
    });
    if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'send_error' }, 502);
  }
};
