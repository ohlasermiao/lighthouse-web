import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://lighthouse.sync-value.com',
  // 静态站保持静态；仅 /my、/auth/* 以 prerender=false 走 SSR（会员中枢 M6）
  output: 'static',
  adapter: cloudflare(),
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
