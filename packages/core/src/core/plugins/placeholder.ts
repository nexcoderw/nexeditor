/**
 * placeholder.ts
 *
 * Shows placeholder text when the editor is empty.
 *
 * Implementation uses a ProseMirror decoration — not an actual DOM
 * element in the document. This means:
 * - The placeholder never appears in getHTML() or getJSON() output
 * - It cannot be accidentally selected or copied
 * - It does not affect the document structure in any way
 *
 * The placeholder is shown only when:
 * 1. The document has exactly one child (one paragraph)
 * 2. That paragraph is empty (no text content)
 *
 * Styling is handled via CSS — see styles/base.css.
 * The placeholder text is injected via a data attribute on the paragraph
 * so it can be referenced by the ::before pseudo-element in CSS.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { NexFunctionalExtension } from '../../types/extension.types';

/** Plugin key — used to retrieve plugin state from outside the plugin */
export const placeholderPluginKey = new PluginKey<DecorationSet>('placeholder');

/**
 * Create the placeholder functional extension.
 *
 * @param text - The placeholder text to display when the editor is empty
 */
export function createPlaceholderExtension(
    text: string = 'Start writing...',
): NexFunctionalExtension {
    return {
        name: 'placeholder',
        type: 'functional',
        priority: 150,

        plugins() {
            return [
                new Plugin({
                    key: placeholderPluginKey,

                    // Plugin state: a DecorationSet that holds the placeholder decoration
                    // When the editor is not empty, this is DecorationSet.empty
                    state: {
                        init(_, state) {
                            return getDecorations(state.doc, text);
                        },

                        apply(tr, oldDecorations) {
                            // Only recalculate when the document actually changed
                            if (!tr.docChanged) return oldDecorations;
                            return getDecorations(tr.doc, text);
                        },
                    },

                    // Provide the decorations to the EditorView for rendering
                    props: {
                        decorations(state) {
                            return placeholderPluginKey.getState(state) ?? DecorationSet.empty;
                        },
                    },
                }),
            ];
        },
    };
}

/**
 * Calculate the placeholder decoration for the current document state.
 *
 * Returns DecorationSet.empty when the document has content.
 * Returns a widget decoration on the first paragraph when empty.
 */
function getDecorations(
    doc: import('prosemirror-model').Node,
    text: string,
): DecorationSet {
    // The editor is considered empty only when there is a single
    // paragraph child with no content
    const isDocEmpty =
        doc.childCount === 1 &&
        doc.firstChild !== null &&
        doc.firstChild.isTextblock &&
        doc.firstChild.content.size === 0;

    if (!isDocEmpty) return DecorationSet.empty;

    // Create a node decoration on the first paragraph (position 0)
    // The data-placeholder attribute is read by the CSS ::before rule
    const decoration = Decoration.node(0, doc.firstChild!.nodeSize, {
        'data-placeholder': text,
        class: 'nex-placeholder',
    });

    return DecorationSet.create(doc, [decoration]);
}