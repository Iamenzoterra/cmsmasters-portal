import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'static',
  site: 'https://portal.cmsmasters.net',
  vite: {
    resolve: {
      alias: {
        '@cmsmasters/db': '../../packages/db/src/index.ts',
      },
    },
  },
})
