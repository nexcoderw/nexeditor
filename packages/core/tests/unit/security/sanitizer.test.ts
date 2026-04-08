/**
 * sanitizer.test.ts
 *
 * Unit tests for the HTML sanitizer.
 *
 * These tests are the regression suite for our XSS defense.
 * Every attack vector we block must have a test here.
 * If someone reports a bypass, we add a test before fixing it.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHTML, sanitizeURL, isURLSafe } from '../../../src/security/sanitizer';

// ─── sanitizeHTML ─────────────────────────────────────────────────────────────

describe('sanitizeHTML', () => {

    // ── Safe content ────────────────────────────────────────────────────────────

    it('passes through safe paragraph content unchanged', () => {
        const input = '<p>Hello <strong>world</strong></p>';
        expect(sanitizeHTML(input)).toContain('<strong>world</strong>');
    });

    it('preserves all allowed block elements', () => {
        const input = '<h1>Title</h1><p>Para</p><blockquote>Quote</blockquote>';
        const result = sanitizeHTML(input);
        expect(result).toContain('<h1>');
        expect(result).toContain('<p>');
        expect(result).toContain('<blockquote>');
    });

    it('preserves safe table structure', () => {
        const input = '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Row</td></tr></tbody></table>';
        const result = sanitizeHTML(input);
        expect(result).toContain('<table>');
        expect(result).toContain('<th>');
        expect(result).toContain('<td>');
    });

    it('preserves safe inline marks', () => {
        const input = '<p><em>italic</em> <u>underline</u> <s>strike</s></p>';
        const result = sanitizeHTML(input);
        expect(result).toContain('<em>');
        expect(result).toContain('<u>');
        expect(result).toContain('<s>');
    });

    it('preserves safe link with https href', () => {
        const input = '<a href="https://example.com">Link</a>';
        const result = sanitizeHTML(input);
        expect(result).toContain('href="https://example.com"');
    });

    it('preserves image with https src', () => {
        const input = '<img src="https://example.com/img.png" alt="Test">';
        const result = sanitizeHTML(input);
        expect(result).toContain('src="https://example.com/img.png"');
    });

    // ── XSS attack vectors ───────────────────────────────────────────────────

    it('strips <script> tags entirely', () => {
        const input = '<p>Hello</p><script>alert("xss")</script>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
    });

    it('strips onclick event handlers', () => {
        const input = '<p onclick="alert(1)">Click me</p>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('onclick');
        expect(result).toContain('<p>');
    });

    it('strips onerror event handlers on images', () => {
        const input = '<img src="x" onerror="alert(1)">';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('onerror');
    });

    it('strips onload event handlers', () => {
        const input = '<body onload="alert(1)"><p>Test</p>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('onload');
    });

    it('blocks javascript: href', () => {
        const input = '<a href="javascript:alert(1)">XSS</a>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('javascript:');
    });

    it('blocks javascript: href with URL encoding', () => {
        const input = '<a href="&#106;avascript:alert(1)">XSS</a>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('javascript:');
    });

    it('blocks vbscript: href', () => {
        const input = '<a href="vbscript:msgbox(1)">XSS</a>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('vbscript:');
    });

    it('blocks data: URIs in img src', () => {
        const input = '<img src="data:image/png;base64,abc123">';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('data:');
    });

    it('strips <iframe> elements', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<iframe>');
        expect(result).not.toContain('iframe');
    });

    it('strips <object> elements', () => {
        const input = '<object data="evil.swf"></object>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<object>');
    });

    it('strips SVG elements', () => {
        const input = '<svg onload="alert(1)"><rect/></svg>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<svg>');
        expect(result).not.toContain('onload');
    });

    // ── CSS injection via style attribute ────────────────────────────────────

    it('strips dangerous CSS functions from inline styles', () => {
        const input = '<p style="background-image: url(javascript:alert(1))">Test</p>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('url(');
        expect(result).not.toContain('javascript');
    });

    it('strips CSS expression() from inline styles', () => {
        const input = '<p style="color: expression(alert(1))">Test</p>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('expression');
    });

    it('preserves safe inline style properties', () => {
        const input = '<p style="color: red; font-size: 16px;">Test</p>';
        const result = sanitizeHTML(input);
        expect(result).toContain('color: red');
        expect(result).toContain('font-size: 16px');
    });

    it('strips unsafe CSS property position from inline styles', () => {
        const input = '<p style="position: fixed; top: 0; left: 0;">Test</p>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('position');
        expect(result).not.toContain('fixed');
    });

    // ── Tab-napping prevention ───────────────────────────────────────────────

    it('adds rel="noopener noreferrer" to target="_blank" links', () => {
        const input = '<a href="https://example.com" target="_blank">Link</a>';
        const result = sanitizeHTML(input);
        expect(result).toContain('noopener');
        expect(result).toContain('noreferrer');
    });

    // ── Edge cases ───────────────────────────────────────────────────────────

    it('returns empty string for empty input', () => {
        expect(sanitizeHTML('')).toBe('');
    });

    it('handles non-string input gracefully', () => {
        // @ts-expect-error — testing runtime safety
        expect(sanitizeHTML(null)).toBe('');
        // @ts-expect-error
        expect(sanitizeHTML(undefined)).toBe('');
    });

    it('handles deeply nested malicious content', () => {
        const input = '<div><p><span><a href="javascript:alert(1)">XSS</a></span></p></div>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('javascript:');
    });
});

// ─── sanitizeURL ──────────────────────────────────────────────────────────────

describe('sanitizeURL', () => {

    it('allows https:// URLs', () => {
        expect(sanitizeURL('https://example.com')).toBe('https://example.com');
    });

    it('allows http:// URLs', () => {
        expect(sanitizeURL('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('allows mailto: URLs', () => {
        expect(sanitizeURL('mailto:hello@example.com')).toBe('mailto:hello@example.com');
    });

    it('allows relative paths', () => {
        expect(sanitizeURL('/about')).toBe('/about');
        expect(sanitizeURL('./page')).toBe('./page');
    });

    it('allows fragment anchors', () => {
        expect(sanitizeURL('#section-1')).toBe('#section-1');
    });

    it('blocks javascript: URIs', () => {
        expect(sanitizeURL('javascript:alert(1)')).toBeNull();
    });

    it('blocks javascript: with mixed case', () => {
        expect(sanitizeURL('JaVaScRiPt:alert(1)')).toBeNull();
    });

    it('blocks vbscript:', () => {
        expect(sanitizeURL('vbscript:msgbox(1)')).toBeNull();
    });

    it('blocks data: URIs', () => {
        expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('blocks blob: URIs', () => {
        expect(sanitizeURL('blob:https://evil.com/abc')).toBeNull();
    });

    it('trims whitespace from safe URLs', () => {
        expect(sanitizeURL('  https://example.com  ')).toBe('https://example.com');
    });

    it('returns null for empty string', () => {
        expect(sanitizeURL('')).toBeNull();
    });

    it('returns null for non-string input', () => {
        // @ts-expect-error — testing runtime safety
        expect(sanitizeURL(null)).toBeNull();
    });
});

// ─── isURLSafe ────────────────────────────────────────────────────────────────

describe('isURLSafe', () => {

    it('returns true for safe https URL', () => {
        expect(isURLSafe('https://example.com')).toBe(true);
    });

    it('returns false for javascript: URI', () => {
        expect(isURLSafe('javascript:alert(1)')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isURLSafe('')).toBe(false);
    });
});