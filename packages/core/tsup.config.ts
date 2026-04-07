import { defineConfig } from 'tsup';

export default defineConfig({
    // Single entry point — all public exports flow through here
    entry: {
        index: 'src/index.ts',
    },

    // Dual output: ESM for modern bundlers (Next.js, Vite), CJS for older toolchains
    format: ['esm', 'cjs'],

    // Generate TypeScript declaration files so consumers get full intellisense
    dts: true,

    // Source maps — consumers can debug into the editor source
    sourcemap: true,

    // Wipe dist/ before every build — prevents stale files from sneaking in
    clean: true,

    // Code splitting — enables better tree-shaking in ESM output
    splitting: true,

    // Minify only on production builds
    minify: process.env['NODE_ENV'] === 'production',

    // Peer deps stay external — consumers bring their own React
    external: ['react', 'react-dom'],

    // Do not inject styles automatically — consumers import CSS explicitly
    injectStyle: false,

    // Match our browser support baseline: Chrome 90+, Firefox 90+, Safari 15+
    target: 'es2020',

    tsconfig: './tsconfig.json',

    esbuildOptions(options) {
        // React 18 automatic JSX runtime — no need for import React in every file
        options.jsx = 'automatic';
    },
});