/**
 * paragraph.ts
 *
 * Paragraph node extension.
 *
 * The paragraph is the default block type. Every editor document
 * starts with at least one paragraph, and pressing Enter in most
 * blocks creates a new paragraph.
 *
 * This extension enhances the base paragraph node defined in schema.ts
 * with a toolbar button and shortcut to explicitly set the current
 * block back to a paragraph (useful when inside a heading).
 *
 * Shortcut: Mod+Alt+0 — "reset to paragraph"
 */

import { setBlockType } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexNodeExtension } from '../types/extension.types';
import { isNodeActive } from '../core/commands';

export const Paragraph: NexNodeExtension = {
    name: 'paragraph',
    type: 'node',

    // Lower priority than headings — paragraph is the fallback
    priority: 50,

    // The paragraph nodeSpec is already defined in schema.ts (the base schema).
    // We re-declare it here so this extension can be used standalone
    // and so the toolbar descriptor is co-located with the node definition.
    nodeSpec: {
        group: 'block',
        content: 'inline*',
        attrs: {
            textAlign: { default: null },
        },

        parseDOM: [
            {
                tag: 'p',
                getAttrs(dom) {
                    const el = dom as HTMLElement;
                    const align = el.style.textAlign || null;
                    return { textAlign: align };
                },
            },
        ],

        toDOM(node) {
            const { textAlign } = node.attrs as { textAlign: string | null };
            const style = textAlign ? `text-align: ${textAlign}` : undefined;
            return ['p', style ? { style } : {}, 0];
        },
    },

    shortcuts(schema: Schema) {
        return {
            // Mod+Alt+0 — reset current block to a plain paragraph
            'Mod-Alt-0': setBlockType(schema.nodes['paragraph']!),
        };
    },

    toolbar: {
        id: 'paragraph',
        label: 'Paragraph',
        shortcutHint: 'Mod+Alt+0',
        icon: 'paragraph',
        group: 'text',

        isActive(state) {
            const nodeType = state.schema.nodes['paragraph'];
            if (!nodeType) return false;
            return isNodeActive(state, nodeType);
        },

        isEnabled(state) {
            return !!state.schema.nodes['paragraph'];
        },

        execute(view) {
            const nodeType = view.state.schema.nodes['paragraph'];
            if (!nodeType) return;
            setBlockType(nodeType)(view.state, view.dispatch, view);
            view.focus();
        },
    },
};