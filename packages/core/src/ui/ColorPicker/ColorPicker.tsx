/**
 * ColorPicker.tsx
 *
 * Color selection UI for text color and highlight marks.
 *
 * Opens when:
 * - The TextColor toolbar button is clicked
 * - The Highlight toolbar button is clicked
 * - A 'nex:open-color-picker' custom event is received
 *
 * The event detail tells the ColorPicker which mark to target:
 * - { target: 'text_color' } — applies to TextColor mark
 * - { target: 'highlight' } — applies to Highlight mark
 *
 * Color validation: all colors pass through validateColor() before
 * being applied to the editor — CSS injection is prevented.
 */

'use client';

import {
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import { useNexEditorContext } from '../EditorContext';
import { applyTextColor, applyHighlight } from '../../extensions/color';
import { validateColor } from '../../security/validator';
import styles from './ColorPicker.module.css';

// ─── Preset Colors ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
    // Row 1 — Neutral
    '#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6', '#FFFFFF',
    // Row 2 — Warm
    '#991B1B', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2',
    // Row 3 — Orange/Yellow
    '#92400E', '#D97706', '#F59E0B', '#FCD34D', '#FDE68A', '#FEF3C7',
    // Row 4 — Green
    '#064E3B', '#065F46', '#047857', '#059669', '#34D399', '#A7F3D0',
    // Row 5 — Blue
    '#1E3A5F', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE',
    // Row 6 — Purple
    '#4C1D95', '#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#EDE9FE',
];

const HIGHLIGHT_COLORS = [
    '#FFFF00', // Yellow
    '#00FF00', // Green
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#FFA500', // Orange
    '#FF69B4', // Pink
    '#98FB98', // Pale green
    '#87CEEB', // Sky blue
    '#DDA0DD', // Plum
    '#F0E68C', // Khaki
    '#E6E6FA', // Lavender
    '#FFE4E1', // Misty rose
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ColorPickerProps {
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ColorPicker({ className = '' }: ColorPickerProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const [isOpen, setIsOpen] = useState(false);
    const [target, setTarget] = useState<'text_color' | 'highlight'>('text_color');
    const [customColor, setCustomColor] = useState('#000000');
    const [customError, setCustomError] = useState<string | null>(null);

    const pickerRef = useRef<HTMLDivElement>(null);

    // Listen for the open event from extension toolbar buttons
    useEffect(() => {
        if (!editor) return;

        const handleOpen = (e: Event) => {
            const detail = (e as CustomEvent).detail as {
                target: 'text_color' | 'highlight';
            };
            setTarget(detail.target ?? 'text_color');
            setCustomError(null);
            setIsOpen(true);
        };

        editor.view.dom.addEventListener('nex:open-color-picker', handleOpen);
        return () => {
            editor.view.dom.removeEventListener('nex:open-color-picker', handleOpen);
        };
    }, [editor]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleOutside = (e: MouseEvent) => {
            if (!pickerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

    const applyColor = useCallback(
        (color: string) => {
            if (!editor) return;

            if (!validateColor(color)) {
                setCustomError('Invalid color value');
                return;
            }

            if (target === 'text_color') {
                applyTextColor(editor.view, color);
            } else {
                applyHighlight(editor.view, color);
            }

            setIsOpen(false);
        },
        [editor, target],
    );

    const handleCustomColorSubmit = useCallback(() => {
        applyColor(customColor);
    }, [applyColor, customColor]);

    if (!isOpen || !editor) return null;

    const presets = target === 'highlight' ? HIGHLIGHT_COLORS : PRESET_COLORS;
    const title = target === 'highlight' ? 'Highlight color' : 'Text color';

    const pickerClass = ['nex-color-picker', styles.picker, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={pickerRef}
            className={pickerClass}
            role="dialog"
            aria-label={title}
        >
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <button
                    type="button"
                    className={styles.closeButton}
                    aria-label="Close"
                    onClick={() => setIsOpen(false)}
                >
                    ×
                </button>
            </div>

            {/* Preset color swatches */}
            <div className={styles.swatches} role="list" aria-label="Preset colors">
                {presets.map((color) => (
                    <button
                        key={color}
                        type="button"
                        role="listitem"
                        className={styles.swatch}
                        style={{ backgroundColor: color }}
                        aria-label={`Apply color ${color}`}
                        title={color}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyColor(color)}
                    />
                ))}
            </div>

            {/* Custom color input */}
            <div className={styles.customWrapper}>
                <label className={styles.customLabel} htmlFor="nex-custom-color">
                    Custom
                </label>
                <div className={styles.customInputRow}>
                    {/* Native color input for visual picking */}
                    <input
                        type="color"
                        className={styles.colorInput}
                        value={customColor}
                        onChange={(e) => {
                            setCustomColor(e.target.value);
                            setCustomError(null);
                        }}
                        aria-label="Pick custom color"
                    />
                    {/* Hex text input */}
                    <input
                        id="nex-custom-color"
                        type="text"
                        className={[styles.hexInput, customError ? styles.hexInputError : '']
                            .filter(Boolean)
                            .join(' ')}
                        value={customColor}
                        onChange={(e) => {
                            setCustomColor(e.target.value);
                            setCustomError(null);
                        }}
                        placeholder="#000000"
                        maxLength={9}
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        className={styles.applyCustomButton}
                        onClick={handleCustomColorSubmit}
                    >
                        Apply
                    </button>
                </div>
                {customError && (
                    <p className={styles.error} role="alert">
                        {customError}
                    </p>
                )}
            </div>
        </div>
    );
}