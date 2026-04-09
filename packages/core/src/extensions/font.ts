/**
 * font.ts
 *
 * Google Fonts integration — the most security-sensitive extension.
 *
 * Two responsibilities:
 * 1. font_family mark — stores the chosen font on text in the document
 * 2. Font loader     — dynamically loads fonts from Google Fonts via the FontFace API
 *
 * Security architecture:
 * - Font names are validated through validateFontFamily() before ANY use
 * - The ValidatedFontFamily branded type prevents raw strings from
 *   reaching the CSS or FontFace API without validation
 * - Google Fonts URLs are CONSTRUCTED from validated names — never user-supplied
 * - No <link> tags are injected into the document head — we use the FontFace API
 *   which gives precise control and avoids CSP style-src 'unsafe-inline' issues
 * - Font names are sanitized again when written to inline style attributes
 *
 * Font loading flow:
 * 1. User selects a font in FontPicker
 * 2. FontPicker calls loadFont(family)
 * 3. loadFont validates the name → constructs the Google Fonts URL → fetches via FontFace API
 * 4. On success, the font_family mark is applied to the selection
 * 5. ProseMirror renders the mark as font-family: 'FontName' in the inline style
 */

import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';
import { validateFontFamily } from '../security/validator';
import { EDITOR_EXTERNAL_DOMAINS } from '../security/csp';
import type {
    NexFont,
    ValidatedFontFamily,
    FontLoadResult,
    FontWeight,
} from '../types/font.types';

export { GOOGLE_FONTS_CATALOG } from '../data/google-fonts-catalog';

// ─── Default Font List ────────────────────────────────────────────────────────

/**
 * Curated list of Google Fonts shown by default in the FontPicker.
 *
 * Chosen for:
 * - Wide range of categories (sans, serif, mono, display, handwriting)
 * - Professional appearance in documents
 * - Good Latin + extended character coverage
 * - Popularity and reliability
 */
export const DEFAULT_FONTS: NexFont[] = [
    { family: 'Inter', category: 'sans-serif', weights: [400, 500, 600, 700], hasItalic: true },
    { family: 'Roboto', category: 'sans-serif', weights: [400, 500, 700], hasItalic: true },
    { family: 'Open Sans', category: 'sans-serif', weights: [400, 600, 700], hasItalic: true },
    { family: 'Lato', category: 'sans-serif', weights: [400, 700], hasItalic: true },
    { family: 'Poppins', category: 'sans-serif', weights: [400, 500, 600, 700], hasItalic: true },
    { family: 'Nunito', category: 'sans-serif', weights: [400, 600, 700], hasItalic: true },
    { family: 'Merriweather', category: 'serif', weights: [400, 700], hasItalic: true },
    { family: 'Playfair Display', category: 'serif', weights: [400, 700], hasItalic: true },
    { family: 'Lora', category: 'serif', weights: [400, 700], hasItalic: true },
    { family: 'Source Serif 4', category: 'serif', weights: [400, 600, 700], hasItalic: true },
    { family: 'Roboto Mono', category: 'monospace', weights: [400, 700], hasItalic: true },
    { family: 'Fira Code', category: 'monospace', weights: [400, 500, 700], hasItalic: false },
    { family: 'JetBrains Mono', category: 'monospace', weights: [400, 700], hasItalic: true },
    { family: 'Bebas Neue', category: 'display', weights: [400], hasItalic: false },
    { family: 'Oswald', category: 'display', weights: [400, 500, 700], hasItalic: false },
    { family: 'Dancing Script', category: 'handwriting', weights: [400, 700], hasItalic: false },
    { family: 'Pacifico', category: 'handwriting', weights: [400], hasItalic: false },
    { family: 'Caveat', category: 'handwriting', weights: [400, 700], hasItalic: false },
];

// ─── Font Mark Extension ──────────────────────────────────────────────────────

