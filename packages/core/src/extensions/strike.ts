/**
 * strike.ts
 *
 * Strikethrough mark extension.
 *
 * Renders as <s>. Also parses <strike>, <del>, and text-decoration: line-through
 * from pasted HTML so content from other editors is preserved.
 *
 * Shortcut: Mod+Shift+S
 * Input rule: ~~text~~ → strikethrough (GitHub Flavored Markdown style)
 */

import { InputRule } from 'prosemirror-inputrules';
import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';

export const Strike: NexMarkExtension = {
    name: 'strike',
    type: 'mark',
    priority: 100,

    markSpec: {
        parseDOM: [
            { tag: 's' },
            { tag: 'strike' },
            { tag: 'del' },
            {
                style: 'text-decoration',
                getAttrs: (value) =>
                    (value as string).includes('line-through') ? null : false,
            },
            {
                style: 'text-decoration-line',
                getAttrs: (value) =>
                    (value as string).includes('line-through') ? null : false,
            },
        ],

        toDOM() {
            return ['s', 0];
        },
    },

    shortcut: 'Mod-Shift-s',

    toggleCommand(schema: Schema) {
        return toggleMark(schema.marks['strike']!);
    },

    inputRules(schema: Schema) {
        // ~~text~~ → strikethrough
        return [
            new InputRule(
                /~~([^~]+)~~$/,
                (state, match, start, end) => {
                    const markType = schema.marks['strike'];
                    if (!markType) return null;
                    const content = match[1];
                    if (!content) return null;

                    const tr = state.tr;
                    tr.replaceWith(start, end, schema.text(content, [markType.create()]));
                    return tr;
                },
            ),
        ];
    },

    toolbar: {
        id: 'strike',
        label: 'Strikethrough',
        shortcutHint: 'Mod+Shift+S',
        icon: 'strikethrough',
        group: 'format',

        isActive(state) {
            const markType = state.schema.marks['strike'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['strike'];
        },

        execute(view) {
            const markType = view.state.schema.marks['strike'];
            if (!markType) return;
            toggleMark(markType)(view.state, view.dispatch, view);
            view.focus();
        },
    },
};