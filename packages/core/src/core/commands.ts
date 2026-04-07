/**
 * commands.ts
 *
 * Core editor commands — reusable functions that read and mutate
 * the editor state through ProseMirror transactions.
 *
 * Command contract (ProseMirror convention):
 * - A command is a function: (state, dispatch?, view?) => boolean
 * - Returns true  if the command CAN be applied in the current state
 * - Returns false if the command is not applicable (e.g., no selection)
 * - Only dispatches a transaction when `dispatch` is provided
 * - When called without dispatch, it is a dry-run (used to check if
 *   a toolbar button should be enabled)
 *
 * These commands are the building blocks used by extensions and the toolbar.
 * Extensions can import and compose these instead of re-implementing logic.
 */

import {
    toggleMark,
    setBlockType,
    wrapIn,
    lift,
    joinUp,
    joinDown,
    selectParentNode,
} from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { wrapInList, liftListItem, splitListItem } from 'prosemirror-schema-list';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Schema, MarkType, NodeType } from 'prosemirror-model';
import type { Command } from '../types/editor.types';

// ─── History Commands ─────────────────────────────────────────────────────────

/** Undo the last change. Requires the HistoryExtension to be registered. */
export const undoCommand: Command = undo;

/** Redo the last undone change. Requires the HistoryExtension to be registered. */
export const redoCommand: Command = redo;

// ─── Mark Commands ────────────────────────────────────────────────────────────

/**
 * Create a command that toggles a mark on the current selection.
 *
 * When text is selected:
 * - If ALL selected text has the mark → removes it
 * - If SOME or NONE of the text has the mark → applies it to all
 *
 * When cursor is not on a selection:
 * - Toggles the mark for subsequent typing (stored marks)
 *
 * @param markType - The ProseMirror MarkType to toggle
 * @param attrs    - Optional attributes to set on the mark (e.g., href for links)
 */
export function createToggleMarkCommand(
    markType: MarkType,
    attrs?: Record<string, unknown>,
): Command {
    return toggleMark(markType, attrs);
}

/**
 * Check if a mark is currently active at the cursor position or selection.
 * Used by toolbar buttons to show their active state.
 *
 * @param state    - Current editor state
 * @param markType - The mark type to check for
 * @returns        - true if the mark is active
 */
export function isMarkActive(state: EditorState, markType: MarkType): boolean {
    const { from, $from, to, empty } = state.selection;

    if (empty) {
        // Cursor (no selection) — check stored marks or marks at cursor position
        return !!markType.isInSet(
            state.storedMarks ?? $from.marks(),
        );
    }

    // Range selection — check if the mark exists anywhere in the range
    return state.doc.rangeHasMark(from, to, markType);
}

/**
 * Check if a mark is active across the ENTIRE selection.
 * The difference from isMarkActive: this returns false if only SOME of
 * the selection is marked. Used to show the "mixed" state in toolbars.
 */
export function isMarkActiveAcrossSelection(
    state: EditorState,
    markType: MarkType,
): boolean {
    const { from, to, empty } = state.selection;

    if (empty) return isMarkActive(state, markType);

    // Walk through the selection range and check every position
    let allMarked = true;

    state.doc.nodesBetween(from, to, (node) => {
        if (node.isText) {
            if (!markType.isInSet(node.marks)) {
                allMarked = false;
                return false; // Stop traversal early
            }
        }
        return true;
    });

    return allMarked;
}

// ─── Block Commands ───────────────────────────────────────────────────────────

/**
 * Create a command that converts the current block to a specific node type.
 * Used by the heading and paragraph extensions.
 *
 * @param nodeType - The target node type (e.g., schema.nodes.heading)
 * @param attrs    - Attributes for the new node (e.g., { level: 1 } for h1)
 */
export function createSetBlockTypeCommand(
    nodeType: NodeType,
    attrs?: Record<string, unknown>,
): Command {
    return setBlockType(nodeType, attrs);
}

/**
 * Check if the current selection is inside a node of the given type.
 * Used by toolbar buttons to show their active state.
 *
 * @example
 * isNodeActive(state, schema.nodes.heading, { level: 1 })
 * // Returns true when cursor is inside an h1
 */
export function isNodeActive(
    state: EditorState,
    nodeType: NodeType,
    attrs?: Record<string, unknown>,
): boolean {
    const { $from, to } = state.selection;

    // Walk up the ancestor chain from the selection start
    let depth = $from.depth;

    while (depth > 0) {
        const node = $from.node(depth);

        if (node.type === nodeType) {
            if (!attrs) return true;

            // Check that all specified attrs match
            const nodeAttrs = node.attrs as Record<string, unknown>;
            const attrsMatch = Object.entries(attrs).every(
                ([key, val]) => nodeAttrs[key] === val,
            );

            if (attrsMatch) return true;
        }

        depth--;
    }

    // Also check nodes within the selection range
    let found = false;
    state.doc.nodesBetween($from.pos, to, (node) => {
        if (node.type === nodeType) {
            if (!attrs) {
                found = true;
                return false;
            }

            const nodeAttrs = node.attrs as Record<string, unknown>;
            const attrsMatch = Object.entries(attrs).every(
                ([key, val]) => nodeAttrs[key] === val,
            );

            if (attrsMatch) {
                found = true;
                return false;
            }
        }
        return !found;
    });

    return found;
}

