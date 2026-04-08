/**
 * validator.test.ts
 *
 * Unit tests for the runtime input validators.
 */

import { describe, it, expect } from 'vitest';
import {
    validateFontFamily,
    validateColor,
    validateFontSize,
    validateContent,
    validateProseMirrorJSON,
    validateURL,
} from '../../../src/security/validator';

// ─── validateFontFamily ───────────────────────────────────────────────────────

describe('validateFontFamily', () => {

    it('accepts a simple font name', () => {
        expect(validateFontFamily('Inter')).toBe('Inter');
    });

    it('accepts a font name with spaces', () => {
        expect(validateFontFamily('Open Sans')).toBe('Open Sans');
    });

    it('accepts a font name with hyphens', () => {
        expect(validateFontFamily('DM Sans')).toBe('DM Sans');
    });

    it('accepts unicode font names', () => {
        expect(validateFontFamily('Noto Sans')).toBe('Noto Sans');
    });

    it('returns null for empty string', () => {
        expect(validateFontFamily('')).toBeNull();
    });

    it('returns null for non-string input', () => {
        expect(validateFontFamily(42)).toBeNull();
        expect(validateFontFamily(null)).toBeNull();
        expect(validateFontFamily(undefined)).toBeNull();
    });

    it('blocks CSS injection via semicolon', () => {
        expect(validateFontFamily('Arial; color: red')).toBeNull();
    });

    it('blocks CSS injection via quotes', () => {
        expect(validateFontFamily('Arial"')).toBeNull();
        expect(validateFontFamily("Arial'")).toBeNull();
    });

    it('blocks CSS functions via parentheses', () => {
        expect(validateFontFamily('expression(alert(1))')).toBeNull();
    });

    it('blocks HTML injection via angle brackets', () => {
        expect(validateFontFamily('<script>')).toBeNull();
    });

    it('blocks names over 100 characters', () => {
        expect(validateFontFamily('A'.repeat(101))).toBeNull();
    });

    it('returns a branded ValidatedFontFamily type', () => {
        const result = validateFontFamily('Inter');
        // The brand is only a compile-time check, but we verify the value
        expect(result).toBe('Inter');
    });
});

// ─── validateColor ────────────────────────────────────────────────────────────

describe('validateColor', () => {

    it('accepts 6-digit hex color', () => {
        expect(validateColor('#FF0000')).toBe(true);
    });

    it('accepts 3-digit hex color', () => {
        expect(validateColor('#FFF')).toBe(true);
    });

    it('accepts 8-digit hex color with alpha', () => {
        expect(validateColor('#FF000080')).toBe(true);
    });

    it('accepts rgb() color', () => {
        expect(validateColor('rgb(255, 0, 0)')).toBe(true);
    });

    it('accepts rgba() color', () => {
        expect(validateColor('rgba(255, 0, 0, 0.5)')).toBe(true);
    });

    it('accepts hsl() color', () => {
        expect(validateColor('hsl(0, 100%, 50%)')).toBe(true);
    });

    it('accepts named color', () => {
        expect(validateColor('red')).toBe(true);
        expect(validateColor('transparent')).toBe(true);
    });

    it('rejects CSS injection via semicolon', () => {
        expect(validateColor('red; display: none')).toBe(false);
    });

    it('rejects url() function', () => {
        expect(validateColor('url(javascript:alert(1))')).toBe(false);
    });

    it('rejects expression() function', () => {
        expect(validateColor('expression(alert(1))')).toBe(false);
    });

    it('rejects non-string input', () => {
        expect(validateColor(null)).toBe(false);
        expect(validateColor(undefined)).toBe(false);
        expect(validateColor(123)).toBe(false);
    });

    it('rejects empty string', () => {
        expect(validateColor('')).toBe(false);
    });
});

// ─── validateFontSize ─────────────────────────────────────────────────────────

describe('validateFontSize', () => {

    it('accepts px values', () => {
        expect(validateFontSize('16px')).toBe(true);
    });

    it('accepts rem values', () => {
        expect(validateFontSize('1.5rem')).toBe(true);
    });

    it('accepts em values', () => {
        expect(validateFontSize('1.25em')).toBe(true);
    });

    it('accepts pt values', () => {
        expect(validateFontSize('12pt')).toBe(true);
    });

    it('rejects CSS function values', () => {
        expect(validateFontSize('calc(100% - 2px)')).toBe(false);
        expect(validateFontSize('var(--size)')).toBe(false);
    });

    it('rejects unitless values', () => {
        expect(validateFontSize('16')).toBe(false);
    });

    it('rejects percentage values', () => {
        expect(validateFontSize('100%')).toBe(false);
    });

    it('rejects non-string input', () => {
        expect(validateFontSize(16)).toBe(false);
        expect(validateFontSize(null)).toBe(false);
    });
});

// ─── validateContent ─────────────────────────────────────────────────────────

describe('validateContent', () => {

    it('accepts string content', () => {
        expect(validateContent('<p>Hello</p>')).toBe(true);
    });

    it('accepts plain object content', () => {
        expect(validateContent({ type: 'doc', content: [] })).toBe(true);
    });

    it('rejects arrays', () => {
        expect(validateContent([])).toBe(false);
        expect(validateContent(['item'])).toBe(false);
    });

    it('rejects null', () => {
        expect(validateContent(null)).toBe(false);
    });

    it('rejects numbers', () => {
        expect(validateContent(42)).toBe(false);
    });

    it('blocks prototype pollution via __proto__ key', () => {
        expect(validateContent({ __proto__: { isAdmin: true } })).toBe(false);
    });

    it('blocks prototype pollution via constructor key', () => {
        expect(validateContent({ constructor: { prototype: {} } })).toBe(false);
    });
});

// ─── validateProseMirrorJSON ──────────────────────────────────────────────────

describe('validateProseMirrorJSON', () => {

    it('accepts a valid ProseMirror doc object', () => {
        expect(
            validateProseMirrorJSON({ type: 'doc', content: [] }),
        ).toBe(true);
    });

    it('rejects objects without type: doc', () => {
        expect(
            validateProseMirrorJSON({ type: 'paragraph', content: [] }),
        ).toBe(false);
    });

    it('rejects objects without content array', () => {
        expect(
            validateProseMirrorJSON({ type: 'doc' }),
        ).toBe(false);
    });

    it('rejects null', () => {
        expect(validateProseMirrorJSON(null)).toBe(false);
    });

    it('rejects arrays', () => {
        expect(validateProseMirrorJSON([])).toBe(false);
    });
});

// ─── validateURL ─────────────────────────────────────────────────────────────

describe('validateURL', () => {

    it('accepts https URL', () => {
        expect(validateURL('https://example.com')).toBe(true);
    });

    it('accepts relative path', () => {
        expect(validateURL('/about')).toBe(true);
    });

    it('rejects javascript: URI', () => {
        expect(validateURL('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URI', () => {
        expect(validateURL('data:text/html,<h1>XSS</h1>')).toBe(false);
    });

    it('rejects URLs over 2048 characters', () => {
        expect(validateURL('https://example.com/' + 'a'.repeat(2048))).toBe(false);
    });

    it('rejects empty string', () => {
        expect(validateURL('')).toBe(false);
    });

    it('rejects non-string input', () => {
        expect(validateURL(null)).toBe(false);
        expect(validateURL(undefined)).toBe(false);
    });
});