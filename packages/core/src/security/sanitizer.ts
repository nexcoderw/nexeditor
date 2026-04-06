/**
 * sanitizer.ts
 *
 * The security gateway for ALL HTML entering the editor.
 *
 * Rule: No HTML touches the ProseMirror document model without passing
 * through sanitizeHTML() first. No exceptions — not paste, not setContent(),
 * not import, not collaboration patches.
 *
 * Why DOMPurify?
 * - Battle-tested against every known XSS vector
 * - Actively maintained with rapid CVE response
 * - Used in production by Google, Salesforce, and Atlassian
 * - Runs in the browser's own DOM parser — no regex hacks
 *
 * Security layers applied here:
 * 1. Strict tag allowlist — only known-safe HTML elements pass
 * 2. Strict attribute allowlist — no event handlers, no data-* abuse
 * 3. URL validation hook — blocks javascript:, vbscript:, data: URIs
 * 4. Tab-napping prevention — all target="_blank" links get rel="noopener noreferrer"
 * 5. Style sanitization — inline styles reduced to a safe subset of CSS properties
 * 6. SVG and MathML blocked entirely — both have extensive XSS histories
 */

import DOMPurify from 'dompurify';

// ─── Allowlists ───────────────────────────────────────────────────────────────

/**
 * HTML tags considered safe for rich text content.
 *
 * Intentionally conservative — every tag added here is an attack surface.
 * Notable exclusions:
 * - <script>, <style>, <link>    — obvious
 * - <iframe>, <object>, <embed>  — sandbox escape vectors
 * - <form>, <input>, <button>    — not part of document content
 * - <svg>, <math>                — complex parsers with XSS history
 * - <template>                   — mXSS vector in some browsers
 */
const ALLOWED_TAGS: string[] = [
    // Document structure
    'p', 'div', 'span', 'br', 'hr',

    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',

    // Inline text semantics
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'mark', 'sub', 'sup', 'small', 'abbr', 'cite', 'q',
    'code', 'kbd', 'samp', 'var',

    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',

    // Links — href is validated by the afterSanitizeAttributes hook below
    'a',

    // Images — src is validated by the afterSanitizeAttributes hook below
    'img',

    // Tables
    'table', 'thead', 'tbody', 'tfoot',
    'tr', 'th', 'td', 'caption', 'colgroup', 'col',

    // Preformatted and block content
    'pre', 'blockquote',

    // Semantic grouping
    'figure', 'figcaption',
];

/**
 * HTML attributes considered safe.
 *
 * Notable exclusions:
 * - All on* event handlers (onclick, onload, onerror, etc.) — stripped by DOMPurify by default
 * - srcdoc, action, formaction                              — script execution vectors
 * - xlink:href                                              — SVG XSS vector (SVG is blocked anyway)
 */
const ALLOWED_ATTR: string[] = [
    // Links
    'href', 'target', 'rel',

    // Images
    'src', 'alt', 'width', 'height', 'loading', 'decoding',

    // Tables
    'colspan', 'rowspan', 'scope', 'headers',

    // Accessibility — must be preserved for screen reader users
    'aria-label', 'aria-hidden', 'aria-describedby',
    'role', 'title', 'tabindex',

    // Styling — class is safe; inline style is further restricted in the hook below
    'class', 'style',

    // Our own namespaced data attributes — used by ProseMirror node views
    'data-nex-node-type',
    'data-nex-font',
    'data-nex-color',
];

// ─── CSS Property Allowlist ───────────────────────────────────────────────────

/**
 * The only inline CSS properties allowed to survive sanitization.
 *
 * This blocks:
 * - position, top, left, z-index    — layout manipulation / UI spoofing
 * - background-image, content       — potential data exfiltration via CSS url()
 * - animation, transition           — can be used to obscure UI
 * - expression()                    — IE-era CSS execution (DOMPurify blocks this too)
 * - var(), calc(), url()            — could reference external resources or break layout
 */
const ALLOWED_STYLE_PROPS = new Set<string>([
    'color',
    'background-color',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'font-variant',
    'text-decoration',
    'text-decoration-line',
    'text-decoration-color',
    'text-align',
    'line-height',
    'letter-spacing',
    'word-spacing',
    'white-space',
]);

// ─── DOMPurify Config ─────────────────────────────────────────────────────────

const PURIFY_CONFIG: DOMPurify.Config = {
    ALLOWED_TAGS,
    ALLOWED_ATTR,

    // Block SVG and MathML content entirely
    FORBID_CONTENTS: ['svg', 'math'],

    // FORCE_BODY wraps the input in a <body> context before parsing.
    // This prevents mXSS (mutation XSS) attacks where the browser's parser
    // reinterprets the structure of the HTML after sanitization.
    FORCE_BODY: true,

    // Block all data: URIs — images encoded as data: URIs can carry payloads
    ALLOW_DATA_ATTR: false,

    // Return a string — we feed it directly into ProseMirror's HTML parser
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
};

// ─── DOMPurify Hooks ─────────────────────────────────────────────────────────

