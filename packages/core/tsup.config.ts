import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
    // Single entry point — all public exports flow through here
    entry: {
        index: 'src/index.ts',
    },

    // Dual output: ESM for modern bundlers, CJS for older toolchains
    format: ['esm', 'cjs'],

    // Generate TypeScript declaration files
    dts: true,

    // Source maps for consumer debugging
    sourcemap: true,

    // Wipe dist/ before every build
    clean: true,

    // Code splitting for better tree-shaking
    splitting: true,

    // Minify only on production builds
    minify: process.env['NODE_ENV'] === 'production',

    // Peer deps stay external
    external: ['react', 'react-dom'],

    // Do not inject styles — consumers import CSS explicitly
    injectStyle: false,

    // Target ES2020 — matches browser support baseline
    target: 'es2020',

    tsconfig: './tsconfig.json',

    esbuildOptions(options) {
        options.jsx = 'automatic';
    },

    // Copy CSS files to dist/styles after build completes
    async onSuccess() {
        const stylesDir = 'styles';
        const distStylesDir = 'dist/styles';

        // Create the dist/styles directory
        mkdirSync(distStylesDir, { recursive: true });

        // Copy every CSS file from styles/ to dist/styles/
        const cssFiles = readdirSync(stylesDir).filter((f) => f.endsWith('.css'));
        for (const file of cssFiles) {
            copyFileSync(join(stylesDir, file), join(distStylesDir, file));
        }

        console.log(`[tsup] Copied ${cssFiles.length} CSS files to ${distStylesDir}`);
    },
});