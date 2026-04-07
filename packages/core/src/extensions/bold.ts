/**
 * bold.ts
 *
 * Bold mark extension.
 *
 * Renders as <strong> in the DOM — semantically correct for bold text.
 * Also parses <b> tags and font-weight: bold inline styles from pasted HTML
 * so content from Word, Google Docs, and other editors is preserved correctly.
 *
 * Shortcut: Mod+B (Cmd+B on macOS, Ctrl+B on Windows/Linux)
 * Input rule: **text** → bold (like Markdown)
 */

import { inputRules, InputRule } from 'prosemirror-inputrules';
import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';

export const Bold: NexMarkExtension = {
    name: 'bold',
    type: 'mark',
    priority: 100,

    markSpec: {
        // parseDOM: rules for recognising bold when parsing HTML input
        parseDOM: [
            { tag: 'strong' },
            { tag: 'b', getAttrs: (node) => (node as HTMLElement).style.fontWeight !== 'normal' && null },
            {
                style: 'font-weight',
                getAttrs: (value) => {
                    const v = value as string;
                    // Accept font-weight: bold or any numeric weight >= 700
                    return (v === 'bold' || (parseInt(v, 10) >= 700 && !isNaN(parseInt(v, 10)))) && null;
                },
            },
        ],

        // toDOM: how to render this mark in the editor DOM
        toDOM() {
            return ['strong', 0];
        },
    },

    shortcut: 'Mod-b',

    toggleCommand(schema: Schema) {
        return toggleMark(schema.marks['bold']!);
    },

    inputRules(schema: Schema) {
        // **text** → applies bold and removes the asterisks
        return [
            new InputRule(
                /\*\*([^*]+)\*\*$/,
                (state, match, start, end) => {
                    const markType = schema.marks['bold'];
                    if (!markType) return null;

                    const tr = state.tr;
                    const content = match[1];
                    if (!content) return null;

                    // Replace the matched text (including **) with plain text + bold mark
                    tr.replaceWith(start, end, schema.text(content, [markType.create()]));
                    return tr;
                },
            ),
        ];
    },

    toolbar: {
        id: 'bold',
        label: 'Bold',
        shortcutHint: 'Mod+B',
        icon: 'bold',
        group: 'format',

        isActive(state) {
            const markType = state.schema.marks['bold'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['bold'];
        },

        execute(view) {
            const markType = view.state.schema.marks['bold'];
            if (!markType) return;
            toggleMark(markType)(view.state, view.dispatch, view);
            view.focus();
        },
    },
};