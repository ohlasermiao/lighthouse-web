// OAuth / 魔法链接回调：用 code 换会话，自动建账号/绑定，回 /my
export const prerender = false;
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../lib/supabase';

export const GET: APIRoute = async ({ cookies, request, redirect, url }) => {
  const code = url.searchParams.get('code');
  if (!code) return redirect('/auth/login?e=nocode');

  const supabase = supabaseServer(cookies, request.headers);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect('/auth/login?e=exchange');

  // P2：登录后自动建会员账号（邮箱为根）；若是 Discord 登录则绑定身份 + 存召回 token
  const session = data.session;
  const meta = session?.user?.user_metadata ?? {};
  const isDiscord =
    session?.user?.app_metadata?.provider === 'discord' ||
    (session?.user?.app_metadata?.providers ?? []).includes('discord');

  const discordUid = isDiscord ? (meta.provider_id ?? meta.sub ?? null) : null;
  const discordName = isDiscord
    ? (meta.full_name ?? meta.name ?? meta.custom_claims?.global_name ?? null)
    : null;
  // provider_refresh_token 仅在 OAuth 回调当下可得 → 在这里抓取存库（guilds.join 灾备召回用）
  const refreshToken = isDiscord ? (session?.provider_refresh_token ?? null) : null;

  const { error: rpcError } = await supabase.rpc('ensure_my_account', {
    p_discord_uid: discordUid,
    p_discord_name: discordName,
    p_refresh_token: refreshToken,
  });
  // 建账号失败不阻断登录；/my 会据实显示"未关联"
  if (rpcError) console.error('ensure_my_account failed:', rpcError.message);

  return redirect('/my');
};
