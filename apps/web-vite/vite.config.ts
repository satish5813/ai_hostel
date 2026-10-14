import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * React Scan (development only): outlines the parts of a screen that re-render, with a toolbar to switch it off.
 * Added to the page only by the dev server, before React loads; production builds never contain it.
 * Turn it off for a session with REACT_SCAN=0 pnpm dev.
 */
const reactScan = (): Plugin => ({
  name: 'klu-react-scan',
  apply: 'serve',
  transformIndexHtml: () => (process.env.REACT_SCAN === '0' ? [] : [{ tag: 'script', attrs: { src: '/node_modules/react-scan/dist/auto.global.js', crossorigin: 'anonymous' }, injectTo: 'head-prepend' }]),
});

// KL Residencies — web front end (React 19 + Vite + Tailwind v4 + KLH design system)
export default defineConfig({
  plugins: [reactScan(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_API_URL ?? 'http://localhost:4000', changeOrigin: true } } },
  build: { outDir: 'dist', sourcemap: false },
});
