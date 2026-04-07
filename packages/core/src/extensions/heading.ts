/**
 * heading.ts
 *
 * Heading node extension — h1 through h6.
 *
 * Configurable: consumers choose which levels to enable.
 * Default is h1–h3 — most documents don't need deeper nesting.
 *
 * Shortcuts:  Mod+Alt+1 through Mod+Alt+6
 * Input rules: # text → h1, ## text → h2, etc. (Markdown style)
 *
 * Usage:
 *   extensions={[Heading]}                          // h1–h3 (default)
 *   extensions={[Heading.configure({ levels: [1,2] })]}  // h1 and h2 only
 */

import { InputRule } from 'prosemirror-inputrules';
import { setBlockType } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type {
    NexNodeExtension,
    ExtensionWithConfig,
} from '../types/extension.types';
import type { Command } from '../types/editor.types';
import { isNodeActive } from '../core/commands';

// ─── Config ───────────────────────────────────────────────────────────────────

export interface HeadingConfig {
    /**
     * Which heading levels to enable.
     * @default [1, 2, 3, 4, 5, 6]
     */
    levels: (1 | 2 | 3 | 4 | 5 | 6)[];
}

const DEFAULT_CONFIG: HeadingConfig = {
    levels: [1, 2, 3, 4, 5, 6],
};

// ─── Extension Factory ────────────────────────────────────────────────────────

function createHeadingExtension(config: HeadingConfig): NexNodeExtension {
    const { levels } = config;

    return {
        name: 'heading',
        type: 'node',
        priority: 100,

        nodeSpec: {
            // Headings live at the block level alongside paragraphs
            group: 'block',

            // Headings contain inline content (text + inline marks)
            content: 'inline*',

            // The level attribute determines h1–h6
            attrs: {
                level: { default: 1 },
                textAlign: { default: null },
            },

            defining: true,

            parseDOM: levels.map((level) => ({
                tag: `h${level}`,
                getAttrs(dom) {
                    const el = dom as HTMLElement;
                    const align = el.style.textAlign || null;
                    return { level, textAlign: align };
                },
            })),

            toDOM(node) {
                const { level, textAlign } = node.attrs as {
                    level: number;
                    textAlign: string | null;
                };
                const style = textAlign ? `text-align: ${textAlign}` : undefined;
                return [`h${level}`, style ? { style } : {}, 0];
            },
        },

        shortcuts(schema: Schema): Record<string, Command> {
            const shortcuts: Record<string, Command> = {};

            for (const level of levels) {
                // Mod+Alt+1 through Mod+Alt+6
                shortcuts[`Mod-Alt-${level}`] = setBlockType(
                    schema.nodes['heading']!,
                    { level },
                );
            }

            return shortcuts;
        },

        inputRules(schema: Schema) {
            // # → h1, ## → h2, ### → h3, etc.
            return levels.map(
                (level) =>
                    new InputRule(
                        // Match 1–6 # characters at the start of a line followed by a space
                        new RegExp(`^(#{${level}})\\s$`),
                        (state, _match, start, end) => {
                            const nodeType = schema.nodes['heading'];
                            if (!nodeType) return null;

                            const tr = state.tr;

                            // Replace the hashes and space with a heading block
                            tr.delete(start, end).setBlockType(
                                start,
                                start,
                                nodeType,
                                { level },
                            );

                            return tr;
                        },
                    ),
            );
        },

        toolbar: {
            id: 'heading',
            label: 'Heading',
            shortcutHint: 'Mod+Alt+1',
            icon: 'heading',
            group: 'text',

            isActive(state) {
                const nodeType = state.schema.nodes['heading'];
                if (!nodeType) return false;
                return isNodeActive(state, nodeType);
            },

            isEnabled(state) {
                return !!state.schema.nodes['heading'];
            },

            execute(view) {
                const nodeType = view.state.schema.nodes['heading'];
                if (!nodeType) return;
                // Default to h1 when triggered from toolbar without a specific level
                setBlockType(nodeType, { level: 1 })(
                    view.state,
                    view.dispatch,
                    view,
                );
                view.focus();
            },
        },
    };
}

// ─── Public Export ────────────────────────────────────────────────────────────

export const Heading: ExtensionWithConfig<HeadingConfig> = {
    configure(config: Partial<HeadingConfig> = {}) {
        return createHeadingExtension({ ...DEFAULT_CONFIG, ...config });
    },
};

// Default export — use without configure() for h1–h6
export const HeadingExtension = createHeadingExtension(DEFAULT_CONFIG);