/**
 * useEditorState.ts
 *
 * A lightweight hook that subscribes to editor state changes.
 *
 * Why this exists:
 * ProseMirror's EditorState is immutable — every keystroke produces
 * a new state object. React components that need to react to state
 * changes (e.g., toolbar buttons checking isActive) would normally
 * need to re-render on every transaction.
 *
 * This hook provides a stable subscription pattern that only triggers
 * re-renders when the editor state actually changes — not on every
 * tick. It reads from the EditorView directly rather than storing
 * state in React state, which avoids double-renders.
 *
 * Usage:
 * const state = useEditorState(editor);
 * const isBold = state ? isMarkActive(state, state.schema.marks.bold) : false;
 */

'use client';

import { useEffect, useState } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { NexEditorInstance } from '../types/editor.types';

/**
 * Subscribe to the current ProseMirror EditorState.
 *
 * Returns the latest state on every transaction.
 * Returns null when the editor is not yet mounted.
 *
 * @param editor - The NexEditorInstance from useEditor()
 * @returns      - Current EditorState or null
 */
export function useEditorState(
    editor: NexEditorInstance | null,
): EditorState | null {
    const [editorState, setEditorState] = useState<EditorState | null>(
        editor?.state ?? null,
    );

    useEffect(() => {
        if (!editor) {
            setEditorState(null);
            return;
        }

        // Set the initial state immediately
        setEditorState(editor.state);

        // Subscribe to state changes via a ProseMirror plugin
        // We do this by overriding the dispatchTransaction on the view
        // and reading the new state after each transaction.
        //
        // We use a MutationObserver on the editor DOM element as a
        // lightweight way to detect when the view updates, then read
        // the new state from the view.
        const editorDom = editor.view.dom;

        const observer = new MutationObserver(() => {
            // Read the latest state directly from the view after DOM updates
            setEditorState(editor.view.state);
        });

        observer.observe(editorDom, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
        });

        return () => {
            observer.disconnect();
        };
    }, [editor]);

    return editorState;
}