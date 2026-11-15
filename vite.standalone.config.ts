import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Standalone single-file build (GitHub Pages / one-click): every asset —
// JS, CSS, and the portrait JPGs — inlined into one index.html.
export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: 'dist-standalone',
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      chunkSizeWarningLimit: 8192,
      rollupOptions: {
        output: {inlineDynamicImports: true},
      },
    },
  };
});
