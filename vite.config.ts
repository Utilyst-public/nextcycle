import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
// @ts-expect-error Build-only JavaScript module; no browser dependency.
import { writeStaticPages } from './scripts/static-pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const parsedPort = Number(process.env.PORT);
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5173;
const base = process.env.VITE_BASE_PATH || '/';
const outDir = path.resolve(root, 'dist/public');

// Unique static heads let link-preview crawlers see each water without running JS.
function spaFallback(): Plugin {
  return {
    name: 'nextcycle-404-fallback',
    apply: 'build',
    async closeBundle() {
      await writeStaticPages(outDir);
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), spaFallback()],
  worker: { format: 'es' },
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  root,
  build: {
    outDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: 1400,
  },
  server: { port, host: '0.0.0.0', allowedHosts: true },
  preview: { port, host: '0.0.0.0', allowedHosts: true },
});
