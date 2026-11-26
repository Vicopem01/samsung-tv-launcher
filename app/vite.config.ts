import { copyFileSync } from 'fs'
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const TV_OUT_DIR = 'dist-tv'

/**
 * TV build: a single classic (non-module) script, because module scripts loaded from the
 * app's local files can be blocked on TVs, plus the Tizen manifest and icon.
 */
function tizenPackage(): Plugin {
  return {
    name: 'tizen-package',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/ crossorigin/g, ''),
    },
    closeBundle() {
      for (const file of ['config.xml', 'icon.png']) {
        copyFileSync(path.resolve(__dirname, 'tizen', file), path.resolve(__dirname, TV_OUT_DIR, file))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const tv = mode === 'tv'
  return {
    base: './',
    plugins: tv ? [react(), tizenPackage()] : [inspectAttr(), react()],
    server: {
      host: '0.0.0.0',
      port: 7100,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: tv
      ? {
        outDir: TV_OUT_DIR,
        modulePreload: false,
        cssCodeSplit: false,
        rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
      }
      : undefined,
  }
});
