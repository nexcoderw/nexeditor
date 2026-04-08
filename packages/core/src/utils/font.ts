/**
 * font.ts
 *
 * Font utility functions used across the font system.
 * These are pure functions — no side effects, no browser API calls.
 * Safe to use in any context including SSR.
 */

import type { NexFont, FontCategory } from '../types/font.types';

/**
 * Group a flat list of fonts by their category.
 * Used by the FontPicker to render categorised sections.
 *
 * @param fonts - Flat array of NexFont objects
 * @returns     - Map from category to fonts in that category
 *
 * @example
 * const grouped = groupFontsByCategory(DEFAULT_FONTS);
 * grouped.get('sans-serif') // [Inter, Roboto, ...]
 * grouped.get('serif')      // [Merriweather, ...]
 */
export function groupFontsByCategory(
    fonts: NexFont[],
): Map<FontCategory, NexFont[]> {
    const groups = new Map<FontCategory, NexFont[]>();

    for (const font of fonts) {
        const existing = groups.get(font.category);
        if (existing) {
            existing.push(font);
        } else {
            groups.set(font.category, [font]);
        }
    }

    return groups;
}

/**
 * Filter fonts by a search query.
 * Case-insensitive match against the font family name.
 *
 * @param fonts  - Array of fonts to filter
 * @param query  - Search string
 * @returns      - Filtered array
 */
export function filterFonts(fonts: NexFont[], query: string): NexFont[] {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return fonts;
    return fonts.filter((f) =>
        f.family.toLowerCase().includes(normalized),
    );
}

/**
 * Find a font by its family name.
 * Case-insensitive match.
 *
 * @param fonts  - Array of fonts to search
 * @param family - Font family name to find
 * @returns      - The matching font, or undefined
 */
export function findFontByFamily(
    fonts: NexFont[],
    family: string,
): NexFont | undefined {
    const normalized = family.toLowerCase().trim();
    return fonts.find((f) => f.family.toLowerCase() === normalized);
}

/**
 * Human-readable label for a font category.
 * Used in the FontPicker category headers.
 *
 * @param category - The FontCategory enum value
 * @returns        - Display label
 */
export function getCategoryLabel(category: FontCategory): string {
    const labels: Record<FontCategory, string> = {
        'sans-serif': 'Sans Serif',
        'serif': 'Serif',
        'monospace': 'Monospace',
        'display': 'Display',
        'handwriting': 'Handwriting',
    };
    return labels[category] ?? category;
}

/**
 * Sort fonts alphabetically within each category.
 * Returns a new array — does not mutate the input.
 *
 * @param fonts - Array of fonts to sort
 * @returns     - Sorted copy
 */
export function sortFontsAlphabetically(fonts: NexFont[]): NexFont[] {
    return [...fonts].sort((a, b) => a.family.localeCompare(b.family));
}