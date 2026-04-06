/**
 * font.types.ts
 *
 * All types for the Google Fonts integration.
 *
 * Security design:
 * - Font family names are validated and branded before use in CSS or the DOM.
 *   A raw string cannot be used as a font family without passing validateFontFamily().
 * - The Google Fonts URL is always constructed from a validated font name —
 *   never from a raw user-supplied URL. This prevents URL injection attacks.
 * - Font loading uses the browser's FontFace API, not <link> injection,
 *   giving us precise control over when and what gets loaded.
 */

// ─── Font Definition ──────────────────────────────────────────────────────────

/**
 * A font available for selection in the editor.
 * Represents one Google Font family.
 */
export interface NexFont {
    /**
     * The font family name exactly as Google Fonts expects it.
     * @example 'Inter', 'Merriweather', 'Roboto Mono', 'Dancing Script'
     */
    family: string;

    /** Visual category — used to group fonts in the picker UI */
    category: FontCategory;

    /**
     * Available font weight variants.
     * Only weights listed here will be loaded — keeps network requests minimal.
     * @example [400, 700] loads regular and bold only
     */
    weights: FontWeight[];

    /**
     * Whether italic variants are available and should be loaded.
     * When true, italic weight files are fetched alongside normal weights.
     */
    hasItalic: boolean;
}

// ─── Font Category ────────────────────────────────────────────────────────────

/**
 * Google Fonts font categories.
 * Used for grouping and filtering in the font picker UI.
 */
export type FontCategory =
    | 'sans-serif'   // Modern, clean — Inter, Roboto, Open Sans
    | 'serif'        // Traditional, editorial — Merriweather, Playfair Display
    | 'monospace'    // Code, technical — Roboto Mono, Fira Code, JetBrains Mono
    | 'display'      // Decorative headlines — Bebas Neue, Abril Fatface
    | 'handwriting'; // Script and cursive — Dancing Script, Pacifico

// ─── Font Weight ─────────────────────────────────────────────────────────────

/** Standard CSS font weight values */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

// ─── Validated Font Family ────────────────────────────────────────────────────

/**
 * A branded string type representing a font family name that has passed
 * security validation.
 *
 * Why branded types here?
 * Without branding, any string could be passed as a font family name.
 * A malicious string like 'Arial; } body { display: none }' could break
 * CSS if inserted directly. The brand forces all font names through
 * validateFontFamily() in validator.ts before they reach any CSS or DOM API.
 *
 * Usage:
 *   const safe = validateFontFamily(userInput); // returns ValidatedFontFamily | null
 *   if (safe) applyFont(safe); // TypeScript enforces this check
 */
export type ValidatedFontFamily = string & { readonly __brand: 'ValidatedFontFamily' };

// ─── Font Load Status ─────────────────────────────────────────────────────────

/** The loading lifecycle of a font family */
export type FontLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

// ─── Font Loader State ────────────────────────────────────────────────────────

/**
 * State managed by the useFontLoader hook.
 * Tracks which fonts have been loaded and any loading errors.
 */
export interface FontLoaderState {
    /** Current loading status */
    status: FontLoadStatus;

    /**
     * Set of font family names that have been successfully loaded.
     * Used to skip re-loading fonts that are already in the browser cache.
     */
    loadedFamilies: Set<string>;

    /** Error message if the last load attempt failed, null otherwise */
    error: string | null;
}

// ─── Font Load Result ─────────────────────────────────────────────────────────

/**
 * Result returned after attempting to load a single font family.
 */
export interface FontLoadResult {
    /** The validated font family that was loaded */
    family: ValidatedFontFamily;

    /** Whether the load succeeded or failed */
    status: 'loaded' | 'error';

    /** Human-readable error message — only present when status is 'error' */
    error?: string;
}

// ─── Font Picker Config ───────────────────────────────────────────────────────

/**
 * Configuration for the <FontPicker /> UI component.
 * Passed via the Font extension's configure() method.
 */
export interface FontPickerConfig {
    /**
     * The curated list of fonts to offer in the picker.
     * If omitted, the built-in default list of 20 popular Google Fonts is used.
     *
     * Keep this list short — each distinct font family requires a network request.
     */
    fonts?: NexFont[];

    /**
     * Number of fonts visible before the list scrolls.
     * @default 10
     */
    visibleCount?: number;

    /**
     * Show a search box so users can filter the font list by name.
     * @default true
     */
    searchable?: boolean;

    /**
     * Render each font name in its own typeface in the picker.
     * Disable this to reduce font loading on the picker open event.
     * @default true
     */
    preview?: boolean;
}

// ─── Google Fonts API URL ─────────────────────────────────────────────────────

/**
 * Parameters for constructing a Google Fonts CSS API v2 URL.
 * Used internally by the font loader — not part of the public API.
 */
export interface GoogleFontsURLParams {
    /** Validated font family name */
    family: ValidatedFontFamily;

    /** Weight variants to request */
    weights: FontWeight[];

    /** Whether to request italic variants */
    italic: boolean;

    /**
     * Display strategy for font loading.
     * 'swap' prevents invisible text during font load — recommended.
     */
    display: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}