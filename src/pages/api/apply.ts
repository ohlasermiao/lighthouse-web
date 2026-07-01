// 入会申请后端（form-first）：提交即把申请送到 hello@（永不因用户不确认而丢失）；
// 同时给申请人发一封"确认邮箱"邮件——确认只是"增信"（回信可达性），不是"闸门"。
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

async function sendResend(key: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
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
  const to = env(locals, 'CONTACT_TO') || 'hello@sync-value.com';
  const langTag = lang === 'en' ? ' (EN)' : '';

  let when = '';
  try { when = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date()) + ' (JST)'; } catch {}

  // ① 提交即把申请送到 hello@（标"待确认邮箱"——永不因用户不点确认而丢失）
  const appHtml = `<div style="font-family:-apple-system,'PingFang SC',sans-serif;font-size:14px;line-height:1.7;color:#232323;max-width:560px">
    <div style="background:#16314f;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-weight:600">Lighthouse Club · 入会申请${langTag}　<span style="color:#f0b64b">⏳ 邮箱待确认</span></div>
    <div style="border:1px solid #e6ebf1;border-top:0;border-radius:0 0 10px 10px;padding:18px">
      <div style="background:#fff7e6;border:1px solid #ffe1a6;border-radius:8px;padding:10px 12px;font-size:13px;color:#8a6d1f;margin:0 0 14px">⚠️ 申请人尚未点击确认邮箱链接，邮箱可达性未验证。回信前建议先等到本人的"✓ 已确认"提示，或谨慎核对邮箱是否正确。</div>
      <table style="font-size:14px;margin:0 0 8px">
        <tr><td style="color:#6b7a88;padding:2px 12px 2px 0">称呼</td><td><strong>${esc(name)}</strong></td></tr>
        <tr><td style="color:#6b7a88;padding:2px 12px 2px 0">邮箱（待确认）</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        ${when ? `<tr><td style="color:#6b7a88;padding:2px 12px 2px 0">提交时间</td><td>${esc(when)}</td></tr>` : ''}
      </table>
      <p><strong>加入动机：</strong></p><p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px;margin:4px 0 12px">${esc(motivation)}</p>
      ${source ? `<p><strong>来源：</strong>${esc(source)}</p>` : ''}
      <p style="color:#9aa7b4;font-size:12px;border-top:1px solid #eef2f6;padding-top:10px;margin-top:14px">直接回复本邮件即可回信给申请人（reply-to 已设为其邮箱）。</p>
    </div>
  </div>`;
  const delivered = await sendResend(key, {
    from: FROM, to: [to], reply_to: email,
    subject: `[入会申请·待确认]${langTag} ${name}`, html: appHtml,
  });
  if (!delivered) return json({ ok: false, error: 'send_failed' }, 502);

  // ② 给申请人发"确认邮箱"邮件（点了→我们向 hello@ 追一条"✓已确认"，作为回信安全信号）
  const secret = env(locals, 'APPLY_SECRET') || key;
  const token = await signApply(
    { email, name, motivation, source, lang, exp: Date.now() + 24 * 3600 * 1000 },
    secret,
  );
  const origin = new URL(request.url).origin;
  const confirmUrl = `${origin}${lang === 'en' ? '/en' : ''}/apply/confirmed?token=${encodeURIComponent(token)}`;

  const t = lang === 'en'
    ? {
        subject: 'Confirm your email — Lighthouse Club application',
        head: 'Your application is in — one quick thing',
        body: `Hi ${esc(name)}, we've received your application to Lighthouse Club. To make sure our decision reaches you, please confirm this email address by clicking below. The link expires in 24 hours.`,
        btn: 'Confirm my email',
        fallback: 'If the button doesn\'t work, copy this link into your browser:',
        ignore: 'Didn\'t apply? You can safely ignore this email.',
      }
    : {
        subject: '确认你的邮箱 · Lighthouse Club 申请',
        head: '你的申请已收到——顺手确认一下邮箱',
        body: `${esc(name)} 你好，你申请加入 Lighthouse Club 的信息我们已经收到。为确保审核结果一定送达，请点击下方确认这个邮箱地址。链接 24 小时内有效。`,
        btn: '确认我的邮箱',
        fallback: '如果按钮无法点击，把下面的链接复制到浏览器打开：',
        ignore: '不是你申请的？可以安全忽略本邮件。',
      };

  const confirmHtml = `<div style="font-family:-apple-system,'PingFang SC',sans-serif;font-size:15px;line-height:1.7;color:#232323;max-width:520px">
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
  // 确认信尽力发送；失败不影响申请已送达
  await sendResend(key, { from: FROM, to: [email], subject: t.subject, html: confirmHtml });

  return json({ ok: true });
};
