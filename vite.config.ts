import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
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
    // Disable sourcemaps in production for security
    sourcemap: false,
    // Use esbuild for minification (faster, built-in)
    minify: 'esbuild',
    // esbuild minification options
    target: 'es2020',
  },
  esbuild: {
    // Remove console and debugger in production
    drop: ['console', 'debugger'],
    // Remove legal comments
    legalComments: 'none',
  },
})