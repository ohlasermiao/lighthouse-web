// 入会申请后端（form-first + 邮箱验证闸门）：提交只建一条 pending 申请并给申请人发确认邮件。
// 申请要等用户点确认邮件里的魔法链接（→ /apply/confirmed）才正式送到 hello@（只发这一封）。
export const prerender = false;
import type { APIRoute } from 'astro';
import { signToken } from '../../lib/apply-token';
import { supabaseServer } from '../../lib/supabase';

const FROM = 'Lighthouse Club <noreply@mail.sync-value.com>';
const DAY = 24 * 3600 * 1000;

function env(locals: any, key: string): string | undefined {
  return locals?.runtime?.env?.[key] ?? (import.meta.env as any)[key];
}

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

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const data: Record<string, string> = {};
  try {
    const f = await request.formData();
    for (const [k, v] of f.entries()) data[k] = String(v ?? '');
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  if ((data._gotcha || '').trim()) return json({ ok: true, status_token: '' });

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

  // 建一条 pending 申请
  const supabase = supabaseServer(cookies, request.headers);
  const { data: id, error: dbErr } = await supabase.rpc('create_web_application', {
    p_email: email, p_name: name, p_motivation: motivation, p_source: source, p_lang: lang,
  });
  if (dbErr || !id) return json({ ok: false, error: 'db_error' }, 502);

  const secret = env(locals, 'APPLY_SECRET') || key;
  const confirmToken = await signToken({ id: String(id), p: 'confirm', exp: Date.now() + DAY }, secret);
  const statusToken = await signToken({ id: String(id), p: 'status', exp: Date.now() + DAY }, secret);
  const origin = new URL(request.url).origin;
  const confirmUrl = `${origin}${lang === 'en' ? '/en' : ''}/apply/confirmed?token=${encodeURIComponent(confirmToken)}`;

  const t = lang === 'en'
    ? {
        subject: 'Verify your email to complete your Lighthouse Club application',
        head: 'One required step — verify your email',
        body: `Hi ${esc(name)}, your application isn't submitted yet. Click the button below to verify this email address — only then is your application sent to us. The link expires in 24 hours.`,
        btn: 'Verify my email & submit',
        fallback: 'If the button doesn\'t work, copy this link into your browser:',
        ignore: 'Didn\'t apply? You can safely ignore this email — nothing will be submitted.',
      }
    : {
        subject: '验证邮箱以完成 Lighthouse Club 申请',
        head: '还差一步——验证你的邮箱',
        body: `${esc(name)} 你好，你的申请还没有提交成功。点击下方按钮验证这个邮箱地址——验证后你的申请才会正式送到我们手上。链接 24 小时内有效。`,
        btn: '验证邮箱并提交申请',
        fallback: '如果按钮无法点击，把下面的链接复制到浏览器打开：',
        ignore: '不是你申请的？可以安全忽略本邮件——不会有任何内容被提交。',
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

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject: t.subject, html: confirmHtml }),
    });
    if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502);
    return json({ ok: true, status_token: statusToken });
  } catch {
    return json({ ok: false, error: 'send_error' }, 502);
  }
};
