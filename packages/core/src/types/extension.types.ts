/**
 * extension.types.ts
 *
 * Defines the extension system API — the contract every feature module must
 * implement. Extensions are the mechanism through which all editor capabilities
 * are added: bold, italic, tables, links, images, Google Fonts, etc.
 *
 * Architecture:
 * - Extensions are plain objects, not classes — easier to test and compose
 * - Three kinds: mark (inline formatting), node (block content), functional (behaviour)
 * - Each extension is fully self-contained — it declares its schema, shortcuts,
 *   input rules, and toolbar presence in one place
 * - Tree-shakeable by design — unused extensions are eliminated at build time
 */

import type { Schema, MarkSpec, NodeSpec } from 'prosemirror-model';
import type { Plugin, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { InputRule } from 'prosemirror-inputrules';
import type { Command } from './editor.types';

// ─── Extension Kinds ──────────────────────────────────────────────────────────

/** The three categories of extensions */
export type ExtensionType = 'mark' | 'node' | 'functional';

// ─── Base ─────────────────────────────────────────────────────────────────────

/**
 * Fields shared by all extension types.
 */
export interface NexExtensionBase {
    /**
     * Unique name for this extension.
     * Used as the ProseMirror mark or node name — must be snake_case.
     * @example 'bold', 'heading', 'code_block'
     */
    name: string;

    /** Which kind of extension this is */
    type: ExtensionType;

    /**
     * Processing priority — higher runs first.
     * Use this to ensure one extension's schema is registered before another's.
     * @default 100
     */
    priority?: number;
}

// ─── Mark Extension ───────────────────────────────────────────────────────────

/**
 * A Mark extension adds inline formatting to text.
 *
 * Examples: bold, italic, underline, strikethrough, link, color, font-family.
 *
 * Marks wrap around text ranges and can overlap (text can be both bold AND italic).
 */
export interface NexMarkExtension extends NexExtensionBase {
    type: 'mark';

    /**
     * ProseMirror MarkSpec — defines how the mark is represented in the schema,
     * what DOM element it renders as, and how it parses from HTML.
     */
    markSpec: MarkSpec;

    /**
     * Keyboard shortcut to toggle this mark.
     * 'Mod' maps to Cmd on macOS and Ctrl on Windows/Linux.
     * @example 'Mod-b' for bold, 'Mod-i' for italic
     */
    shortcut?: string;

    /**
     * Returns the command that toggles this mark on/off.
     * Receives the compiled schema so it can reference the correct mark type.
     */
    toggleCommand?: (schema: Schema) => Command;

    /**
     * Input rules — automatically apply this mark when a text pattern is typed.
     * @example Typing **text** auto-applies bold and removes the asterisks
     */
    inputRules?: (schema: Schema) => InputRule[];

    /**
     * Describes how this mark appears in the toolbar.
     * Omit if this mark should not have a toolbar button.
     */
    toolbar?: ToolbarItemDescriptor;
}

// ─── Node Extension ───────────────────────────────────────────────────────────

/**
 * A Node extension adds block-level or structural content to the document.
 *
 * Examples: paragraph, heading, image, code block, table, bullet list.
 *
 * Nodes form the document tree structure. Unlike marks, they cannot overlap.
 */
export interface NexNodeExtension extends NexExtensionBase {
    type: 'node';

    /**
     * ProseMirror NodeSpec — defines the node's schema, allowed content,
     * DOM rendering, and HTML parsing rules.
     */
    nodeSpec: NodeSpec;

    /**
     * Keyboard shortcuts for node-specific actions.
     * Key is the shortcut string, value is the command.
     * @example { 'Mod-Alt-1': setHeadingLevel(1) }
     */
    shortcuts?: (schema: Schema) => Record<string, Command>;

    /**
     * Input rules for this node type.
     * @example Typing '# ' at the start of a line converts it to a heading
     */
    inputRules?: (schema: Schema) => InputRule[];

    /**
     * Describes how this node type appears in the toolbar.
     * Omit if this node should not have a toolbar button.
     */
    toolbar?: ToolbarItemDescriptor;
}

// ─── Functional Extension ─────────────────────────────────────────────────────

/**
 * A Functional extension adds editor behaviour without modifying the schema.
 *
 * Examples: history (undo/redo), placeholder text, drop cursor,
 * gap cursor, paste handlers, collaboration (future).
 *
 * These are pure ProseMirror plugins wrapped in our extension API.
 */
export interface NexFunctionalExtension extends NexExtensionBase {
    type: 'functional';

    /**
     * Returns one or more ProseMirror plugins.
     * Receives the compiled schema in case the plugin needs to reference node/mark types.
     */
    plugins: (schema: Schema) => Plugin[];
}

// ─── Union ────────────────────────────────────────────────────────────────────

/** Any valid extension — use this type in arrays and function parameters */
export type NexExtension = NexMarkExtension | NexNodeExtension | NexFunctionalExtension;

// ─── Configurable Extension ───────────────────────────────────────────────────

/**
 * An extension that accepts configuration options.
 * The configure() method returns a fully resolved NexExtension.
 *
 * @example
 * const HeadingExtension: ExtensionWithConfig<HeadingConfig> = {
 *   configure: (config) => ({ ...baseHeading, ...config })
 * }
 *
 * // Consumer usage:
 * extensions={[Heading.configure({ levels: [1, 2, 3] })]}
 */
export interface ExtensionWithConfig<TConfig extends Record<string, unknown>> {
    configure: (config: Partial<TConfig>) => NexExtension;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

/**
 * Describes a toolbar button that an extension declares.
 * The Toolbar component reads these to build itself dynamically.
 */
export interface ToolbarItemDescriptor {
    /** Unique ID — used as the React key and for aria labelling */
    id: string;

    /** Human-readable label — shown in tooltip and used for accessibility */
    label: string;

    /**
     * Keyboard shortcut hint shown in the tooltip.
     * Display-only — the actual shortcut is registered separately via keymap.
     * @example 'Mod+B'
     */
    shortcutHint?: string;

    /**
     * Returns true when the cursor is inside content where this mark/node is active.
     * Used to visually highlight the toolbar button when, e.g., cursor is in bold text.
     */
    isActive: (state: EditorState) => boolean;

    /**
     * Returns true when this action is applicable in the current context.
     * A disabled button is shown greyed out and is not clickable.
     */
    isEnabled: (state: EditorState) => boolean;

    /**
     * Execute the toolbar action on the given view.
     * Typically calls the extension's toggleCommand or a custom command.
     */
    execute: (view: EditorView) => void;

    /**
     * Icon identifier — maps to an SVG icon in the Toolbar icon registry.
     * @example 'bold', 'italic', 'heading-1', 'link'
     */
    icon: string;

    /**
     * Visual group in the toolbar.
     * Items in the same group are separated from other groups by a divider.
     */
    group: 'text' | 'format' | 'insert' | 'media' | 'misc';
}