import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'gh-pages-static-entry-bridge',
        transformIndexHtml: {
          order: 'pre',
          handler(html: string) {
            return html
              .replace(
                /<!-- STATIC_GH_PAGES_START -->[\s\S]*?<!-- STATIC_GH_PAGES_END -->/,
                ''
              )
              .replace(
                /<!-- VITE_ENTRY_START -->[\s\S]*?<!-- VITE_ENTRY_END -->/,
                '<script type="module" src="/src/main.tsx"></script>'
              );
          },
        },
      },
      react(),
      tailwindcss(),
      // Copies src/assets into dist/, generates dist/404.html, and syncs
      // compiled JS/CSS/images into /app so even direct root static hosting
      // (e.g. GitHub Pages Deploy from branch main/root) serves compiled JS.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const distIndex = path.resolve(distDir, 'index.html');
          const dist404 = path.resolve(distDir, '404.html');
          if (fs.existsSync(distIndex)) {
            fs.copyFileSync(distIndex, dist404);
          }

          // Mirror compiled bundle to /app and Saint images to /assets/aistudio
          // so root static hosting on GitHub Pages works immediately with zero .tsx requests.
          const distBundleAssets = path.resolve(distDir, 'assets');
          const staticAppDir = path.resolve(__dirname, 'app');
          if (fs.existsSync(distBundleAssets)) {
            fs.rmSync(staticAppDir, {recursive: true, force: true});
            fs.mkdirSync(staticAppDir, {recursive: true});
            for (const entry of fs.readdirSync(distBundleAssets, {withFileTypes: true})) {
              if (!entry.isFile()) continue;
              const srcFile = path.join(distBundleAssets, entry.name);
              if (/^index-.*\.js$/.test(entry.name)) {
                fs.copyFileSync(srcFile, path.join(staticAppDir, 'index.js'));
              } else if (/^index-.*\.css$/.test(entry.name)) {
                fs.copyFileSync(srcFile, path.join(staticAppDir, 'index.css'));
              } else {
                fs.copyFileSync(srcFile, path.join(staticAppDir, entry.name));
              }
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
