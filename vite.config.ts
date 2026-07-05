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
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
      },
      // --- LLM provider + OAuth endpoints ---
      // These reject cross-origin browser requests (CORS preflight 400 / no
      // allow-origin on the POST) from the deployed app.kybera.xyz origin, so
      // they're routed same-origin. Vite proxies in dev; the host (Render)
      // must apply matching rewrites in prod — see README "Deployment".
      '/api/anthropic-token': {
        target: 'https://platform.claude.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/anthropic-token/, '/v1/oauth/token'),
      },
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/anthropic/, ''),
      },
      '/api/openai-token': {
        target: 'https://auth.openai.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openai-token/, '/oauth/token'),
      },
      '/api/openai-codex': {
        target: 'https://chatgpt.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openai-codex/, '/backend-api/codex'),
      },
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openai/, ''),
      },
      '/api/xai': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/xai/, ''),
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