/**
 * Hook: runs after DOMPurify has sanitized each element's attributes.
 * We use this for validation logic that goes beyond simple allowlisting.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    // ── Anchor tags ──────────────────────────────────────────────────────────
    if (node.tagName === 'A') {
        const href = node.getAttribute('href');

        if (href !== null) {
            const normalized = href.toLowerCase().trim();

            // Allow only safe URL schemes.
            // Everything else — javascript:, vbscript:, blob:, data:, etc. — is removed.
            const isSafe =
                normalized.startsWith('https://') ||
                normalized.startsWith('http://') ||
                normalized.startsWith('mailto:') ||
                normalized.startsWith('tel:') ||
                normalized.startsWith('/') ||   // absolute-path relative URL
                normalized.startsWith('#') ||   // fragment/anchor
                normalized.startsWith('./') ||  // relative path
                normalized.startsWith('../');   // relative path up

            if (!isSafe) {
                // Remove only the href — keep the visible link text in the document
                node.removeAttribute('href');
            }
        }

        // Tab-napping prevention:
        // When a link opens in a new tab, the opened page can access window.opener
        // and redirect the original tab to a phishing page.
        // rel="noopener noreferrer" severs this connection.
        if (node.getAttribute('target') === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
        }
    }

    // ── Image tags ───────────────────────────────────────────────────────────
    if (node.tagName === 'IMG') {
        const src = node.getAttribute('src');

        if (src !== null) {
            const normalized = src.toLowerCase().trim();

            // Only allow images served over HTTPS or relative paths.
            // HTTP is allowed too for localhost development, but not data: URIs.
            const isSafe =
                normalized.startsWith('https://') ||
                normalized.startsWith('http://') ||
                normalized.startsWith('/') ||
                normalized.startsWith('./') ||
                normalized.startsWith('../');

            if (!isSafe) {
                node.removeAttribute('src');
            }
        }
    }

    // ── Inline styles ────────────────────────────────────────────────────────
    // Strip all inline style declarations that are not in our allowlist.
    // This prevents CSS injection attacks and UI spoofing via style manipulation.
    if (node.hasAttribute('style')) {
        const rawStyle = node.getAttribute('style') ?? '';

        const safeDeclarations = rawStyle
            .split(';')
            .map((decl) => decl.trim())
            .filter((decl): decl is string => {
                if (!decl) return false;

                const colonIndex = decl.indexOf(':');
                if (colonIndex === -1) return false;

                // Extract and normalize the property name
                const prop = decl.slice(0, colonIndex).trim().toLowerCase();

                // Block CSS functions like url(), expression(), var() in values —
                // they can reference external resources or execute code in legacy browsers
                const value = decl.slice(colonIndex + 1).toLowerCase();
                const hasDangerousValue =
                    value.includes('url(') ||
                    value.includes('expression(') ||
                    value.includes('var(') ||
                    value.includes('calc(') ||
                    value.includes('attr(') ||
                    value.includes('javascript');

                return ALLOWED_STYLE_PROPS.has(prop) && !hasDangerousValue;
            });

        if (safeDeclarations.length > 0) {
            node.setAttribute('style', safeDeclarations.join('; '));
        } else {
            // No safe declarations survived — remove the attribute entirely
            node.removeAttribute('style');
        }
    }
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sanitize an HTML string before it enters the ProseMirror document model.
 *
 * This is the single entry point for all HTML input to the editor.
 * Call this on paste content, setContent() input, and any imported HTML.
 *
 * @param html - Raw HTML from any source (untrusted)
 * @returns   - Sanitized HTML safe for ProseMirror to parse
 *
 * @example
 * // Malicious input
 * sanitizeHTML('<p onclick="alert(1)">Hello</p><script>steal()</script>');
 * // Returns: '<p>Hello</p>'
 *
 * @example
 * // Safe content passes through unchanged
 * sanitizeHTML('<p>Hello <strong>world</strong></p>');
 * // Returns: '<p>Hello <strong>world</strong></p>'
 */
export function sanitizeHTML(html: string): string {
    if (!html || typeof html !== 'string') return '';

    const result = DOMPurify.sanitize(html, PURIFY_CONFIG);

    // DOMPurify always returns a string with our config — but we guard anyway
    return typeof result === 'string' ? result : '';
}

/**
 * Sanitize a URL before inserting it into an href or src attribute.
 *
 * Returns null if the URL is unsafe — callers must handle the null case
 * and not insert the URL into the document.
 *
 * @param url - Raw URL from user input or paste
 * @returns   - The trimmed URL if safe, null if it must be blocked
 *
 * @example
 * sanitizeURL('javascript:alert(1)') // null
 * sanitizeURL('  https://example.com  ') // 'https://example.com'
 * sanitizeURL('data:text/html,<script>') // null
 */
export function sanitizeURL(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();
    const normalized = trimmed.toLowerCase();

    // Block all known dangerous URI schemes
    const blockedSchemes = [
        'javascript:',
        'vbscript:',
        'data:',
        'blob:',
        'file:',
    ];

    for (const scheme of blockedSchemes) {
        if (normalized.startsWith(scheme)) return null;
    }

    return trimmed;
}

/**
 * Type guard — returns true if the URL is safe to insert into the document.
 * Convenience wrapper around sanitizeURL for conditional logic.
 *
 * @example
 * if (isURLSafe(userInput)) {
 *   insertLink(userInput);
 * }
 */
export function isURLSafe(url: string): boolean {
    return sanitizeURL(url) !== null;
}