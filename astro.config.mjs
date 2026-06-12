import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lighthouse.sync-value.com',
  output: 'static',
  build: { format: 'directory' },
});
