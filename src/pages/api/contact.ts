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

  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#222">
    <p><strong>来自 Lighthouse Club 网站表单</strong></p>
    <p><strong>称呼：</strong>${esc(name)}<br/><strong>邮箱：</strong>${esc(email)}</p>
    ${rows}
  </div>`;

  const key = env(locals, 'RESEND_API_KEY');
  if (!key) return json({ ok: false, error: 'not_configured' }, 500);
  const to = env(locals, 'CONTACT_TO') || DEFAULT_TO;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: email, subject: `[表单] ${subject} — ${name}`, html }),
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
