/**
 * vite.config.ts
 *
 * Vite config for the playground app.
 *
 * Key config:
 * - React plugin for JSX transform
 * - Resolves @nexcode/editor from the local packages/core/src
 *   so we develop against the live source, not a published build
 * - Port 5173 — matches playwright.config.ts baseURL
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react({
            // Use the automatic JSX runtime — no need for import React
            jsxRuntime: 'automatic',
        }),
    ],

    resolve: {
        alias: [
            // Match the package entry exactly so CSS subpath imports keep working.
            {
                find: /^@nexcode\/editor$/,
                replacement: resolve(__dirname, '../../packages/core/src/index.ts'),
            },
            {
                find: /^@nexcode\/editor\/styles$/,
                replacement: resolve(__dirname, '../../packages/core/styles/index.css'),
            },
            {
                find: /^@nexcode\/editor\/styles\/theme-light$/,
                replacement: resolve(__dirname, '../../packages/core/styles/theme-light.css'),
            },
            {
                find: /^@nexcode\/editor\/styles\/theme-dark$/,
                replacement: resolve(__dirname, '../../packages/core/styles/theme-dark.css'),
            },
        ],
    },

    server: {
        // Port must match the baseURL in playwright.config.ts
        port: 5173,

        // Open the browser automatically when running `npm run dev`
        open: true,
    },

    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
