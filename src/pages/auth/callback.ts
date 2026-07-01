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
  // guilds.join 召回 token：上线阶段先不存（避免在真实会员上明文存 OAuth token）。
  // 待加密方案（Vault + pgcrypto）就绪后再改回 session.provider_refresh_token 采集。
  const refreshToken = null;

  const { error: rpcError } = await supabase.rpc('ensure_my_account', {
    p_discord_uid: discordUid,
    p_discord_name: discordName,
    p_refresh_token: refreshToken,
  });
  // 建账号失败不阻断登录；/my 会据实显示"未关联"
  if (rpcError) console.error('ensure_my_account failed:', rpcError.message);

  return redirect('/my');
};
