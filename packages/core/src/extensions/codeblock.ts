/**
 * codeblock.ts
 *
 * Code block node extension.
 *
 * Renders as <pre><code>. Preserves whitespace and uses a monospace font.
 * Supports an optional language attribute for syntax highlighting —
 * the editor does not bundle a syntax highlighter, but consumers can
 * integrate highlight.js or Prism by reading the language attribute
 * from the rendered DOM.
 *
 * Shortcut: Mod+Alt+C
 * Input rule: ``` (triple backtick) → code block
 *
 * Inside a code block:
 * - Enter creates a new line (not a new paragraph)
 * - Tab inserts spaces (not indents the block)
 * - All inline marks (bold, italic, etc.) are disabled
 */

import { InputRule } from 'prosemirror-inputrules';
import { setBlockType } from 'prosemirror-commands';
import { exitCode } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexNodeExtension } from '../types/extension.types';
import type { Command } from '../types/editor.types';
import { isNodeActive } from '../core/commands';

export const CodeBlock: NexNodeExtension = {
    name: 'code_block',
    type: 'node',
    priority: 100,

    nodeSpec: {
        group: 'block',

        // Code blocks contain only text — no inline marks allowed
        content: 'text*',

        // Marks are disabled inside code blocks
        marks: '',

        // defining: true means Enter inside a code block creates a new line
        // rather than splitting the block into two code blocks
        defining: true,

        // code: true tells ProseMirror this is a code node —
        // affects how text input and Enter are handled
        code: true,

        attrs: {
            // Optional programming language — for external syntax highlighters
            language: { default: null },
        },

        parseDOM: [
            {
                tag: 'pre',
                preserveWhitespace: 'full',
                getAttrs(dom) {
                    const pre = dom as HTMLPreElement;
                    const code = pre.querySelector('code');
                    // Read language from class="language-xxx" convention
                    const className = code?.className ?? '';
                    const langMatch = /language-(\w+)/.exec(className);
                    return { language: langMatch?.[1] ?? null };
                },
            },
        ],

        toDOM(node) {
            const { language } = node.attrs as { language: string | null };
            const codeAttrs = language
                ? { class: `language-${language}` }
                : {};

            return ['pre', ['code', codeAttrs, 0]];
        },
    },

    shortcuts(schema: Schema): Record<string, Command> {
        return {
            // Mod+Alt+C — toggle code block
            'Mod-Alt-c': setBlockType(schema.nodes['code_block']!),

            // Mod+Enter inside a code block — exit the block and create a paragraph below
            'Mod-Enter': exitCode,
        };
    },

    inputRules(schema: Schema) {
        return [
            // ``` → code block (with optional language: ```javascript)
            new InputRule(
                /^```(\w+)?\s$/,
                (state, match, start, end) => {
                    const nodeType = schema.nodes['code_block'];
                    if (!nodeType) return null;

                    const language = match[1] ?? null;
                    const tr = state.tr;

                    tr.delete(start, end).setBlockType(start, start, nodeType, { language });
                    return tr;
                },
            ),
        ];
    },

    toolbar: {
        id: 'code_block',
        label: 'Code Block',
        shortcutHint: 'Mod+Alt+C',
        icon: 'code-block',
        group: 'insert',

        isActive(state) {
            const nodeType = state.schema.nodes['code_block'];
            if (!nodeType) return false;
            return isNodeActive(state, nodeType);
        },

        isEnabled(state) {
            return !!state.schema.nodes['code_block'];
        },

        execute(view) {
            const nodeType = view.state.schema.nodes['code_block'];
            if (!nodeType) return;
            setBlockType(nodeType)(view.state, view.dispatch, view);
            view.focus();
        },
    },
};