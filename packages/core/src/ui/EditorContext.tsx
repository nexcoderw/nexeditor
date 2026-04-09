/**
 * EditorContext.tsx
 *
 * React context that shares the editor instance with all child components.
 *
 * Why context instead of prop drilling?
 * The editor instance needs to be accessible by:
 * - Toolbar (reads state, dispatches commands)
 * - FontSizeControl (reads/writes font-size marks)
 * - BubbleMenu (reads selection, dispatches commands)
 * - FloatingMenu (reads state)
 * - FontPicker (dispatches font marks)
 * - LinkPopover (reads/writes link marks)
 * - ColorPicker (dispatches color marks)
 * - TableControls (dispatches table commands)
 *
 * Passing the editor through props to all of these would be impractical.
 * Context is the correct solution here.
 *
 * Consumer pattern:
 * const editor = useNexEditorContext();
 * if (!editor) return null; // Editor not yet mounted
 */

'use client';

import {
    createContext,
    useContext,
    type ReactNode,
} from 'react';
import type { EditorContextValue } from '../types/editor.types';

// ─── Context ──────────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextValue>({ editor: null });

EditorContext.displayName = 'NexEditorContext';

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface EditorProviderProps {
    editor: EditorContextValue['editor'];
    children: ReactNode;
}

/**
 * Provides the editor instance to all child components.
 * Rendered by <NexEditor /> — consumers don't use this directly.
 */
export function EditorProvider({
    editor,
    children,
}: EditorProviderProps): JSX.Element {
    return (
        <EditorContext.Provider value={{ editor }}>
            {children}
        </EditorContext.Provider>
    );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

/**
 * Access the editor instance from any component inside <NexEditor />.
 *
 * Returns null if the editor has not yet mounted (first render frame).
 * Always guard against null before using the editor instance.
 *
 * @example
 * function MyToolbarButton() {
 *   const editor = useNexEditorContext();
 *   if (!editor) return null;
 *
 *   return (
 *     <button onClick={() => Bold.toolbar?.execute(editor.view)}>
 *       Bold
 *     </button>
 *   );
 * }
 */
export function useNexEditorContext(): EditorContextValue['editor'] {
    const context = useContext(EditorContext);
    return context.editor;
}
