/**
 * editor.types.ts
 *
 * Single source of truth for all editor-related TypeScript types.
 * These types define the public API surface of @nexcode/editor.
 * Consumers import these for type-safe integration with the editor.
 */

import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Schema } from 'prosemirror-model';
import type { NexExtension } from './extension.types';

// ─── Editor Instance ──────────────────────────────────────────────────────────

/**
 * The live editor instance returned by useEditor().
 * This is what consumers interact with to read state and trigger commands.
 */
export interface NexEditorInstance {
    /** The underlying ProseMirror EditorView — for advanced low-level operations */
    view: EditorView;

    /** Current immutable editor state snapshot */
    state: EditorState;

    /** Whether the editor currently has DOM focus */
    isFocused: boolean;

    /** Whether the document has no meaningful content */
    isEmpty: boolean;

    /** Move focus into the editor */
    focus: () => void;

    /** Remove focus from the editor */
    blur: () => void;

    /**
     * Get the current document as a sanitized HTML string.
     * Safe to persist or send to a server.
     */
    getHTML: () => string;

    /** Get the current document as plain text — no markup */
    getText: () => string;

    /** Get the current document as a ProseMirror JSON object */
    getJSON: () => Record<string, unknown>;

    /**
     * Replace the entire document with new content.
     * All HTML input is sanitized before parsing.
     *
     * @param content - HTML string or ProseMirror JSON object
     */
    setContent: (content: string | Record<string, unknown>) => void;

    /** Wipe the document and reset to an empty state */
    clearContent: () => void;

    /**
     * Destroy the editor instance and clean up all resources.
     * Always call this in your useEffect cleanup to prevent memory leaks.
     */
    destroy: () => void;
}

// ─── Editor Options ───────────────────────────────────────────────────────────

/**
 * Configuration passed to <NexEditor /> or useEditor().
 * All fields are optional — the editor works out of the box with no config.
 */
export interface NexEditorOptions {
    /**
     * Initial document content.
     *
     * Accepts:
     * - HTML string:  '<p>Hello <strong>world</strong></p>'
     * - ProseMirror JSON object (from a previous getJSON() call)
     * - Omit or pass empty string for a blank editor
     *
     * All HTML is sanitized via DOMPurify before it enters the document model.
     *
     * @default ''
     */
    content?: string | Record<string, unknown>;

    /**
     * Placeholder text shown when the editor is empty.
     * @default 'Start writing...'
     */
    placeholder?: string;

    /**
     * When true, the editor does not accept any input.
     * Useful for preview/read modes.
     * @default false
     */
    readOnly?: boolean;

    /**
     * When true, the editor gains focus immediately on mount.
     * Avoid on Next.js SSR pages — focus is a browser concept.
     * @default false
     */
    autofocus?: boolean;

    /**
     * Feature extensions to enable.
     * Only import what you use — unused extensions add zero bundle weight.
     *
     * @example
     * extensions={[Bold, Italic, Heading.configure({ levels: [1, 2, 3] }), Link]}
     */
    extensions?: NexExtension[];

    /**
     * Fired on every document change.
     * Receives the full editor instance — call getHTML() or getJSON() to read content.
     *
     * Debounce this in production if you are persisting on every keystroke.
     */
    onUpdate?: (editor: NexEditorInstance) => void;

    /** Fired when the editor gains focus */
    onFocus?: (editor: NexEditorInstance) => void;

    /** Fired when the editor loses focus */
    onBlur?: (editor: NexEditorInstance) => void;

    /**
     * Fired after the editor mounts and is fully ready.
     * Safe to call focus(), setContent(), etc. from here.
     */
    onReady?: (editor: NexEditorInstance) => void;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Dispatch function — submits a ProseMirror transaction to update state.
 * All document mutations go through this.
 */
export type Dispatch = (tr: Transaction) => void;

/**
 * ProseMirror command signature.
 * Returns true if the command was applicable, false if it was a no-op.
 * Only dispatches the transaction when dispatch is provided.
 */
export type Command = (
    state: EditorState,
    dispatch?: Dispatch,
    view?: EditorView,
) => boolean;

// ─── Schema ───────────────────────────────────────────────────────────────────

/** The compiled ProseMirror schema used by the editor */
export type NexSchema = Schema;

// ─── Theme ────────────────────────────────────────────────────────────────────

/**
 * Visual theme for the editor UI.
 * 'auto' reads the system preference via prefers-color-scheme.
 */
export type EditorTheme = 'light' | 'dark' | 'auto';

// ─── React Context ────────────────────────────────────────────────────────────

/**
 * Shape of the React context shared between all editor sub-components.
 * Not part of the public API — used internally only.
 */
export interface EditorContextValue {
    /** Null during the brief mount window before ProseMirror initializes */
    editor: NexEditorInstance | null;
}