/**
 * useEditor.ts
 *
 * The primary React hook for initializing and managing the editor instance.
 *
 * Responsibilities:
 * - Creates the ProseMirror EditorView on mount
 * - Builds the schema from registered extensions
 * - Assembles plugins from extensions + base plugins
 * - Wires up all event callbacks (onUpdate, onFocus, onBlur, onReady)
 * - Returns a stable NexEditorInstance reference
 * - Cleans up the EditorView on unmount — no memory leaks
 *
 * Next.js SSR safety:
 * - ProseMirror is browser-only. This hook guards every DOM and
 *   browser API access behind typeof window checks.
 * - The hook returns null during SSR — consumers must handle this.
 * - The <NexEditor /> component wraps this hook and only renders
 *   the editor container on the client side.
 *
 * Stability contract:
 * - The returned editor instance reference is stable across re-renders
 *   as long as the editor is mounted. Consumers can safely store it
 *   in refs without causing re-render loops.
 */

'use client'; // Next.js App Router — this hook is client-only

import {
    useEffect,
    useRef,
    useState,
    type RefObject,
} from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
    DOMParser as ProseMirrorDOMParser,
    DOMSerializer,
} from 'prosemirror-model';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { inputRules } from 'prosemirror-inputrules';

import { buildSchema } from '../core/schema';
import { buildKeymap } from '../core/keymap';
import { HistoryExtension } from '../core/plugins/history';
import { createPlaceholderExtension } from '../core/plugins/placeholder';
import { SecurityExtension } from '../core/plugins/security';
import { sanitizeHTML } from '../security/sanitizer';
import { validateContent } from '../security/validator';

import type { NexEditorOptions, NexEditorInstance } from '../types/editor.types';
import type { NexExtension } from '../types/extension.types';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Collect all ProseMirror plugins from functional extensions.
 * Also collects input rules from mark and node extensions and
 * wraps them in a single inputRules() plugin.
 */
function buildPlugins(
    extensions: NexExtension[],
    schema: import('prosemirror-model').Schema,
): import('prosemirror-state').Plugin[] {
    const plugins: import('prosemirror-state').Plugin[] = [];

    // ── Security plugin first — highest priority ─────────────────────────────
    plugins.push(...SecurityExtension.plugins(schema));

    // ── Collect functional extension plugins ─────────────────────────────────
    const sorted = [...extensions].sort(
        (a, b) => (b.priority ?? 100) - (a.priority ?? 100),
    );

    for (const ext of sorted) {
        if (ext.type === 'functional') {
            plugins.push(...ext.plugins(schema));
        }
    }

    // ── Collect input rules from mark and node extensions ────────────────────
    const allInputRules: import('prosemirror-inputrules').InputRule[] = [];

    for (const ext of sorted) {
        if (
            (ext.type === 'mark' || ext.type === 'node') &&
            ext.inputRules
        ) {
            allInputRules.push(...ext.inputRules(schema));
        }
    }

    if (allInputRules.length > 0) {
        plugins.push(inputRules({ rules: allInputRules }));
    }

    // ── Built-in ProseMirror plugins ─────────────────────────────────────────
    plugins.push(
        // Drop cursor: shows a visual indicator when dragging content
        dropCursor({ color: 'var(--nex-accent-color, #4F46E5)', width: 2 }),

        // Gap cursor: allows placing the cursor in gaps between nodes
        // (e.g., between two images, before a table)
        gapCursor(),
    );

    return plugins;
}

/**
 * Parse initial content into a ProseMirror document.
 * Accepts HTML strings or ProseMirror JSON objects.
 * All HTML is sanitized before parsing.
 */
function parseContent(
    content: string | Record<string, unknown> | undefined,
    schema: import('prosemirror-model').Schema,
): import('prosemirror-model').Node {
    // Empty or undefined content → empty document
    if (!content || (typeof content === 'string' && content.trim() === '')) {
        return schema.topNodeType.createAndFill()!;
    }

    // ProseMirror JSON object
    if (typeof content === 'object') {
        try {
            return schema.nodeFromJSON(content);
        } catch (err) {
            console.error('[NexEditor] Failed to parse JSON content:', err);
            return schema.topNodeType.createAndFill()!;
        }
    }

    // HTML string — sanitize first, then parse
    const sanitized = sanitizeHTML(content);
    const container = document.createElement('div');
    container.innerHTML = sanitized;

    return ProseMirrorDOMParser.fromSchema(schema).parse(container);
}

// ─── Public Hook ──────────────────────────────────────────────────────────────

/**
 * Hook return value — the editor instance plus a ref to attach to a DOM element.
 */
export interface UseEditorReturn {
    /**
     * Attach this ref to the div that will host the ProseMirror editor.
     * The editor mounts into this element on the first render.
     */
    containerRef: RefObject<HTMLDivElement>;

    /**
     * The live editor instance. Null during SSR and during the brief
     * mount window before ProseMirror initializes (~1 frame).
     */
    editor: NexEditorInstance | null;
}

/**
 * Initialize and manage a NexEditor instance.
 *
 * @param options - Editor configuration
 * @returns       - { containerRef, editor }
 *
 * @example
 * function MyEditor() {
 *   const { containerRef, editor } = useEditor({
 *     content: '<p>Hello world</p>',
 *     extensions: [Bold, Italic, Heading],
 *     onUpdate: (e) => console.log(e.getHTML()),
 *   });
 *
 *   return <div ref={containerRef} />;
 * }
 */
