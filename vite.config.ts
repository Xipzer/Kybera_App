/**
 * Code by Xipzer
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
})