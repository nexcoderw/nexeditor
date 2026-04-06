import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        // jsdom simulates the browser DOM environment in Node.js
        environment: 'jsdom',

        // Globals: describe, it, expect available in all test files without imports
        globals: true,

        // Runs before every test suite — sets up mocks and global utilities
        setupFiles: ['./tests/unit/setup.ts'],

        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],

            // Hard floor on coverage — CI fails if these drop
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },

            // Only measure source files — not tests, types, or the barrel export
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/index.ts',
                'src/types/**',
                '**/*.d.ts',
            ],
        },
    },

    // Mirror the path aliases in tsconfig so imports resolve correctly in tests
    resolve: {
        alias: {
            '@/core': resolve(__dirname, 'src/core'),
            '@/extensions': resolve(__dirname, 'src/extensions'),
            '@/ui': resolve(__dirname, 'src/ui'),
            '@/hooks': resolve(__dirname, 'src/hooks'),
            '@/security': resolve(__dirname, 'src/security'),
            '@/types': resolve(__dirname, 'src/types'),
            '@/utils': resolve(__dirname, 'src/utils'),
        },
    },
});