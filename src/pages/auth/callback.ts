// OAuth / 魔法链接回调：用 code 换会话，写 cookie，回 /my
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../lib/supabase';

export const GET: APIRoute = async ({ cookies, request, redirect, url }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/auth/login?e=nocode');
  const supabase = supabaseServer(cookies, request.headers);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect('/auth/login?e=exchange');
  return redirect('/my');
};