export const FontFamily: NexMarkExtension = {
    name: 'font_family',
    type: 'mark',
    priority: 100,

    markSpec: {
        attrs: {
            // The validated font family name
            family: { default: null },
        },

        // Marks with different family values are not merged —
        // each font change creates a distinct mark span
        excludes: '',

        parseDOM: [
            {
                style: 'font-family',
                getAttrs(value) {
                    const raw = (value as string).replace(/['"]/g, '').trim();
                    // Validate font name on parse — reject anything suspicious
                    const validated = validateFontFamily(raw);
                    if (!validated) return false;
                    return { family: validated };
                },
            },
        ],

        toDOM(node) {
            const { family } = node.attrs as { family: string | null };
            if (!family) return ['span', 0];

            // Validate again at render time — belt and suspenders
            const validated = validateFontFamily(family);
            if (!validated) return ['span', 0];

            // Wrap in quotes — required for font names with spaces (e.g., 'Open Sans')
            return ['span', { style: `font-family: '${validated}'` }, 0];
        },
    },

    toolbar: {
        id: 'font_family',
        label: 'Font',
        icon: 'font-family',
        group: 'text',

        isActive(state) {
            const markType = state.schema.marks['font_family'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['font_family'];
        },

        execute(view) {
            const event = new CustomEvent('nex:open-font-picker', {
                bubbles: true,
                detail: { view },
            });
            view.dom.dispatchEvent(event);
        },
    },
};

// ─── Google Fonts Loader ──────────────────────────────────────────────────────

/**
 * Cache of already-loaded font families.
 * We never load the same font twice within a session.
 */
const loadedFonts = new Set<string>();

/**
 * Construct a Google Fonts CSS API v2 URL for the given font.
 *
 * The URL is CONSTRUCTED from a ValidatedFontFamily — never from a
 * raw user string. This prevents URL injection.
 *
 * @example
 * buildGoogleFontsURL('Inter', [400, 700], true)
 * // → 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=swap'
 */
function buildGoogleFontsURL(
    family: ValidatedFontFamily,
    weights: FontWeight[],
    hasItalic: boolean,
): string {
    // Encode the family name — spaces become + signs in Google Fonts URLs
    const encodedFamily = family.replace(/\s+/g, '+');

    let familyParam: string;

    if (hasItalic) {
        // Google Fonts v2 italic format: ital,wght@0,400;0,700;1,400;1,700
        const variants = [
            ...weights.map((w) => `0,${w}`),  // normal
            ...weights.map((w) => `1,${w}`),  // italic
        ].join(';');
        familyParam = `${encodedFamily}:ital,wght@${variants}`;
    } else {
        // Normal weights only: wght@400;700
        const variants = weights.join(';');
        familyParam = `${encodedFamily}:wght@${variants}`;
    }

    // Construct the full URL — base is the authoritative Google Fonts API domain
    return `${EDITOR_EXTERNAL_DOMAINS.googleFontsAPI}/css2?family=${familyParam}&display=swap`;
}

/**
 * Load a Google Font into the browser using the FontFace API.
 *
 * This approach is preferred over injecting <link> tags because:
 * - No DOM mutation in the document <head>
 * - Works correctly in Shadow DOM contexts
 * - Avoids render-blocking — loading is fully async
 * - More reliable in SSR environments (Next.js) — can be called client-side only
 * - CSP compliant without requiring 'unsafe-inline' for styles
 *
 * @param fontConfig - The font definition from DEFAULT_FONTS or consumer config
 * @returns          - FontLoadResult indicating success or failure
 */
export async function loadFont(fontConfig: NexFont): Promise<FontLoadResult> {
    // Validate the font name — returns branded type or null
    const validated = validateFontFamily(fontConfig.family);

    if (!validated) {
        const error = `Invalid font family name: "${fontConfig.family}"`;
        console.warn('[NexEditor] loadFont:', error);
        return { family: fontConfig.family as ValidatedFontFamily, status: 'error', error };
    }

    // Skip if already loaded in this session
    if (loadedFonts.has(validated)) {
        return { family: validated, status: 'loaded' };
    }

    // Guard: FontFace API is browser-only — never call on the server (Next.js SSR)
    if (typeof window === 'undefined' || typeof FontFace === 'undefined') {
        return {
            family: validated,
            status: 'error',
            error: 'FontFace API is not available in this environment',
        };
    }

    try {
        // Build the Google Fonts URL from the validated name
        const url = buildGoogleFontsURL(validated, fontConfig.weights, fontConfig.hasItalic);

        // Fetch the font CSS from Google Fonts
        // We use fetch() instead of <link> so we control the request lifecycle
        const response = await fetch(url, {
            // Include a modern User-Agent — Google Fonts serves woff2 to modern agents
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (compatible; NexEditor/1.0; +https://nexcode.africa)',
            },
        });

        if (!response.ok) {
            throw new Error(`Google Fonts API returned ${response.status}: ${response.statusText}`);
        }

        const css = await response.text();

        // Parse the @font-face declarations from the CSS response
        // and load each font source via the FontFace API
        const fontFaceMatches = css.matchAll(
            /@font-face\s*\{[^}]*font-family:\s*['"]([^'"]+)['"][^}]*src:\s*url\(([^)]+)\)[^}]*\}/g,
        );

        const loadPromises: Promise<FontFace>[] = [];

        for (const match of fontFaceMatches) {
            const fontUrl = match[2]?.trim();
            if (!fontUrl) continue;

            // Security: only load fonts from the Google Fonts CDN
            if (!fontUrl.startsWith(EDITOR_EXTERNAL_DOMAINS.googleFontsCDN)) {
                console.warn('[NexEditor] loadFont: Blocked font from unexpected URL:', fontUrl);
                continue;
            }

            const fontFace = new FontFace(validated, `url(${fontUrl})`);
            loadPromises.push(fontFace.load());
        }

        // Wait for all font weights to load
        const loadedFontFaces = await Promise.all(loadPromises);

        // Register each loaded FontFace with the document
        loadedFontFaces.forEach((face) => {
            document.fonts.add(face);
        });

        // Mark as loaded in our session cache
        loadedFonts.add(validated);

        return { family: validated, status: 'loaded' };
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error loading font';
        console.error('[NexEditor] loadFont failed:', error);
        return { family: validated, status: 'error', error };
    }
}

