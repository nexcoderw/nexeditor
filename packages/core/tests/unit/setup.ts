/**
 * setup.ts
 *
 * Global test setup — runs before every unit test suite.
 *
 * Responsibilities:
 * - Mock browser APIs that jsdom does not implement
 * - Set up global test utilities
 * - Clean up after each test to prevent state leakage between suites
 *
 * Why we mock here instead of in each test:
 * These APIs are used across many test files. Centralizing the mocks
 * here means each test file focuses on what it is actually testing,
 * not on browser API polyfilling.
 */

import { vi, beforeEach, afterEach, beforeAll } from 'vitest';

// ─── Mock: FontFace API ───────────────────────────────────────────────────────

/**
 * jsdom does not implement the FontFace constructor or document.fonts.
 * The font extension uses both — we provide minimal working mocks.
 */

class MockFontFace {
    family: string;
    source: string;
    status: FontFaceLoadStatus = 'unloaded';

    constructor(family: string, source: string) {
        this.family = family;
        this.source = source;
    }

    load(): Promise<MockFontFace> {
        this.status = 'loaded';
        return Promise.resolve(this);
    }
}

// Install mock FontFace globally before any tests run
beforeAll(() => {
    Object.defineProperty(window, 'FontFace', {
        value: MockFontFace,
        writable: true,
        configurable: true,
    });

    Object.defineProperty(document, 'fonts', {
        value: {
            add: vi.fn(),
            delete: vi.fn(),
            has: vi.fn(() => false),
            clear: vi.fn(),
            load: vi.fn(() => Promise.resolve([])),
            check: vi.fn(() => false),
            ready: Promise.resolve(document.fonts as FontFaceSet),
            size: 0,
        },
        writable: true,
        configurable: true,
    });
});

// ─── Mock: window.fetch (Google Fonts API calls) ──────────────────────────────

/**
 * The font loader calls fetch() to download Google Fonts CSS.
 * We mock fetch globally so tests never make real network requests.
 *
 * Individual tests can override this mock to simulate
 * success or failure scenarios.
 */
beforeAll(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () =>
            Promise.resolve(`
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400;
          src: url(https://fonts.gstatic.com/s/inter/v13/UcCO.woff2) format('woff2');
        }
      `),
        json: () => Promise.resolve({}),
        headers: new Headers(),
    } as Response);
});

// ─── Mock: CustomEvent (jsdom compatibility) ──────────────────────────────────

/**
 * jsdom implements CustomEvent but some versions have issues with
 * the composed property. We ensure it is available.
 */
beforeAll(() => {
    if (typeof window.CustomEvent !== 'function') {
        class CustomEventPolyfill<T> extends Event {
            detail: T;
            constructor(type: string, options?: CustomEventInit<T>) {
                super(type, options);
                this.detail = options?.detail as T;
            }
        }
        Object.defineProperty(window, 'CustomEvent', {
            value: CustomEventPolyfill,
            writable: true,
        });
    }
});

// ─── Mock: ResizeObserver ─────────────────────────────────────────────────────

/**
 * Some UI components use ResizeObserver for responsive behaviour.
 * jsdom does not implement it.
 */
beforeAll(() => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
});

// ─── Mock: MutationObserver ───────────────────────────────────────────────────

/**
 * useEditorState uses MutationObserver to subscribe to DOM changes.
 * jsdom implements MutationObserver but we wrap it to track calls in tests.
 */
const OriginalMutationObserver = window.MutationObserver;

beforeAll(() => {
    global.MutationObserver = vi.fn().mockImplementation((callback: MutationCallback) => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(() => []),
        _callback: callback,
    }));
});

// ─── Mock: window.matchMedia ──────────────────────────────────────────────────

/**
 * Used by the theme system to detect prefers-color-scheme.
 * jsdom does not implement matchMedia.
 */
beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

// ─── Mock: window.scrollTo ────────────────────────────────────────────────────

beforeAll(() => {
    window.scrollTo = vi.fn();
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    // Clear all mock call histories before each test
    // This prevents calls from one test affecting assertions in the next
    vi.clearAllMocks();
});

afterEach(() => {
    // Restore any mocked implementations that were overridden in a test
    vi.restoreAllMocks();

    // Clean up any DOM mutations the test may have made
    document.body.innerHTML = '';
});