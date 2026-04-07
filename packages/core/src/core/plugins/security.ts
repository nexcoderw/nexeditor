/**
 * security.ts
 *
 * The editor's runtime security plugin.
 *
 * This plugin intercepts every paste event and clipboard read before
 * the content reaches ProseMirror's default paste handler.
 * It sanitizes all pasted HTML through our DOMPurify wrapper.
 *
 * Why a plugin and not just a DOM event listener?
 * ProseMirror's plugin system gives us access to the EditorView and
 * dispatch function — we can sanitize content and insert it as a proper
 * ProseMirror transaction instead of raw DOM manipulation.
 * This keeps document integrity guaranteed by the schema.
 *
 * What this plugin protects against:
 * - XSS via pasted HTML from malicious websites
 * - Malicious content copied from other rich text editors
 * - HTML files dragged and dropped into the editor
 * - Clipboard API abuse injecting script tags
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model';
import { sanitizeHTML } from '../../security/sanitizer';
import type { NexFunctionalExtension } from '../../types/extension.types';
import type { Schema } from 'prosemirror-model';

export const securityPluginKey = new PluginKey('security');

export const SecurityExtension: NexFunctionalExtension = {
    name: 'security',
    type: 'functional',

    // Maximum priority — security runs before everything else
    priority: 1000,

    plugins(schema: Schema) {
        return [
            new Plugin({
                key: securityPluginKey,

                props: {
                    /**
                     * Intercept all paste events.
                     *
                     * ProseMirror calls this before its own paste handling.
                     * Returning true tells ProseMirror we handled the event —
                     * it will not run its default paste logic.
                     * Returning false falls through to ProseMirror's handler.
                     */
                    handlePaste(view, event) {
                        // Access the clipboard data
                        const clipboardData = event.clipboardData;
                        if (!clipboardData) return false;

                        // Check if there is HTML content on the clipboard
                        const html = clipboardData.getData('text/html');
                        if (!html) {
                            // No HTML — let ProseMirror handle plain text paste normally
                            return false;
                        }

                        // Sanitize the HTML through our DOMPurify layer
                        const sanitized = sanitizeHTML(html);

                        // Parse the sanitized HTML into a ProseMirror document fragment.
                        // The schema acts as a second filter — any element not defined
                        // in the schema is silently dropped during parsing.
                        const parser = ProseMirrorDOMParser.fromSchema(schema);

                        // Create a temporary DOM container to parse into
                        const container = document.createElement('div');
                        container.innerHTML = sanitized;

                        const slice = parser.parseSlice(container, {
                            // Preserve whitespace in code blocks
                            preserveWhitespace: 'full',
                        });

                        // Dispatch the parsed content as a ProseMirror transaction
                        const { state, dispatch } = view;
                        const tr = state.tr.replaceSelection(slice);

                        // Mark this transaction so other plugins know it came from paste
                        tr.setMeta('paste', true);
                        tr.setMeta('uiEvent', 'paste');

                        dispatch(tr);

                        // Return true — we handled this paste event
                        return true;
                    },

                    /**
                     * Intercept drag-and-drop events.
                     *
                     * Files and HTML content can be dragged into the editor.
                     * We apply the same sanitization as paste.
                     */
                    handleDrop(view, event, _slice, moved) {
                        // If content is being moved within the editor, allow it untouched
                        if (moved) return false;

                        const dataTransfer = event.dataTransfer;
                        if (!dataTransfer) return false;

                        // Check for HTML in the drop data
                        const html = dataTransfer.getData('text/html');
                        if (!html) return false;

                        // Sanitize and insert — same flow as paste
                        const sanitized = sanitizeHTML(html);
                        const parser = ProseMirrorDOMParser.fromSchema(schema);

                        const container = document.createElement('div');
                        container.innerHTML = sanitized;

                        const slice = parser.parseSlice(container, {
                            preserveWhitespace: 'full',
                        });

                        // Insert at the drop position, not the current selection
                        const dropPos = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                        });

                        if (!dropPos) return false;

                        const { state, dispatch } = view;
                        const tr = state.tr.replaceRange(
                            dropPos.pos,
                            dropPos.pos,
                            slice,
                        );

                        tr.setMeta('uiEvent', 'drop');
                        dispatch(tr);

                        return true;
                    },
                },
            }),
        ];
    },
};