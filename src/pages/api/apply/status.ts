// 申请状态轮询：成功页据此判断用户是否已点邮件魔法链接完成验证。
// 只接受签名的 status 令牌（防枚举），只返回 pending/confirmed，不泄漏任何申请内容。
export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyToken } from '../../../lib/apply-token';
import { supabaseServer } from '../../../lib/supabase';

function env(locals: any, key: string): string | undefined {
  return locals?.runtime?.env?.[key] ?? (import.meta.env as any)[key];
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const token = new URL(request.url).searchParams.get('token') || '';
  const secret = env(locals, 'APPLY_SECRET') || env(locals, 'RESEND_API_KEY') || '';
  const payload = await verifyToken(token, secret);
  if (!payload || payload.p !== 'status' || !payload.id) return json({ status: 'invalid' }, 400);

  const supabase = supabaseServer(cookies, request.headers);
  const { data, error } = await supabase.rpc('web_application_status', { p_id: payload.id });
  if (error) return json({ status: 'error' }, 502);
  return json({ status: data || 'unknown' });
};
