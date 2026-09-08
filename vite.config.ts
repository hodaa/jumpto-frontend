import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

/** Inline the (small) emitted CSS into index.html so there is no render-blocking
    stylesheet fetch on the critical path. The bytes still ship — inside the
    gzipped HTML — so LCP/FCP don't wait on a separate request. Only safe for
    small CSS (this app's Tailwind output is ~11 KB gzipped). */
function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const htmlAsset = bundle['index.html'];
      if (!htmlAsset || htmlAsset.type !== 'asset') return;
      let html = String(htmlAsset.source);
      const cssEntries = Object.entries(bundle).filter(
        ([, chunk]) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'),
      );
      for (const [, chunk] of cssEntries) {
        if (chunk.type !== 'asset') continue;
        const href = `/${chunk.fileName}`;
        const link = new RegExp(
          `<link rel="stylesheet"[^>]*href=["']${href}["'][^>]*>`,
        );
        if (!link.test(html)) continue;
        html = html.replace(link, `<style>${chunk.source}</style>`);
        delete bundle[chunk.fileName];
      }
      htmlAsset.source = html;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = (env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

  return {
    plugins: [react(), tailwindcss(), inlineCssPlugin()],
    server: {
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.ts',
      css: false,
      coverage: {
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/main.tsx', 'src/i18n/**', 'src/types.ts', 'src/__tests__/**'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  };
});
