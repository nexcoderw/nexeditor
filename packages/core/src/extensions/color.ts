/**
 * color.ts
 *
 * Text color and background highlight mark extensions.
 *
 * Two marks:
 * - text_color     — sets the foreground color (color CSS property)
 * - highlight      — sets the background color (background-color CSS property)
 *
 * Security:
 * - All color values are validated through validateColor() before insertion
 * - CSS injection via color values is blocked (no url(), expression(), etc.)
 * - Only hex, rgb(), rgba(), hsl(), hsla(), and named colors are accepted
 *
 * Colors are applied through the ColorPicker UI component.
 * The marks store the color value as an attribute — not as raw style strings.
 */

import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';
import { validateColor } from '../security/validator';

// ─── Text Color ───────────────────────────────────────────────────────────────

export const TextColor: NexMarkExtension = {
    name: 'text_color',
    type: 'mark',
    priority: 100,

    markSpec: {
        attrs: {
            color: { default: null },
        },

        parseDOM: [
            {
                style: 'color',
                getAttrs(value) {
                    const color = value as string;
                    // Validate color from parsed HTML — reject unsafe values
                    if (!validateColor(color)) return false;
                    return { color };
                },
            },
        ],

        toDOM(node) {
            const { color } = node.attrs as { color: string | null };
            if (!color) return ['span', 0];
            return ['span', { style: `color: ${color}` }, 0];
        },
    },

    toolbar: {
        id: 'text_color',
        label: 'Text Color',
        icon: 'text-color',
        group: 'format',

        isActive(state) {
            const markType = state.schema.marks['text_color'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['text_color'];
        },

        execute(view) {
            const event = new CustomEvent('nex:open-color-picker', {
                bubbles: true,
                detail: { view, target: 'text_color' },
            });
            view.dom.dispatchEvent(event);
        },
    },
};

// ─── Highlight ────────────────────────────────────────────────────────────────

export const Highlight: NexMarkExtension = {
    name: 'highlight',
    type: 'mark',
    priority: 100,

    markSpec: {
        attrs: {
            color: { default: '#FFFF00' }, // Default: classic yellow highlight
        },

        parseDOM: [
            {
                tag: 'mark',
                getAttrs(dom) {
                    const el = dom as HTMLElement;
                    const color = el.style.backgroundColor;
                    if (color && !validateColor(color)) return false;
                    return { color: color || '#FFFF00' };
                },
            },
            {
                style: 'background-color',
                getAttrs(value) {
                    const color = value as string;
                    if (!validateColor(color)) return false;
                    return { color };
                },
            },
        ],

        toDOM(node) {
            const { color } = node.attrs as { color: string };
            return ['mark', { style: `background-color: ${color}` }, 0];
        },
    },

    toolbar: {
        id: 'highlight',
        label: 'Highlight',
        icon: 'highlight',
        group: 'format',

        isActive(state) {
            const markType = state.schema.marks['highlight'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['highlight'];
        },

        execute(view) {
            const event = new CustomEvent('nex:open-color-picker', {
                bubbles: true,
                detail: { view, target: 'highlight' },
            });
            view.dom.dispatchEvent(event);
        },
    },
};

// ─── Color Helpers ────────────────────────────────────────────────────────────

/**
 * Apply a text color to the current selection.
 * Validates the color before applying — returns false if invalid.
 */
export function applyTextColor(
    view: import('prosemirror-view').EditorView,
    color: string,
): boolean {
    const { state, dispatch } = view;
    const markType = state.schema.marks['text_color'];
    if (!markType) return false;

    if (!validateColor(color)) {
        console.warn('[NexEditor] applyTextColor: invalid color value:', color);
        return false;
    }

    toggleMark(markType, { color })(state, dispatch, view);
    view.focus();
    return true;
}

/**
 * Remove text color from the current selection.
 */
export function removeTextColor(
    view: import('prosemirror-view').EditorView,
): void {
    const { state, dispatch } = view;
    const markType = state.schema.marks['text_color'];
    if (!markType) return;

    const { from, to } = state.selection;
    dispatch(state.tr.removeMark(from, to, markType));
    view.focus();
}

/**
 * Apply a highlight color to the current selection.
 * Validates the color before applying — returns false if invalid.
 */
export function applyHighlight(
    view: import('prosemirror-view').EditorView,
    color: string,
): boolean {
    const { state, dispatch } = view;
    const markType = state.schema.marks['highlight'];
    if (!markType) return false;

    if (!validateColor(color)) {
        console.warn('[NexEditor] applyHighlight: invalid color value:', color);
        return false;
    }

    toggleMark(markType, { color })(state, dispatch, view);
    view.focus();
    return true;
}

/**
 * Remove highlight from the current selection.
 */
export function removeHighlight(
    view: import('prosemirror-view').EditorView,
): void {
    const { state, dispatch } = view;
    const markType = state.schema.marks['highlight'];
    if (!markType) return;

    const { from, to } = state.selection;
    dispatch(state.tr.removeMark(from, to, markType));
    view.focus();
}