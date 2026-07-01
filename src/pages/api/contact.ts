// 联系/申请表单后端 —— 自建，走 Resend 发信（替代 Formspree）。字段无关：通吃任意表单。
export const prerender = false;
import type { APIRoute } from 'astro';

const DEFAULT_TO = 'hello@sync-value.com';
const FROM = 'Lighthouse Club <noreply@mail.sync-value.com>';

// 已知字段的中文标签；未知字段用原始 key
const LABELS: Record<string, string> = {
  name: '称呼', email: '邮箱', message: '内容', motivation: '加入动机',
  source: '来源', phone: '电话', address: '地址',
};

function env(locals: any, key: string): string | undefined {
  return locals?.runtime?.env?.[key] ?? (import.meta.env as any)[key];
}
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const POST: APIRoute = async ({ request, locals }) => {
  // 解析成通用 key→value（支持 formData 与 JSON）
  const data: Record<string, string> = {};
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await request.json();
      for (const [k, v] of Object.entries(j)) data[k] = String(v ?? '');
    } else {
      const f = await request.formData();
      for (const [k, v] of f.entries()) data[k] = String(v ?? '');
    }
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // honeypot 被填 = 机器人 → 静默"成功"丢弃
  if ((data._gotcha || '').trim()) return json({ ok: true });

  const subject = (data._subject || 'Lighthouse Club 网站表单').trim();
  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'invalid' }, 422);
  }

  // 渲染所有内容字段（跳过下划线 meta 与已单列的 name/email）
  const rows = Object.entries(data)
    .filter(([k, v]) => !k.startsWith('_') && k !== 'name' && k !== 'email' && String(v).trim())
    .map(([k, v]) => {
      const label = LABELS[k] || k;
      const val = String(v).slice(0, 5000);
      return `<p><strong>${esc(label)}：</strong></p><p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px;margin:4px 0 12px">${esc(val)}</p>`;
    }).join('');

  // 提交时间（东京时区，便于运营）
  let when = '';
  try {
    when = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date()) + ' (JST)';
  } catch { /* ignore */ }

  const html = `<div style="font-family:-apple-system,'PingFang SC',sans-serif;font-size:14px;line-height:1.7;color:#232323;max-width:560px">
    <div style="background:#16314f;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-weight:600">
      Lighthouse Club · 网站表单${subject ? `（${esc(subject)}）` : ''}
    </div>
    <div style="border:1px solid #e6ebf1;border-top:0;border-radius:0 0 10px 10px;padding:18px">
      <table style="font-size:14px;margin:0 0 8px"><tr><td style="color:#6b7a88;padding:2px 12px 2px 0">称呼</td><td><strong>${esc(name)}</strong></td></tr>
      <tr><td style="color:#6b7a88;padding:2px 12px 2px 0">邮箱</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
      ${when ? `<tr><td style="color:#6b7a88;padding:2px 12px 2px 0">提交时间</td><td>${esc(when)}</td></tr>` : ''}</table>
      ${rows}
      <p style="color:#9aa7b4;font-size:12px;border-top:1px solid #eef2f6;padding-top:10px;margin-top:14px">直接回复本邮件即可回信给对方（reply-to 已设为其邮箱）。</p>
    </div>
  </div>`;

  const textBody = `Lighthouse Club 网站表单${subject ? `（${subject}）` : ''}\n称呼：${name}\n邮箱：${email}${when ? `\n提交时间：${when}` : ''}\n\n`
    + Object.entries(data).filter(([k, v]) => !k.startsWith('_') && k !== 'name' && k !== 'email' && String(v).trim())
        .map(([k, v]) => `${LABELS[k] || k}：${v}`).join('\n')
    + `\n\n（直接回复本邮件即可回信给对方）`;

  const key = env(locals, 'RESEND_API_KEY');
  if (!key) return json({ ok: false, error: 'not_configured' }, 500);
  const to = env(locals, 'CONTACT_TO') || DEFAULT_TO;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: email, subject: `[表单] ${subject} — ${name}`, html, text: textBody }),
    });
    if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'send_error' }, 502);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
