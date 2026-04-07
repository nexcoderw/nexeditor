/**
 * schema.ts
 *
 * The ProseMirror document schema — the single source of truth for
 * what content is valid inside the editor.
 *
 * The schema defines two things:
 * 1. Nodes  — block-level and structural content (paragraphs, headings, images)
 * 2. Marks  — inline formatting applied to text ranges (bold, italic, links)
 *
 * Architecture decisions:
 * - The base schema is intentionally minimal — only paragraph and text
 * - Every other node and mark is added by extensions at runtime
 * - This keeps the core bundle small and makes every feature tree-shakeable
 * - Extensions register their NodeSpec and MarkSpec here via buildSchema()
 *
 * Security:
 * - The schema acts as a second validation layer after DOMPurify
 * - Any HTML element or attribute not defined in the schema is silently
 *   discarded by ProseMirror's parser — even if it survived sanitization
 * - This means a two-pass defense: DOMPurify strips dangerous HTML,
 *   the schema strips anything that is simply unknown
 */

import { Schema } from 'prosemirror-model';
import type { NodeSpec, MarkSpec, SchemaSpec } from 'prosemirror-model';
import type { NexExtension } from '../types/extension.types';

// ─── Base Node Specs ──────────────────────────────────────────────────────────

/**
 * The document root node.
 * Every ProseMirror document has exactly one doc node at the top level.
 * Its content expression 'block+' means it holds one or more block nodes.
 */
const docNode: NodeSpec = {
    content: 'block+',
};

/**
 * The paragraph node — the default block element.
 * Every editor starts with at least one paragraph.
 *
 * - group: 'block' — participates in the 'block+' content expression of doc
 * - content: 'inline*' — holds zero or more inline nodes (text, images)
 * - parseDOM: tells ProseMirror how to parse <p> tags from HTML
 * - toDOM: tells ProseMirror how to render this node back to the DOM
 */
const paragraphNode: NodeSpec = {
    group: 'block',
    content: 'inline*',

    // Paragraphs can carry inline alignment styles
    attrs: {
        textAlign: { default: null },
    },

    parseDOM: [
        {
            tag: 'p',
            getAttrs(dom) {
                const el = dom as HTMLElement;
                const align = el.style.textAlign || el.getAttribute('data-text-align');
                return { textAlign: align ?? null };
            },
        },
    ],

    toDOM(node) {
        const { textAlign } = node.attrs as { textAlign: string | null };
        const style = textAlign ? `text-align: ${textAlign}` : undefined;
        return ['p', style ? { style } : {}, 0];
    },
};

/**
 * The text node — represents a run of plain text.
 * This is the leaf node of all inline content.
 * ProseMirror requires this to be present in every schema.
 */
const textNode: NodeSpec = {
    group: 'inline',
};

/**
 * The hard break node — represents a <br> element.
 * Different from a paragraph break — stays within the same block.
 */
const hardBreakNode: NodeSpec = {
    inline: true,
    group: 'inline',
    selectable: false,

    parseDOM: [{ tag: 'br' }],

    toDOM() {
        return ['br'];
    },
};

// ─── Base Mark Specs ──────────────────────────────────────────────────────────

/**
 * No base marks are defined here.
 * All marks (bold, italic, link, etc.) are provided by extensions.
 * This keeps the base schema truly minimal.
 */

// ─── Schema Builder ───────────────────────────────────────────────────────────

/**
 * Collect NodeSpecs from all registered node extensions.
 * Extensions are sorted by priority (highest first) before processing.
 */
function collectNodeSpecs(
    extensions: NexExtension[],
): Record<string, NodeSpec> {
    const specs: Record<string, NodeSpec> = {};

    // Sort extensions by priority descending — higher priority registered first
    const sorted = [...extensions].sort(
        (a, b) => (b.priority ?? 100) - (a.priority ?? 100),
    );

    for (const ext of sorted) {
        if (ext.type === 'node') {
            // Guard against duplicate node names — second registration wins with a warning
            if (specs[ext.name]) {
                console.warn(
                    `[NexEditor] Duplicate node extension name: "${ext.name}". ` +
                    `The later registration will overwrite the earlier one.`,
                );
            }
            specs[ext.name] = ext.nodeSpec;
        }
    }

    return specs;
}

/**
 * Collect MarkSpecs from all registered mark extensions.
 * Same priority sorting as nodes.
 */
function collectMarkSpecs(
    extensions: NexExtension[],
): Record<string, MarkSpec> {
    const specs: Record<string, MarkSpec> = {};

    const sorted = [...extensions].sort(
        (a, b) => (b.priority ?? 100) - (a.priority ?? 100),
    );

    for (const ext of sorted) {
        if (ext.type === 'mark') {
            if (specs[ext.name]) {
                console.warn(
                    `[NexEditor] Duplicate mark extension name: "${ext.name}". ` +
                    `The later registration will overwrite the earlier one.`,
                );
            }
            specs[ext.name] = ext.markSpec;
        }
    }

    return specs;
}

/**
 * Build the complete ProseMirror Schema from the base nodes
 * plus all node/mark specs contributed by extensions.
 *
 * This function is called once when the editor mounts.
 * The resulting Schema is immutable — extensions cannot be added
 * or removed after the editor is initialized.
 *
 * Node ordering matters in ProseMirror:
 * - 'doc' must be first
 * - 'paragraph' must come before other block nodes
 * - 'text' must be present
 * - 'hard_break' should follow text
 *
 * @param extensions - All extensions registered by the consumer
 * @returns          - The compiled immutable ProseMirror Schema
 */
export function buildSchema(extensions: NexExtension[]): Schema {
    // Collect specs contributed by extensions
    const extensionNodes = collectNodeSpecs(extensions);
    const extensionMarks = collectMarkSpecs(extensions);

    // Build the SchemaSpec — node and mark order matters
    const schemaSpec: SchemaSpec = {
        nodes: {
            // ── Core nodes (always present) ────────────────────────────────────
            doc: docNode,
            paragraph: paragraphNode,
            text: textNode,
            hard_break: hardBreakNode,

            // ── Extension nodes (e.g. heading, image, table, code_block) ───────
            ...extensionNodes,
        },

        marks: {
            // ── Extension marks (e.g. bold, italic, link, color, font) ─────────
            // No base marks — all marks come from extensions
            ...extensionMarks,
        },
    };

    return new Schema(schemaSpec);
}

// ─── Schema Helpers ───────────────────────────────────────────────────────────

/**
 * Check whether a compiled schema has a node type with the given name.
 * Used by extensions and commands to guard against missing schema nodes.
 *
 * @example
 * if (!schemaHasNode(schema, 'heading')) {
 *   console.warn('Heading extension is not registered');
 *   return false;
 * }
 */
export function schemaHasNode(schema: Schema, name: string): boolean {
    return Object.prototype.hasOwnProperty.call(schema.nodes, name);
}

/**
 * Check whether a compiled schema has a mark type with the given name.
 *
 * @example
 * if (!schemaHasMark(schema, 'bold')) return false;
 */
export function schemaHasMark(schema: Schema, name: string): boolean {
    return Object.prototype.hasOwnProperty.call(schema.marks, name);
}