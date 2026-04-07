/**
 * list.ts
 *
 * Ordered and unordered list extensions.
 *
 * Three node types work together to form lists:
 * - bullet_list    — the <ul> wrapper
 * - ordered_list   — the <ol> wrapper
 * - list_item      — the <li> inside either list type
 *
 * All three must be registered together — ProseMirror's list schema
 * requires all three to be present for list operations to work correctly.
 *
 * Shortcuts:
 *   Mod+Shift+8 → toggle bullet list
 *   Mod+Shift+7 → toggle ordered list
 *   Tab         → indent list item (registered in keymap.ts)
 *   Shift+Tab   → unindent list item (registered in keymap.ts)
 *   Enter       → split list item (registered in keymap.ts)
 *
 * Input rules:
 *   - text → bullet list item (hyphen + space)
 *   1. text → ordered list item (number + period + space)
 */

import { InputRule } from 'prosemirror-inputrules';
import { wrappingInputRule } from 'prosemirror-inputrules';
import { wrapInList } from 'prosemirror-schema-list';
import type { Schema } from 'prosemirror-model';
import type { NexNodeExtension } from '../types/extension.types';
import type { Command } from '../types/editor.types';
import { isNodeActive, createToggleListCommand } from '../core/commands';

// ─── List Item ────────────────────────────────────────────────────────────────

/**
 * The list_item node — the <li> element.
 * Must be registered for bullet_list and ordered_list to function.
 */
export const ListItem: NexNodeExtension = {
    name: 'list_item',
    type: 'node',
    priority: 110, // Must be registered before the list wrapper nodes

    nodeSpec: {
        // list_item contains a paragraph followed by optional nested lists
        content: 'paragraph block*',

        // Defines this as a list item for ProseMirror's list commands
        defining: true,

        parseDOM: [{ tag: 'li' }],

        toDOM() {
            return ['li', 0];
        },
    },

    // No toolbar descriptor — list items are not directly toggled from toolbar
    // They are created automatically when a bullet_list or ordered_list is created
};

// ─── Bullet List ──────────────────────────────────────────────────────────────

export const BulletList: NexNodeExtension = {
    name: 'bullet_list',
    type: 'node',
    priority: 100,

    nodeSpec: {
        group: 'block',

        // A bullet list must contain one or more list_item nodes
        content: 'list_item+',

        parseDOM: [{ tag: 'ul' }],

        toDOM() {
            return ['ul', 0];
        },
    },

    shortcuts(schema: Schema): Record<string, Command> {
        return {
            // Mod+Shift+8 matches the * key on most keyboards — intuitive for bullets
            'Mod-Shift-8': createToggleListCommand(
                schema.nodes['bullet_list']!,
                schema,
            ),
        };
    },

    inputRules(schema: Schema) {
        return [
            // "- " or "* " at the start of a line → bullet list
            wrappingInputRule(
                /^\s*([-*])\s$/,
                schema.nodes['bullet_list']!,
            ),
        ];
    },

    toolbar: {
        id: 'bullet_list',
        label: 'Bullet List',
        shortcutHint: 'Mod+Shift+8',
        icon: 'list-bullet',
        group: 'format',

        isActive(state) {
            const nodeType = state.schema.nodes['bullet_list'];
            if (!nodeType) return false;
            return isNodeActive(state, nodeType);
        },

        isEnabled(state) {
            return !!state.schema.nodes['bullet_list'];
        },

        execute(view) {
            const nodeType = view.state.schema.nodes['bullet_list'];
            if (!nodeType) return;
            createToggleListCommand(nodeType, view.state.schema)(
                view.state,
                view.dispatch,
                view,
            );
            view.focus();
        },
    },
};

// ─── Ordered List ─────────────────────────────────────────────────────────────

export const OrderedList: NexNodeExtension = {
    name: 'ordered_list',
    type: 'node',
    priority: 100,

    nodeSpec: {
        group: 'block',
        content: 'list_item+',

        // The start attribute allows ordered lists to begin at any number
        attrs: { order: { default: 1 } },

        parseDOM: [
            {
                tag: 'ol',
                getAttrs(dom) {
                    const el = dom as HTMLElement;
                    const start = el.getAttribute('start');
                    return { order: start ? parseInt(start, 10) : 1 };
                },
            },
        ],

        toDOM(node) {
            const { order } = node.attrs as { order: number };
            // Only render start attribute when the list doesn't start at 1
            return order !== 1
                ? ['ol', { start: String(order) }, 0]
                : ['ol', 0];
        },
    },

    shortcuts(schema: Schema): Record<string, Command> {
        return {
            // Mod+Shift+7 — 7 is the & key, above which is typically used for lists
            'Mod-Shift-7': createToggleListCommand(
                schema.nodes['ordered_list']!,
                schema,
            ),
        };
    },

    inputRules(schema: Schema) {
        return [
            // "1. " at the start of a line → ordered list
            // Matches any digit followed by a period and space
            wrappingInputRule(
                /^(\d+)\.\s$/,
                schema.nodes['ordered_list']!,
                (match) => ({ order: parseInt(match[1] ?? '1', 10) }),
                (match, node) =>
                    node.childCount + (node.attrs as { order: number }).order ===
                    parseInt(match[1] ?? '1', 10),
            ),
        ];
    },

    toolbar: {
        id: 'ordered_list',
        label: 'Ordered List',
        shortcutHint: 'Mod+Shift+7',
        icon: 'list-ordered',
        group: 'format',

        isActive(state) {
            const nodeType = state.schema.nodes['ordered_list'];
            if (!nodeType) return false;
            return isNodeActive(state, nodeType);
        },

        isEnabled(state) {
            return !!state.schema.nodes['ordered_list'];
        },

        execute(view) {
            const nodeType = view.state.schema.nodes['ordered_list'];
            if (!nodeType) return;
            createToggleListCommand(nodeType, view.state.schema)(
                view.state,
                view.dispatch,
                view,
            );
            view.focus();
        },
    },
};