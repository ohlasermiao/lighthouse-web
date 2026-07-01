// 发起 Discord OAuth（identify + email + guilds.join 召回授权）
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../lib/supabase';

export const GET: APIRoute = async ({ cookies, request, redirect, url }) => {
  const supabase = supabaseServer(cookies, request.headers);
  const origin = new URL(request.url).origin;
  const next = url.searchParams.get('next');
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : '';
  if (safeNext) cookies.set('lh_next', safeNext, { path: '/', maxAge: 1800, sameSite: 'lax', httpOnly: true });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      scopes: 'identify email guilds.join',
      redirectTo: `${origin}/auth/callback`,
    },
  });
  if (error || !data?.url) return redirect('/auth/login?e=discord');
  return redirect(data.url, 302);
};
