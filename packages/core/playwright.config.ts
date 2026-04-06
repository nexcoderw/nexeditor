import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',

    // Run all E2E tests in parallel for speed
    fullyParallel: true,

    // If a test file has .only — fail the CI immediately. Prevents sloppy commits.
    forbidOnly: !!process.env['CI'],

    // Retry flaky tests on CI. Locally: no retries — fix your tests.
    retries: process.env['CI'] ? 2 : 0,

    // Single worker on CI to avoid resource contention
    workers: process.env['CI'] ? 1 : undefined,

    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
    ],

    use: {
        // The playground app runs here during E2E tests
        baseURL: 'http://localhost:5173',

        // Collect full trace on first retry — makes CI failures debuggable
        trace: 'on-first-retry',

        // Screenshot on test failure — visual proof of what went wrong
        screenshot: 'only-on-failure',
    },

    projects: [
        // The three major browser engines — all must pass
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        // Mobile — touch input must work in the editor
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 7'] },
        },
    ],

    // Auto-start the playground dev server before running E2E tests
    webServer: {
        command: 'npm run dev --workspace=apps/playground',
        url: 'http://localhost:5173',
        // On CI always start fresh. Locally reuse if already running.
        reuseExistingServer: !process.env['CI'],
    },
});