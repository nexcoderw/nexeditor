/**
 * csp.ts
 *
 * Content Security Policy helpers for @nexcode/editor consumers.
 *
 * The editor contacts exactly two external domains:
 *   - fonts.googleapis.com  — Google Fonts CSS API (font declarations)
 *   - fonts.gstatic.com     — Google Fonts CDN (actual font files)
 *
 * Consumers running a strict CSP must allowlist these domains.
 * This module exports the exact strings needed so they never have
 * to hardcode them or guess which domain serves which resource.
 *
 * Next.js usage example (next.config.js):
 * ─────────────────────────────────────────
 * import { getEditorCSPDirectives } from '@nexcode/editor';
 *
 * const csp = getEditorCSPDirectives();
 *
 * const headers = [
 *   {
 *     key: 'Content-Security-Policy',
 *     value: [
 *       `default-src 'self'`,
 *       `style-src 'self' ${csp.styleSrc}`,
 *       `font-src 'self' ${csp.fontSrc}`,
 *     ].join('; ')
 *   }
 * ];
 */

// ─── External Domains ─────────────────────────────────────────────────────────

/**
 * The only external domains the editor contacts.
 *
 * These are the authoritative Google Fonts domain names.
 * Do not modify these values — changing them will break font loading
 * and potentially route requests to untrusted servers.
 */
export const EDITOR_EXTERNAL_DOMAINS = {
    /**
     * Google Fonts CSS API — serves the @font-face declarations.
     * Requested via <link> or the FontFace API.
     */
    googleFontsAPI: 'https://fonts.googleapis.com',

    /**
     * Google Fonts static CDN — serves the actual font binary files (woff2).
     * The browser fetches these automatically after parsing the @font-face rules.
     */
    googleFontsCDN: 'https://fonts.gstatic.com',
} as const;

// ─── CSP Directive Values ─────────────────────────────────────────────────────

/**
 * The CSP directive values the editor requires.
 * These are the VALUES of each directive, not full directive strings.
 * Consumers append them to their own existing directives.
 */
export interface EditorCSPDirectives {
    /**
     * Append to your `style-src` directive.
     * Required so the browser can fetch the Google Fonts CSS declarations.
     *
     * @example `style-src 'self' ${directives.styleSrc}`
     */
    styleSrc: string;

    /**
     * Append to your `font-src` directive.
     * Required so the browser can download the font binary files.
     *
     * @example `font-src 'self' ${directives.fontSrc}`
     */
    fontSrc: string;

    /**
     * Append to your `connect-src` directive.
     * Required if you use fetch() to query the Google Fonts API directly
     * (the editor does this internally to validate font availability).
     *
     * @example `connect-src 'self' ${directives.connectSrc}`
     */
    connectSrc: string;
}

/**
 * Get the CSP directive values required by @nexcode/editor.
 *
 * Returns only the values — not the directive names — so consumers
 * can merge them into their existing CSP without conflicts.
 *
 * @returns EditorCSPDirectives - The values to add to your CSP header
 *
 * @example
 * const csp = getEditorCSPDirectives();
 * // csp.styleSrc  → 'https://fonts.googleapis.com'
 * // csp.fontSrc   → 'https://fonts.gstatic.com'
 * // csp.connectSrc → 'https://fonts.googleapis.com'
 */
export function getEditorCSPDirectives(): EditorCSPDirectives {
    return {
        styleSrc: EDITOR_EXTERNAL_DOMAINS.googleFontsAPI,
        fontSrc: EDITOR_EXTERNAL_DOMAINS.googleFontsCDN,
        connectSrc: EDITOR_EXTERNAL_DOMAINS.googleFontsAPI,
    };
}

// ─── Full CSP Builder ─────────────────────────────────────────────────────────

export interface BuildCSPOptions {
    /**
     * Nonce value for inline scripts.
     * Recommended for Next.js apps using the App Router.
     * Generate a new nonce per request — never reuse nonces.
     *
     * @example crypto.randomUUID() or a base64-encoded random bytes string
     */
    nonce?: string;

    /**
     * URI to send CSP violation reports to.
     * Helps you catch policy violations in production before attackers do.
     *
     * @example '/api/csp-report' or 'https://your-reporting-endpoint.com'
     */
    reportUri?: string;

