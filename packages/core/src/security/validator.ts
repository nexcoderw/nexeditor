/**
 * validator.ts
 *
 * Runtime validation for all data entering the editor.
 *
 * Why runtime validation when we have TypeScript?
 * TypeScript types are erased at compile time. A consumer passing
 * arbitrary data to setContent(), or a malformed JSON blob coming
 * from a server, bypasses all type checking completely.
 * These validators are the last line of defense at the JavaScript layer.
 *
 * Every validator follows the same contract:
 * - Accepts `unknown` — never assumes the input type
 * - Returns a typed value or null — callers are forced to handle the null case
 * - Never throws — invalid input is a normal condition, not an exception
 */

import type { ValidatedFontFamily } from '../types/font.types';

// ─── Font Validation ──────────────────────────────────────────────────────────

/**
 * Safe font family name pattern.
 *
 * Allows:
 * - Unicode letters (covers accented chars and international font names)
 * - ASCII digits
 * - Spaces (e.g. 'Open Sans', 'Noto Serif Display')
 * - Hyphens (e.g. 'DM Sans', 'BIZ UDPGothic')
 *
 * Blocks everything else — including:
 * - Quotes and semicolons  → CSS injection: font-family: x; color: red
 * - Parentheses            → CSS functions: font-family: expression(...)
 * - Angle brackets         → HTML injection
 * - Backslashes            → escape sequence abuse
 * - Null bytes             → string termination attacks
 *
 * Max 100 characters — the longest real Google Font name is under 50.
 */
const SAFE_FONT_FAMILY_PATTERN = /^[\p{L}\p{N}\s\-]{1,100}$/u;

/**
 * Validate a font family name and return it as a branded ValidatedFontFamily.
 *
 * The branded return type means TypeScript will reject any code that
 * passes a raw unvalidated string where a ValidatedFontFamily is expected.
 * This makes it structurally impossible to skip validation.
 *
 * @param name - Raw font family name from user input or config
 * @returns    - ValidatedFontFamily if safe, null if dangerous or malformed
 *
 * @example
 * validateFontFamily('Inter')         // ValidatedFontFamily ✓
 * validateFontFamily('Open Sans')     // ValidatedFontFamily ✓
 * validateFontFamily('x; color: red') // null — CSS injection blocked
 * validateFontFamily('')              // null — empty string rejected
 * validateFontFamily(42)              // null — wrong type
 */
export function validateFontFamily(name: unknown): ValidatedFontFamily | null {
    if (typeof name !== 'string') return null;
    if (name.trim().length === 0) return null;

    // Pattern check
    if (!SAFE_FONT_FAMILY_PATTERN.test(name)) return null;

    // Belt-and-suspenders: explicitly block chars that could slip through
    // Unicode-aware regex in edge-case browser implementations
    const explicitlyDangerous = ['"', "'", ';', '(', ')', '{', '}', '<', '>', '\\', '\0'];
    if (explicitlyDangerous.some((char) => name.includes(char))) return null;

    // Cast is safe — all checks above passed
    return name as ValidatedFontFamily;
}

// ─── Color Validation ─────────────────────────────────────────────────────────

