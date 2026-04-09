/**
 * FontPicker.tsx
 *
 * Dropdown UI for selecting a Google Font to apply to the selection.
 *
 * Features:
 * - Searchable font list
 * - Live preview — each font name is rendered in its own typeface
 * - Loading indicator per font while the FontFace API loads it
 * - Grouped by category (sans-serif, serif, monospace, display, handwriting)
 * - Keyboard navigable (arrow keys, Enter to select, Escape to close)
 *
 * Security:
 * - All font names are validated before loading or applying
 * - The font loader only contacts the Google Fonts CDN
 * - No user-supplied URLs — fonts come from the bundled Google Fonts catalog
 */

'use client';

import {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
    type KeyboardEvent,
    type CSSProperties,
} from 'react';
import { useNexEditorContext } from '../EditorContext';
import { useFontLoader } from '../../hooks/useFontLoader';
import { applyFont } from '../../extensions/font';
import type { NexFont, FontPickerConfig } from '../../types/font.types';
import styles from './FontPicker.module.css';

let defaultCatalogPromise: Promise<NexFont[]> | null = null;

async function loadDefaultCatalog(): Promise<NexFont[]> {
    if (!defaultCatalogPromise) {
        defaultCatalogPromise = import('../../data/google-fonts-catalog')
            .then((module) => module.GOOGLE_FONTS_CATALOG);
    }

    return defaultCatalogPromise;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FontPickerProps extends FontPickerConfig {
    /** Additional CSS class */
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FontPicker({
    fonts,
    searchable = true,
    visibleCount = 10,
    preview = true,
    className = '',
}: FontPickerProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const { loadFontFamily, isFontLoaded } = useFontLoader();

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [loadedCatalog, setLoadedCatalog] = useState<NexFont[] | null>(
        fonts ?? null,
    );
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLoadedCatalog(fonts ?? null);
        setIsCatalogLoading(false);
    }, [fonts]);

    const availableFonts = fonts ?? loadedCatalog ?? [];

    // Filter fonts by search query
    const filteredFonts = useMemo(() => (
        availableFonts.filter((font) =>
            font.family.toLowerCase().includes(search.toLowerCase()),
        )
    ), [availableFonts, search]);

    const listStyle = useMemo<CSSProperties | undefined>(() => {
        if (!Number.isFinite(visibleCount) || visibleCount <= 0) {
            return undefined;
        }

        return { maxHeight: `${visibleCount * 40}px` };
    }, [visibleCount]);

    // Open/close the dropdown
    const ensureCatalogLoaded = useCallback(async () => {
        if (fonts || loadedCatalog || isCatalogLoading) return;

        setIsCatalogLoading(true);
        try {
            const catalog = await loadDefaultCatalog();
            setLoadedCatalog(catalog);
        } finally {
            setIsCatalogLoading(false);
        }
    }, [fonts, loadedCatalog, isCatalogLoading]);

    const open = useCallback(() => {
        setIsOpen(true);
        setSearch('');
        setFocusedIndex(0);
        void ensureCatalogLoaded();
    }, [ensureCatalogLoaded]);

    const close = useCallback(() => {
        setIsOpen(false);
        setSearch('');
        triggerRef.current?.focus();
    }, []);

    const toggleOpen = useCallback(() => {
        if (isOpen) {
            close();
            return;
        }

        open();
    }, [close, isOpen, open]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                !triggerRef.current?.contains(target) &&
                !listRef.current?.contains(target)
            ) {
                close();
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, close]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchable) {
            setTimeout(() => searchRef.current?.focus(), 0);
        }
    }, [isOpen, searchable]);

    // Preload font for preview on hover
    const handleFontHover = useCallback(
        async (font: NexFont) => {
            if (!preview) return;
            if (!isFontLoaded(font.family)) {
                await loadFontFamily(font);
            }
        },
        [isFontLoaded, loadFontFamily, preview],
    );

    // Apply a font to the editor selection
    const handleFontSelect = useCallback(
        async (font: NexFont) => {
            if (!editor) return;
            await applyFont(editor.view, font);
            close();
        },
        [editor, close],
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex((i) => Math.min(i + 1, filteredFonts.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex((i) => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredFonts[focusedIndex]) {
                        void handleFontSelect(filteredFonts[focusedIndex]!);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    close();
                    break;
            }
        },
        [filteredFonts, focusedIndex, handleFontSelect, close],
    );

    if (!editor) return null;

    const wrapperClass = ['nex-font-picker', styles.wrapper, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={wrapperClass} onKeyDown={handleKeyDown}>
            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                className={styles.trigger}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select font family"
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleOpen}
            >
                <span className={styles.triggerLabel}>Font</span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                    className={isOpen ? styles.chevronOpen : styles.chevron}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className={styles.dropdown} role="dialog" aria-label="Font picker">
                    {/* Search */}
                    {searchable && (
                        <div className={styles.searchWrapper}>
                            <input
                                ref={searchRef}
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search fonts..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setFocusedIndex(0);
                                }}
                                aria-label="Search fonts"
                            />
                        </div>
                    )}

                    {/* Font list */}
                    <ul
                        ref={listRef}
                        role="listbox"
                        aria-label="Available fonts"
                        className={styles.list}
                        style={listStyle}
                    >
                        {isCatalogLoading && availableFonts.length === 0 ? (
                            <li className={styles.empty}>Loading Google Fonts...</li>
                        ) : filteredFonts.length === 0 ? (
                            <li className={styles.empty}>No fonts found</li>
                        ) : (
                            filteredFonts.map((font, index) => {
                                const loaded = isFontLoaded(font.family);

                                return (
                                    <li
                                        key={font.family}
                                        role="option"
                                        aria-selected={false}
                                        className={[
                                            styles.item,
                                            index === focusedIndex ? styles.itemFocused : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        onMouseEnter={() => void handleFontHover(font)}
                                        onClick={() => void handleFontSelect(font)}
                                    >
                                        {/* Font name rendered in its own typeface */}
                                        <span
                                            className={styles.fontPreview}
                                            style={
                                                preview && loaded
                                                    ? { fontFamily: `'${font.family}', sans-serif` }
                                                    : undefined
                                            }
                                        >
                                            {font.family}
                                        </span>

                                        {/* Category badge */}
                                        <span className={styles.category}>
                                            {font.category}
                                        </span>

                                        {/* Loading indicator */}
                                        {!loaded && (
                                            <span className={styles.loadingDot} aria-hidden="true" />
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
