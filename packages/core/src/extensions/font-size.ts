/**
 * font-size.ts
 *
 * Text size mark extension and Docs-style size helpers.
 *
 * The built-in toolbar renders this extension as a compact size control with:
 * - Decrease button
 * - Current numeric size input
 * - Increase button
 *
 * Sizes are normalized to pixel values when applied from the toolbar control.
 * Parsed HTML may still contain pt/rem/em values — those are preserved until
 * the user changes the size through the control.
 */

import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';
import { validateFontSize } from '../security/validator';

export const DEFAULT_FONT_SIZE_PX = 16;
export const MIN_FONT_SIZE_PX = 8;
export const MAX_FONT_SIZE_PX = 96;

function clampFontSizePx(size: number): number {
    return Math.min(MAX_FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, size));
}

function parseFontSizeValue(size: string | null | undefined): number | null {
    if (!size || !validateFontSize(size)) return null;

    const trimmed = size.trim();
    const numeric = Number.parseFloat(trimmed);
    if (!Number.isFinite(numeric)) return null;

    if (trimmed.endsWith('px')) return numeric;
    if (trimmed.endsWith('pt')) return numeric * (4 / 3);
    if (trimmed.endsWith('rem') || trimmed.endsWith('em')) return numeric * DEFAULT_FONT_SIZE_PX;

    return null;
}

function formatFontSizePx(size: number): string {
    return `${clampFontSizePx(Math.round(size))}px`;
}

function getFontSizeMarkValue(state: EditorState): string | null {
    const markType = state.schema.marks['font_size'];
    if (!markType) return null;

    if (state.selection.empty) {
        const mark = markType.isInSet(
            state.storedMarks ?? state.selection.$from.marks(),
        );
        return typeof mark?.attrs['size'] === 'string' ? mark.attrs['size'] : null;
    }

    const { from, to } = state.selection;
    let resolvedSize: string | null | undefined;
    let mixedSizes = false;

    state.doc.nodesBetween(from, to, (node) => {
        if (!node.isText) return true;

        const mark = markType.isInSet(node.marks);
        const size = typeof mark?.attrs['size'] === 'string' ? mark.attrs['size'] : null;

        if (resolvedSize === undefined) {
            resolvedSize = size;
            return true;
        }

        if (resolvedSize !== size) {
            mixedSizes = true;
            return false;
        }

        return true;
    });

    if (mixedSizes) return null;
    return resolvedSize ?? null;
}

export function getCurrentFontSize(state: EditorState): string | null {
    return getFontSizeMarkValue(state);
}

export function getCurrentFontSizePx(
    state: EditorState,
    fallback = DEFAULT_FONT_SIZE_PX,
): number {
    const parsed = parseFontSizeValue(getFontSizeMarkValue(state));
    return clampFontSizePx(parsed ?? fallback);
}

export const FontSize: NexMarkExtension = {
    name: 'font_size',
    type: 'mark',
    priority: 100,

    markSpec: {
        attrs: {
            size: { default: null },
        },

        excludes: '',

        parseDOM: [
            {
                style: 'font-size',
                getAttrs(value) {
                    const size = value as string;
                    if (!validateFontSize(size)) return false;
                    return { size };
                },
            },
        ],

        toDOM(node) {
            const { size } = node.attrs as { size: string | null };
            if (!size || !validateFontSize(size)) return ['span', 0];
            return ['span', { style: `font-size: ${size}` }, 0];
        },
    },

    toolbar: {
        id: 'font_size',
        label: 'Font Size',
        icon: 'font-size',
        group: 'text',

        isActive(state) {
            const markType = state.schema.marks['font_size'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['font_size'];
        },

        execute(view) {
            view.focus();
        },
    },
};

export function applyFontSize(view: EditorView, size: string): boolean {
    const normalizedSize = size.trim();
    if (!validateFontSize(normalizedSize)) {
        console.warn('[NexEditor] applyFontSize: invalid font size value:', size);
        return false;
    }

    const { state, dispatch } = view;
    const markType = state.schema.marks['font_size'];
    if (!markType) return false;

    const tr = state.tr;

    if (state.selection.empty) {
        tr.removeStoredMark(markType);
        tr.addStoredMark(markType.create({ size: normalizedSize }));
    } else {
        const { from, to } = state.selection;
        tr.removeMark(from, to, markType);
        tr.addMark(from, to, markType.create({ size: normalizedSize }));
    }

    dispatch(tr.scrollIntoView());
    view.focus();
    return true;
}

export function removeFontSize(view: EditorView): void {
    const { state, dispatch } = view;
    const markType = state.schema.marks['font_size'];
    if (!markType) return;

    const tr = state.tr;

    if (state.selection.empty) {
        tr.removeStoredMark(markType);
    } else {
        const { from, to } = state.selection;
        tr.removeMark(from, to, markType);
    }

    dispatch(tr.scrollIntoView());
    view.focus();
}

export function changeFontSize(
    view: EditorView,
    delta: number,
    fallback = DEFAULT_FONT_SIZE_PX,
): boolean {
    const nextSize = getCurrentFontSizePx(view.state, fallback) + delta;
    return applyFontSize(view, formatFontSizePx(nextSize));
}