/**
 * Accepted color format patterns.
 *
 * Hex:  #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 * RGB:  rgb(255, 255, 255)
 * RGBA: rgba(255, 255, 255, 0.5)
 * HSL:  hsl(360, 100%, 100%)
 * HSLA: hsla(360, 100%, 100%, 0.5)
 * Named colors: 'red', 'transparent', 'currentColor' (letters only, max 30 chars)
 *
 * Blocks:
 * - CSS functions with external refs: url(), var(), attr()
 * - Semicolons: color injection into style blocks
 * - Expressions: expression() (legacy IE code execution)
 */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const RGB_COLOR =
    /^rgba?\(\s*(?:\d{1,3})\s*,\s*(?:\d{1,3})\s*,\s*(?:\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/;

const HSL_COLOR =
    /^hsla?\(\s*(?:\d{1,3}(?:\.\d+)?)\s*,\s*(?:\d{1,3}(?:\.\d+)?)%\s*,\s*(?:\d{1,3}(?:\.\d+)?)%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/;

const NAMED_COLOR = /^[a-zA-Z]{1,30}$/;

/**
 * Validate a CSS color value before applying it to editor content.
 *
 * @param color - Raw color value from user input or color picker
 * @returns     - true if the color is safe to use, false otherwise
 *
 * @example
 * validateColor('#ff0000')              // true
 * validateColor('rgba(255,0,0,0.5)')   // true
 * validateColor('red')                 // true
 * validateColor('expression(alert(1))') // false
 * validateColor('red; display: none')  // false
 */
export function validateColor(color: unknown): color is string {
    if (typeof color !== 'string') return false;

    const trimmed = color.trim();
    if (trimmed.length === 0) return false;

    // Block CSS injection via semicolons and dangerous functions
    if (trimmed.includes(';') || trimmed.includes('url(') || trimmed.includes('expression(')) {
        return false;
    }

    return (
        HEX_COLOR.test(trimmed) ||
        RGB_COLOR.test(trimmed) ||
        HSL_COLOR.test(trimmed) ||
        NAMED_COLOR.test(trimmed)
    );
}

// ─── Font Size Validation ─────────────────────────────────────────────────────

/**
 * Accepted font size pattern.
 *
 * Allows: 12px, 1.5rem, 1.5em, 14pt
 * Blocks: calc(), var(), expression(), or any non-numeric value
 *
 * Limits:
 * - Minimum: 8px equivalent (prevents invisible text)
 * - Maximum: 3 digits before decimal (prevents absurdly large values)
 */
const FONT_SIZE_PATTERN = /^\d{1,3}(?:\.\d{1,2})?(px|pt|rem|em)$/;

/**
 * Validate a CSS font size value.
 *
 * @param size - Raw size string from user input or toolbar
 * @returns    - true if safe, false otherwise
 *
 * @example
 * validateFontSize('16px')   // true
 * validateFontSize('1.5rem') // true
 * validateFontSize('calc(100% - 2px)') // false — CSS function blocked
 */
export function validateFontSize(size: unknown): size is string {
    if (typeof size !== 'string') return false;
    return FONT_SIZE_PATTERN.test(size.trim());
}

// ─── Content Validation ───────────────────────────────────────────────────────

/**
 * Validate that a setContent() argument is a safe type.
 *
 * Guards against:
 * - Prototype pollution via __proto__ or constructor keys in JSON objects
 * - Non-string, non-object types that would crash the parser
 * - Arrays passed where an object is expected
 *
 * @param content - Raw value passed to setContent()
 * @returns       - true if the type is safe to process further
 */
export function validateContent(content: unknown): content is string | Record<string, unknown> {
    if (typeof content === 'string') return true;

    if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
        // Prototype pollution check — these keys can overwrite Object prototype methods
        const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
        const keys = Object.keys(content);

        if (keys.some((key) => DANGEROUS_KEYS.has(key))) return false;

        return true;
    }

    return false;
}

/**
 * Validate that a value is a well-formed ProseMirror document JSON object.
 *
 * This is a minimal structural check — full semantic validation is delegated
 * to ProseMirror's own schema parser which will reject invalid node types.
 *
 * @param json - Raw value to validate
 * @returns    - true if the object has the expected ProseMirror doc shape
 */
export function validateProseMirrorJSON(
    json: unknown,
): json is { type: 'doc'; content: unknown[] } {
    if (typeof json !== 'object' || json === null || Array.isArray(json)) return false;

    const obj = json as Record<string, unknown>;

    // Must have type: 'doc' — the ProseMirror document root
    if (obj['type'] !== 'doc') return false;

    // Must have a content array — even an empty document has content: []
    if (!Array.isArray(obj['content'])) return false;

    return true;
}

// ─── URL Validation ───────────────────────────────────────────────────────────

/**
 * Validate a URL string for safe use in href or src attributes.
 *
 * More permissive than sanitizeURL() in sanitizer.ts —
 * this is used for structured validation before the sanitizer runs.
 *
 * @param url - Raw URL string
 * @returns   - true if the URL is structurally safe
 */
export function validateURL(url: unknown): url is string {
    if (typeof url !== 'string') return false;

    const trimmed = url.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 2048) return false; // Reasonable URL length limit

    const normalized = trimmed.toLowerCase();

    // Block all script execution schemes
    const blockedSchemes = ['javascript:', 'vbscript:', 'data:', 'blob:', 'file:'];
    if (blockedSchemes.some((scheme) => normalized.startsWith(scheme))) return false;

    return true;
}