// 联系/申请表单后端 —— 自建，走 Resend 发信（替代 Formspree）
export const prerender = false;
import type { APIRoute } from 'astro';

// 收件地址：可用 CF 环境变量 CONTACT_TO 覆盖，默认 hello@
const DEFAULT_TO = 'hello@sync-value.com';
const FROM = 'Lighthouse Club <noreply@mail.sync-value.com>';

function env(locals: any, key: string): string | undefined {
  // Cloudflare 运行时密钥在 locals.runtime.env；本地 dev 回退 import.meta.env
  return locals?.runtime?.env?.[key] ?? (import.meta.env as any)[key];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const POST: APIRoute = async ({ request, locals }) => {
  let name = '', email = '', message = '', subject = 'Lighthouse Club 网站表单', gotcha = '';
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await request.json();
      ({ name = '', email = '', message = '' } = j);
      subject = j._subject || subject; gotcha = j._gotcha || '';
    } else {
      const f = await request.formData();
      name = String(f.get('name') || '');
      email = String(f.get('email') || '');
      message = String(f.get('message') || '');
      subject = String(f.get('_subject') || subject);
      gotcha = String(f.get('_gotcha') || '');
    }
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // 反垃圾：honeypot 被填 = 机器人 → 静默"成功"丢弃
  if (gotcha.trim()) return json({ ok: true });

  name = name.trim(); email = email.trim(); message = message.trim();
  if (!name || !email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'invalid' }, 422);
  }
  if (message.length > 5000) message = message.slice(0, 5000);

  const key = env(locals, 'RESEND_API_KEY');
  if (!key) return json({ ok: false, error: 'not_configured' }, 500);
  const to = env(locals, 'CONTACT_TO') || DEFAULT_TO;

  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#222">
    <p><strong>来自 Lighthouse Club 网站表单</strong></p>
    <p><strong>称呼：</strong>${esc(name)}<br/>
    <strong>邮箱：</strong>${esc(email)}</p>
    <p><strong>内容：</strong></p>
    <p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px">${esc(message)}</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: email,          // 直接回复即发给提交者
        subject: `[表单] ${subject} — ${name}`,
        html,
      }),
    });
    if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'send_error' }, 502);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
