import { defineMiddleware } from 'astro:middleware';

// 安全响应头（SSR 路由：/my、/auth/*、/api/* 等）——2026-07-09 ZAP baseline 首轮加固
// CF Pages 的 public/_headers 只作用于静态资源，SSR 走这里，两处需保持同步。
// CSP 现处 Report-Only 观察期，确认无误报后再转强制（Content-Security-Policy）。
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()',
  'Content-Security-Policy-Report-Only':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co; " +
    'frame-src https://challenges.cloudflare.com; ' +
    "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  } catch {
    // Response.redirect() 等产生的 immutable headers 无法直接写，克隆后再下发
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(name, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
});
