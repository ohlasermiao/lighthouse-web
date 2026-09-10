// 运行期读 Worker 的变量 / secret。
// @astrojs/cloudflare 14（Astro 6+）已移除 Astro.locals.runtime，访问 locals.runtime.env 会直接抛错 → 500。
// 只读运行期、不回退 import.meta.env：回退会让构建机上的私有变量被原样内联进 server bundle。
import { env } from 'cloudflare:workers';

export function serverEnv(key: string): string | undefined {
  const v = (env as unknown as Record<string, unknown>)[key];
  return typeof v === 'string' && v ? v : undefined;
}
