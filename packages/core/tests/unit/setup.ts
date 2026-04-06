/**
 * setup.ts
 *
 * Runs before every unit test suite.
 * Sets up global mocks for browser APIs that jsdom does not implement.
 */

import { vi, beforeEach, afterEach } from 'vitest';

// ─── Mock: document.fonts (FontFace API) ─────────────────────────────────────
// jsdom does not implement the FontFace API.
// We provide a minimal mock so font-related tests work correctly.

const mockFontFaceSet = {
    add: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(() => false),
    clear: vi.fn(),
    load: vi.fn(() => Promise.resolve([])),
};

Object.defineProperty(document, 'fonts', {
    value: mockFontFaceSet,
    writable: true,
});

// ─── Mock: window.FontFace ────────────────────────────────────────────────────
// The FontFace constructor is not available in jsdom.

class MockFontFace {
    family: string;
    source: string;
    status: string = 'unloaded';

    constructor(family: string, source: string) {
        this.family = family;
        this.source = source;
    }

    // Simulate successful font load
    load(): Promise<MockFontFace> {
        this.status = 'loaded';
        return Promise.resolve(this);
    }
}

Object.defineProperty(window, 'FontFace', {
    value: MockFontFace,
    writable: true,
});

// ─── Cleanup after each test ──────────────────────────────────────────────────

beforeEach(() => {
    // Clear all mock call history before each test
    vi.clearAllMocks();
});

afterEach(() => {
    // Restore any mocked implementations
    vi.restoreAllMocks();
});