// ─── List Commands ────────────────────────────────────────────────────────────

/**
 * Create a command that wraps the current selection in a list.
 * Toggles the list off if the selection is already in a list of that type.
 *
 * @param listType - bullet_list or ordered_list node type
 * @param schema   - The compiled editor schema
 */
export function createToggleListCommand(
    listType: NodeType,
    schema: Schema,
): Command {
    return (state, dispatch, view) => {
        // Check if we are already inside this list type
        const alreadyInList = isNodeActive(state, listType);

        if (alreadyInList) {
            // Lift the list item out of the list (unwrap)
            if (schema.nodes['list_item']) {
                return liftListItem(schema.nodes['list_item'])(state, dispatch, view);
            }
            return lift(state, dispatch);
        }

        // Wrap the current block in a list
        return wrapInList(listType)(state, dispatch);
    };
}

// ─── Blockquote Commands ──────────────────────────────────────────────────────

/**
 * Create a command that wraps/unwraps the current block in a blockquote.
 */
export function createToggleBlockquoteCommand(schema: Schema): Command {
    return (state, dispatch, view) => {
        if (!schema.nodes['blockquote']) return false;

        const alreadyInBlockquote = isNodeActive(state, schema.nodes['blockquote']!);

        if (alreadyInBlockquote) {
            return lift(state, dispatch);
        }

        return wrapIn(schema.nodes['blockquote']!)(state, dispatch, view);
    };
}

// ─── Text Alignment Commands ──────────────────────────────────────────────────

/**
 * Valid text alignment values
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Create a command that sets text alignment on the current paragraph.
 *
 * Alignment is stored as an attribute on the paragraph node.
 * See the paragraph NodeSpec in schema.ts.
 *
 * @param alignment - The alignment to apply
 */
export function createSetAlignmentCommand(alignment: TextAlignment): Command {
    return (state, dispatch) => {
        const { from, to } = state.selection;
        const schema = state.schema;

        if (!schema.nodes['paragraph']) return false;

        let applied = false;
        const tr = state.tr;

        // Apply alignment to all paragraph nodes in the selection
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type === schema.nodes['paragraph']) {
                tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    textAlign: alignment,
                });
                applied = true;
            }
        });

        if (!applied) return false;

        if (dispatch) dispatch(tr);
        return true;
    };
}

/**
 * Check if a specific text alignment is active at the current cursor position.
 */
export function isAlignmentActive(
    state: EditorState,
    alignment: TextAlignment,
): boolean {
    const { $from } = state.selection;

    // Walk up to find the nearest paragraph
    for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        if (node.type === state.schema.nodes['paragraph']) {
            const attrs = node.attrs as { textAlign: string | null };
            // 'left' is the default — either null or 'left' means left-aligned
            if (alignment === 'left') {
                return attrs.textAlign === null || attrs.textAlign === 'left';
            }
            return attrs.textAlign === alignment;
        }
    }

    return false;
}

// ─── Structural Commands ──────────────────────────────────────────────────────

/** Move the current selection or node up by joining with the node above */
export const joinUpCommand: Command = joinUp;

/** Move the current selection or node down by joining with the node below */
export const joinDownCommand: Command = joinDown;

/** Expand the selection to include the parent node */
export const selectParentCommand: Command = selectParentNode;

// ─── Content Commands ─────────────────────────────────────────────────────────

/**
 * Insert an arbitrary ProseMirror node at the current cursor position.
 *
 * @param nodeType - The type of node to insert
 * @param attrs    - Attributes for the new node
 */
export function createInsertNodeCommand(
    nodeType: NodeType,
    attrs?: Record<string, unknown>,
): Command {
    return (state, dispatch) => {
        if (dispatch) {
            const node = nodeType.createAndFill(attrs);
            if (!node) return false;

            dispatch(
                state.tr
                    .replaceSelectionWith(node)
                    .scrollIntoView(),
            );
        }
        return true;
    };
}

/**
 * Clear all formatting marks from the current selection.
 * Removes bold, italic, underline, color, font — every mark.
 */
export function clearFormattingCommand(schema: Schema): Command {
    return (state, dispatch) => {
        const { from, to } = state.selection;
        if (from === to) return false; // Nothing selected

        if (!dispatch) return true;

        const tr = state.tr;

        // Remove every registered mark type from the selection
        Object.values(schema.marks).forEach((markType) => {
            tr.removeMark(from, to, markType);
        });

        dispatch(tr);
        return true;
    };
}

// ─── View Utilities ───────────────────────────────────────────────────────────

/**
 * Focus the editor view programmatically.
 * Safe to call even when the view is not yet mounted.
 */
export function focusEditor(view: EditorView): void {
    if (!view.hasFocus()) {
        view.focus();
    }
}

/**
 * Scroll the current selection into the visible viewport.
 * Useful after programmatically setting content or moving the cursor.
 */
export function scrollSelectionIntoView(view: EditorView): void {
    view.dispatch(view.state.tr.scrollIntoView());
}