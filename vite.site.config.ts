import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(__dirname, 'site'),
  base: '/',
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, 'site-dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
