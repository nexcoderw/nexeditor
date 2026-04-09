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
        alias: {
            // Point @nexcode/editor to the local source during development.
            // This means changes to the editor source are immediately reflected
            // in the playground without a build step.
            '@nexcode/editor': resolve(__dirname, '../../packages/core/src/index.ts'),
        },
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