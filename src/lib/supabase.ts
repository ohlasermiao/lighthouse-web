// 会员中枢 M6 —— Supabase 会话客户端（仅用公开 anon key + cookie，网站层零密钥）
import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * 绑定到当前请求的 Supabase 服务端客户端：
 * - 用 anon 公钥 + 用户会话 cookie（RLS / auth.email() 据此生效）
 * - 读 cookie 来自请求头，写 cookie 经 Astro.cookies
 */
export function supabaseServer(cookies: AstroCookies, headers: Headers) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const raw = headers.get('cookie') ?? '';
        return raw
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const i = c.indexOf('=');
            return { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) };
          });
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}
