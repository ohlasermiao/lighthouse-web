// 申请确认令牌：无状态 HMAC 签名，不落库。payload 内含申请内容，24h 过期。
// 用途：新用户填完申请表 → 我们发确认邮件（内含此令牌链接）→ 用户点击 → 校验通过后才把申请正式送到 hello@。
// 这样既杜绝错邮箱退信（收不到确认邮件=点不了），又不必给"还没成为会员的人"建账号。

export interface ApplyPayload {
  email: string;
  name: string;
  motivation: string;
  source?: string;
  lang: 'zh' | 'en';
  exp: number; // 毫秒时间戳
}

const enc = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(data: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

export async function signApply(payload: ApplyPayload, secret: string): Promise<string> {
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = b64urlEncode(await hmac(body, secret));
  return `${body}.${sig}`;
}

export async function verifyApply(token: string, secret: string): Promise<ApplyPayload | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64urlEncode(await hmac(body, secret));
  // 定长比较，避免时序侧信道
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as ApplyPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
