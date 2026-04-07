/**
 * underline.ts
 *
 * Underline mark extension.
 *
 * Renders as <u>. Note: underline is often confused with links in UI —
 * use this intentionally. The toolbar button is included but consumers
 * may choose to omit this extension if their design avoids underline.
 *
 * Shortcut: Mod+U
 */

import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';

export const Underline: NexMarkExtension = {
    name: 'underline',
    type: 'mark',
    priority: 100,

    markSpec: {
        parseDOM: [
            { tag: 'u' },
            {
                style: 'text-decoration',
                getAttrs: (value) =>
                    (value as string).includes('underline') ? null : false,
            },
            {
                style: 'text-decoration-line',
                getAttrs: (value) =>
                    (value as string).includes('underline') ? null : false,
            },
        ],

        toDOM() {
            return ['u', 0];
        },
    },

    shortcut: 'Mod-u',

    toggleCommand(schema: Schema) {
        return toggleMark(schema.marks['underline']!);
    },

    toolbar: {
        id: 'underline',
        label: 'Underline',
        shortcutHint: 'Mod+U',
        icon: 'underline',
        group: 'format',

        isActive(state) {
            const markType = state.schema.marks['underline'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['underline'];
        },

        execute(view) {
            const markType = view.state.schema.marks['underline'];
            if (!markType) return;
            toggleMark(markType)(view.state, view.dispatch, view);
            view.focus();
        },
    },
};