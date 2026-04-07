/**
 * italic.ts
 *
 * Italic mark extension.
 *
 * Renders as <em> — the semantically correct element for emphasis.
 * Also parses <i> tags and font-style: italic from pasted HTML.
 *
 * Shortcut: Mod+I
 * Input rule: *text* or _text_ → italic
 */

import { InputRule } from 'prosemirror-inputrules';
import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';

export const Italic: NexMarkExtension = {
    name: 'italic',
    type: 'mark',
    priority: 100,

    markSpec: {
        parseDOM: [
            { tag: 'em' },
            { tag: 'i', getAttrs: (node) => (node as HTMLElement).style.fontStyle !== 'normal' && null },
            { style: 'font-style=italic' },
        ],

        toDOM() {
            return ['em', 0];
        },
    },

    shortcut: 'Mod-i',

    toggleCommand(schema: Schema) {
        return toggleMark(schema.marks['italic']!);
    },

    inputRules(schema: Schema) {
        return [
            // *text* → italic
            new InputRule(
                /(?:^|[^*])\*([^*]+)\*$/,
                (state, match, start, end) => {
                    const markType = schema.marks['italic'];
                    if (!markType) return null;
                    const content = match[1];
                    if (!content) return null;

                    const tr = state.tr;
                    // Preserve any leading character that is not an asterisk
                    const leadingChar = match[0]?.startsWith('*') ? '' : match[0]?.[0] ?? '';
                    tr.replaceWith(
                        start,
                        end,
                        leadingChar
                            ? [schema.text(leadingChar), schema.text(content, [markType.create()])]
                            : [schema.text(content, [markType.create()])],
                    );
                    return tr;
                },
            ),

            // _text_ → italic
            new InputRule(
                /_([^_]+)_$/,
                (state, match, start, end) => {
                    const markType = schema.marks['italic'];
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
        id: 'italic',
        label: 'Italic',
        shortcutHint: 'Mod+I',
        icon: 'italic',
        group: 'format',

        isActive(state) {
            const markType = state.schema.marks['italic'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            return !!state.schema.marks['italic'];
        },

        execute(view) {
            const markType = view.state.schema.marks['italic'];
            if (!markType) return;
            toggleMark(markType)(view.state, view.dispatch, view);
            view.focus();
        },
    },
};