    /**
     * When true, builds a report-only CSP header value (CSP2 report-only mode).
     * Use this to test a new policy before enforcing it.
     * @default false
     */
    reportOnly?: boolean;

    /**
     * Additional domains to allow for script-src beyond 'self'.
     * Only add domains you fully trust.
     */
    additionalScriptSrc?: string[];

    /**
     * Additional domains to allow for img-src beyond 'self' and https:.
     */
    additionalImgSrc?: string[];
}

/**
 * Build a complete Content Security Policy header value for Next.js apps
 * using @nexcode/editor with Google Fonts.
 *
 * This generates a strict, production-ready CSP. Review each directive
 * before deploying — your app may need additional domains.
 *
 * @param options - Optional customisation for nonce, reporting, extra domains
 * @returns       - The full CSP header value string (not the header name)
 *
 * @example Basic usage
 * const csp = buildEditorCSP();
 * // Use as the value of the Content-Security-Policy header
 *
 * @example With nonce (recommended for Next.js App Router)
 * const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
 * const csp = buildEditorCSP({ nonce, reportUri: '/api/csp-report' });
 */
export function buildEditorCSP(options: BuildCSPOptions = {}): string {
    const {
        nonce,
        reportUri,
        additionalScriptSrc = [],
        additionalImgSrc = [],
    } = options;

    // Build the nonce token if provided
    const nonceToken = nonce ? `'nonce-${nonce}'` : '';

    const directives: string[] = [
        // Default: block everything not explicitly permitted
        `default-src 'self'`,

        // Scripts: self + nonce only. 'strict-dynamic' trusts scripts loaded
        // by trusted scripts — needed for some Next.js chunks
        [
            `script-src`,
            `'self'`,
            nonceToken,
            `'strict-dynamic'`,
            ...additionalScriptSrc,
        ]
            .filter(Boolean)
            .join(' '),

        // Styles: self + Google Fonts CSS API
        [
            `style-src`,
            `'self'`,
            nonceToken,
            EDITOR_EXTERNAL_DOMAINS.googleFontsAPI,
        ]
            .filter(Boolean)
            .join(' '),

        // Fonts: self + Google Fonts CDN (where woff2 files live)
        `font-src 'self' ${EDITOR_EXTERNAL_DOMAINS.googleFontsCDN}`,

        // Images: self + any https source (editor users paste images from the web)
        // data: is intentionally excluded — it is a common XSS vector
        [
            `img-src`,
            `'self'`,
            `https:`,
            ...additionalImgSrc,
        ].join(' '),

        // Connections: self + Google Fonts API for font validation requests
        `connect-src 'self' ${EDITOR_EXTERNAL_DOMAINS.googleFontsAPI}`,

        // Block all plugin content — Flash is dead, but the directive remains important
        `object-src 'none'`,

        // Restrict base tag — prevents base-tag hijacking attacks
        `base-uri 'self'`,

        // Restrict form submissions — editors should not submit forms to third parties
        `form-action 'self'`,

        // Prevent this page from being embedded in iframes on other domains
        // This is clickjacking protection
        `frame-ancestors 'none'`,

        // Upgrade all HTTP requests to HTTPS
        `upgrade-insecure-requests`,

        // Reporting
        reportUri ? `report-uri ${reportUri}` : '',
    ]
        .filter(Boolean) // Remove empty strings from optional directives
        .join('; ');

    return directives;
}

// ─── Next.js Headers Helper ───────────────────────────────────────────────────

/**
 * Returns a Next.js `headers()` config entry for the CSP header.
 * Drop this directly into the headers() array in next.config.js.
 *
 * @param options - Same options as buildEditorCSP()
 * @returns       - { key, value } tuple for Next.js headers config
 *
 * @example
 * // next.config.js
 * import { buildNextJSCSPHeader } from '@nexcode/editor';
 *
 * export default {
 *   async headers() {
 *     return [
 *       {
 *         source: '/(.*)',
 *         headers: [buildNextJSCSPHeader()],
 *       },
 *     ];
 *   },
 * };
 */
export function buildNextJSCSPHeader(options: BuildCSPOptions = {}): {
    key: string;
    value: string;
} {
    const headerName = options.reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';

    return {
        key: headerName,
        value: buildEditorCSP(options),
    };
}