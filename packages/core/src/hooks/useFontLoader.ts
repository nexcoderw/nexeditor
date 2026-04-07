/**
 * useFontLoader.ts
 *
 * React hook that manages Google Font loading state.
 *
 * Tracks:
 * - Which fonts have been loaded
 * - Current loading status
 * - Any load errors
 *
 * Used by the FontPicker component to show loading indicators
 * and disable font options that failed to load.
 *
 * SSR safe — font loading is skipped on the server and deferred
 * to the client. The hook returns 'idle' status during SSR.
 */

'use client';

import { useState, useCallback } from 'react';
import { loadFont } from '../extensions/font';
import type { NexFont } from '../types/font.types';
import type { FontLoaderState } from '../types/font.types';

export interface UseFontLoaderReturn {
    /** Current loading state */
    fontState: FontLoaderState;

    /**
     * Load a font and update state.
     * Safe to call multiple times for the same font — already-loaded
     * fonts are returned immediately from the session cache.
     */
    loadFontFamily: (font: NexFont) => Promise<void>;

    /** Whether a specific font family is currently loaded */
    isFontLoaded: (family: string) => boolean;
}

/**
 * Manage Google Font loading state in React.
 *
 * @example
 * const { fontState, loadFontFamily } = useFontLoader();
 *
 * // In FontPicker, when user hovers a font to preview it:
 * const handleHover = async (font) => {
 *   await loadFontFamily(font);
 * };
 */
export function useFontLoader(): UseFontLoaderReturn {
    const [fontState, setFontState] = useState<FontLoaderState>({
        status: 'idle',
        loadedFamilies: new Set<string>(),
        error: null,
    });

    const loadFontFamily = useCallback(async (font: NexFont) => {
        // Skip loading if already loaded
        if (fontState.loadedFamilies.has(font.family)) return;

        // SSR safety — never attempt font loading on the server
        if (typeof window === 'undefined') return;

        setFontState((prev) => ({
            ...prev,
            status: 'loading',
            error: null,
        }));

        const result = await loadFont(font);

        setFontState((prev) => {
            const newLoadedFamilies = new Set(prev.loadedFamilies);

            if (result.status === 'loaded') {
                newLoadedFamilies.add(result.family);
                return {
                    status: 'loaded',
                    loadedFamilies: newLoadedFamilies,
                    error: null,
                };
            }

            return {
                status: 'error',
                loadedFamilies: newLoadedFamilies,
                error: result.error ?? 'Unknown error loading font',
            };
        });
    }, [fontState.loadedFamilies]);

    const isFontLoaded = useCallback(
        (family: string): boolean => fontState.loadedFamilies.has(family),
        [fontState.loadedFamilies],
    );

    return { fontState, loadFontFamily, isFontLoaded };
}