/**
 * Apply a font family mark to the current selection in the editor.
 *
 * This function:
 * 1. Validates the font name
 * 2. Loads the font if not already loaded
 * 3. Applies the font_family mark to the selection
 *
 * @param view       - The editor view
 * @param fontConfig - The font to apply
 * @returns          - true if applied successfully
 */
export async function applyFont(
    view: import('prosemirror-view').EditorView,
    fontConfig: NexFont,
): Promise<boolean> {
    const { state, dispatch } = view;
    const markType = state.schema.marks['font_family'];
    if (!markType) return false;

    // Validate the font name
    const validated = validateFontFamily(fontConfig.family);
    if (!validated) return false;

    // Load the font first — if loading fails, we still apply the mark
    // (the browser will fall back to the system font stack)
    await loadFont(fontConfig);

    // Apply the font_family mark to the current selection
    toggleMark(markType, { family: validated })(state, dispatch, view);
    view.focus();
    return true;
}

/**
 * Remove the font_family mark from the current selection.
 * Resets text to the editor's default font.
 */
export function removeFont(
    view: import('prosemirror-view').EditorView,
): void {
    const { state, dispatch } = view;
    const markType = state.schema.marks['font_family'];
    if (!markType) return;

    const { from, to } = state.selection;
    dispatch(state.tr.removeMark(from, to, markType));
    view.focus();
}

/**
 * Check if a font has already been loaded in this browser session.
 * Used by FontPicker to skip the loading indicator for cached fonts.
 */
export function isFontLoaded(family: string): boolean {
    return loadedFonts.has(family);
}