export function useEditor(options: NexEditorOptions = {}): UseEditorReturn {
    const {
        content,
        placeholder = 'Start writing...',
        readOnly = false,
        autofocus = false,
        extensions = [],
        onUpdate,
        onFocus,
        onBlur,
        onReady,
    } = options;

    // The DOM element ProseMirror will mount into
    const containerRef = useRef<HTMLDivElement>(null);

    // The editor instance exposed to consumers
    const [editor, setEditor] = useState<NexEditorInstance | null>(null);

    // Keep callbacks in refs so they never trigger re-initialization
    const onUpdateRef = useRef(onUpdate);
    const onFocusRef = useRef(onFocus);
    const onBlurRef = useRef(onBlur);
    const onReadyRef = useRef(onReady);

    // Update callback refs when props change — no re-mount needed
    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
    useEffect(() => { onFocusRef.current = onFocus; }, [onFocus]);
    useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);
    useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

    useEffect(() => {
        // SSR safety — ProseMirror requires a real DOM
        if (typeof window === 'undefined') return;
        if (!containerRef.current) return;

        // ── Assemble all extensions ────────────────────────────────────────────
        // Always include history and placeholder — they are non-negotiable base features
        const allExtensions: NexExtension[] = [
            HistoryExtension,
            createPlaceholderExtension(placeholder),
            ...extensions,
        ];

        // ── Build schema from extensions ───────────────────────────────────────
        const schema = buildSchema(allExtensions);

        // ── Build plugins ──────────────────────────────────────────────────────
        const plugins = buildPlugins(allExtensions, schema);

        // ── Build keymap plugins ───────────────────────────────────────────────
        const keymapPlugins = buildKeymap(allExtensions, schema);

        // ── Parse initial content ──────────────────────────────────────────────
        const doc = parseContent(
            validateContent(content) ? content : undefined,
            schema,
        );

        // ── Create the initial EditorState ────────────────────────────────────
        const state = EditorState.create({
            doc,
            plugins: [...keymapPlugins, ...plugins],
        });

        // ── Create the EditorView ─────────────────────────────────────────────
        const view = new EditorView(containerRef.current, {
            state,

            // Read-only mode — all transactions are discarded
            editable: () => !readOnly,

            // dispatchTransaction is called for every state change
            // We rebuild the NexEditorInstance on every transaction
            dispatchTransaction(transaction) {
                const newState = view.state.apply(transaction);
                view.updateState(newState);

                // Fire onUpdate callback when content changes
                if (transaction.docChanged) {
                    onUpdateRef.current?.(instance);
                }
            },

            // DOM event handlers
            handleDOMEvents: {
                focus: () => {
                    onFocusRef.current?.(instance);
                    return false; // Don't prevent default
                },
                blur: () => {
                    onBlurRef.current?.(instance);
                    return false;
                },
            },

            // Accessibility attributes
            attributes: {
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-label': placeholder,
                'data-nex-editor': 'true',
                class: 'nex-editor-content',
            },
        });

        // ── Build the NexEditorInstance ───────────────────────────────────────
        const instance: NexEditorInstance = {
            get view() { return view; },
            get state() { return view.state; },
            get isFocused() { return view.hasFocus(); },

            get isEmpty() {
                const { doc } = view.state;
                return (
                    doc.childCount === 1 &&
                    doc.firstChild !== null &&
                    doc.firstChild.isTextblock &&
                    doc.firstChild.content.size === 0
                );
            },

            focus() {
                if (!view.hasFocus()) view.focus();
            },

            blur() {
                (view.dom as HTMLElement).blur();
            },

            getHTML() {
                // Serialize the ProseMirror document to HTML
                const div = document.createElement('div');
                const fragment = view.state.doc.content;

                // Use a temporary DOMSerializer to convert the document
                const serializer = DOMSerializer.fromSchema(schema);
                const domFragment = serializer.serializeFragment(fragment);
                div.appendChild(domFragment);
                return div.innerHTML;
            },

            getText() {
                return view.state.doc.textContent;
            },

            getJSON() {
                return view.state.doc.toJSON() as Record<string, unknown>;
            },

            setContent(newContent) {
                if (!validateContent(newContent)) {
                    console.warn('[NexEditor] setContent: invalid content type');
                    return;
                }

                const newDoc = parseContent(newContent, schema);
                const newState = EditorState.create({
                    doc: newDoc,
                    plugins: view.state.plugins,
                });
                view.updateState(newState);
            },

            clearContent() {
                const emptyDoc = schema.topNodeType.createAndFill()!;
                const newState = EditorState.create({
                    doc: emptyDoc,
                    plugins: view.state.plugins,
                });
                view.updateState(newState);
            },

            destroy() {
                view.destroy();
                setEditor(null);
            },
        };

        // Expose the instance to React state
        setEditor(instance);

        // Fire onReady after the editor is fully initialized
        // Use setTimeout to ensure the DOM has fully painted
        setTimeout(() => {
            onReadyRef.current?.(instance);

            // Auto-focus if requested — browser-only, safe after mount
            if (autofocus) {
                view.focus();
            }
        }, 0);

        // ── Cleanup ───────────────────────────────────────────────────────────
        // Called when the component unmounts or options change
        return () => {
            view.destroy();
            setEditor(null);
        };

        // We intentionally exclude most options from the dependency array.
        // Re-initializing the editor on every prop change would destroy
        // the document state. Callbacks are handled via refs above.
        // Only re-initialize when the extension list or readOnly changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readOnly, placeholder]);

    return { containerRef, editor };
}
