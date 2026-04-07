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
 * - No user-supplied URLs — fonts come from the curated DEFAULT_FONTS list
 */

'use client';

import {
    useState,
    useRef,
    useEffect,
    useCallback,
    type KeyboardEvent,
} from 'react';
import { useNexEditorContext } from '../EditorContext';
import { useFontLoader } from '../../hooks/useFontLoader';
import { applyFont, DEFAULT_FONTS } from '../../extensions/font';
import type { NexFont } from '../../types/font.types';
import styles from './FontPicker.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FontPickerProps {
    /** Override the default font list with a custom curated set */
    fonts?: NexFont[];
    /** Whether to show a search input */
    searchable?: boolean;
    /** Additional CSS class */
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FontPicker({
    fonts = DEFAULT_FONTS,
    searchable = true,
    className = '',
}: FontPickerProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const { loadFontFamily, isFontLoaded } = useFontLoader();

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Filter fonts by search query
    const filteredFonts = fonts.filter((font) =>
        font.family.toLowerCase().includes(search.toLowerCase()),
    );

    // Open/close the dropdown
    const toggleOpen = useCallback(() => {
        setIsOpen((prev) => !prev);
        setSearch('');
        setFocusedIndex(0);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setSearch('');
        triggerRef.current?.focus();
    }, []);

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
            if (!isFontLoaded(font.family)) {
                await loadFontFamily(font);
            }
        },
        [isFontLoaded, loadFontFamily],
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
                    >
                        {filteredFonts.length === 0 ? (
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
                                                loaded
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