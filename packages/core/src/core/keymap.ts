/**
 * keymap.ts
 *
 * Builds the complete keyboard shortcut map for the editor.
 *
 * Keyboard shortcut sources (applied in priority order):
 * 1. Extension shortcuts — each extension declares its own shortcuts
 * 2. Base shortcuts — built-in ProseMirror commands (undo, redo, enter, etc.)
 *
 * 'Mod' in shortcut strings maps to:
 * - Cmd  on macOS
 * - Ctrl on Windows and Linux
 * ProseMirror handles this cross-platform mapping automatically.
 *
 * Shortcut conflicts:
 * If two extensions register the same shortcut, the one with higher
 * priority wins. A console warning is emitted for conflicts so
 * developers catch them during development.
 */

import { keymap } from 'prosemirror-keymap';
import { baseKeymap, chainCommands } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import {
    splitListItem,
    liftListItem,
    sinkListItem,
} from 'prosemirror-schema-list';
import type { Plugin } from 'prosemirror-state';
import type { Schema } from 'prosemirror-model';
import type { Command } from '../types/editor.types';
import type { NexExtension } from '../types/extension.types';

// ─── Base Shortcuts ───────────────────────────────────────────────────────────

/**
 * Build the base keymap that is always present regardless of extensions.
 *
 * These are fundamental editor shortcuts that consumers expect to work
 * out of the box without registering any extensions.
 */
function buildBaseKeymap(schema: Schema): Record<string, Command> {
    const keys: Record<string, Command> = {
        // ── History ──────────────────────────────────────────────────────────
        'Mod-z': undo,
        'Mod-y': redo,                  // Windows convention
        'Mod-Shift-z': redo,            // macOS convention

        // ── Hard break ───────────────────────────────────────────────────────
        // Shift+Enter inserts a <br> within the current block
        // instead of creating a new paragraph
        'Shift-Enter': chainCommands(
            (state, dispatch) => {
                if (!schema.nodes['hard_break']) return false;
                if (dispatch) {
                    dispatch(
                        state.tr
                            .replaceSelectionWith(schema.nodes['hard_break']!.create())
                            .scrollIntoView(),
                    );
                }
                return true;
            },
        ),

        // ── Selection ────────────────────────────────────────────────────────
        // Select all content in the editor
        'Mod-a': (state, dispatch) => {
            if (dispatch) {
                dispatch(
                    state.tr.setSelection(
                        // Select from the very start to the very end of the document
                        import('prosemirror-state').then(() => {
                            // This is handled by the base keymap below — kept for documentation
                            return state.tr;
                        }) as unknown as import('prosemirror-state').Transaction,
                    ),
                );
            }
            return false; // Fall through to baseKeymap's Mod-a
        },
    };

    // Add list-specific shortcuts only when list nodes are in the schema
    if (schema.nodes['list_item']) {
        const listItem = schema.nodes['list_item']!;

        // Enter inside a list item: split the list item into two
        keys['Enter'] = splitListItem(listItem);

        // Tab inside a list item: indent (sink) the item one level
        keys['Tab'] = sinkListItem(listItem);

        // Shift+Tab inside a list item: unindent (lift) the item one level
        keys['Shift-Tab'] = liftListItem(listItem);
    }

    return keys;
}

// ─── Extension Shortcuts ──────────────────────────────────────────────────────

/**
 * Collect keyboard shortcuts from all extensions that declare them.
 * Extensions are sorted by priority before collection so higher-priority
 * extensions win conflicts.
 */
function collectExtensionKeymap(
    extensions: NexExtension[],
    schema: Schema,
): Record<string, Command> {
    const collected: Record<string, Command> = {};

    // Sort by priority descending — highest priority processes first
    const sorted = [...extensions].sort(
        (a, b) => (b.priority ?? 100) - (a.priority ?? 100),
    );

    for (const ext of sorted) {
        // Mark extensions declare a single shortcut via the `shortcut` field
        if (ext.type === 'mark' && ext.shortcut && ext.toggleCommand) {
            if (collected[ext.shortcut]) {
                console.warn(
                    `[NexEditor] Keyboard shortcut conflict: "${ext.shortcut}" ` +
                    `is claimed by multiple extensions. Higher priority wins.`,
                );
            } else {
                collected[ext.shortcut] = ext.toggleCommand(schema);
            }
        }

        // Node extensions declare a shortcuts map via the `shortcuts` field
        if (ext.type === 'node' && ext.shortcuts) {
            const nodeShortcuts = ext.shortcuts(schema);

            for (const [key, command] of Object.entries(nodeShortcuts)) {
                if (collected[key]) {
                    console.warn(
                        `[NexEditor] Keyboard shortcut conflict: "${key}" ` +
                        `is claimed by multiple extensions. Higher priority wins.`,
                    );
                } else {
                    collected[key] = command;
                }
            }
        }
    }

    return collected;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the complete keymap plugin for the editor.
 *
 * Returns two plugins:
 * 1. Extension keymap — shortcuts from all registered extensions
 * 2. Base keymap — ProseMirror's built-in sensible defaults
 *    (Enter to split paragraphs, Backspace to delete, etc.)
 *
 * Plugin order matters — extension keymap is checked first.
 * If an extension handles a key, the base keymap is not consulted.
 *
 * @param extensions - All registered extensions
 * @param schema     - The compiled editor schema
 * @returns          - Array of keymap plugins to add to the editor
 */
export function buildKeymap(
    extensions: NexExtension[],
    schema: Schema,
): Plugin[] {
    const extensionKeys = collectExtensionKeymap(extensions, schema);
    const baseKeys = buildBaseKeymap(schema);

    return [
        // Extension shortcuts take priority
        keymap(extensionKeys),

        // Base shortcuts — handles Enter, Backspace, arrow keys, etc.
        keymap(baseKeys),

        // ProseMirror's built-in base keymap — handles the rest
        keymap(baseKeymap),
    ];
}