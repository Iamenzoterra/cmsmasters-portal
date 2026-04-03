import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  output: 'static',
  site: 'https://portal.cmsmasters.net',
  integrations: [sitemap()],
  vite: {
    resolve: {
      alias: {
        '@cmsmasters/db': '../../packages/db/src/index.ts',
      },
    },
  },
})
