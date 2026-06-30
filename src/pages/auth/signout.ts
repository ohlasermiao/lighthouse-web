// 登出
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../lib/supabase';

export const GET: APIRoute = async ({ cookies, request, redirect }) => {
  const supabase = supabaseServer(cookies, request.headers);
  await supabase.auth.signOut();
  return redirect('/');
};
