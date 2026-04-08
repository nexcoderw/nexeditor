/**
 * index.ts
 *
 * The public API of @nexcode/editor.
 *
 * Rules for this file:
 * 1. Only export what a consumer actually needs — nothing internal
 * 2. Every export here is a public API commitment — breaking changes
 *    require a major version bump (semver)
 * 3. Type exports use `export type` — required for verbatimModuleSyntax
 *    and ensures types are erased at build time (no runtime cost)
 * 4. Group exports by category with clear section headers
 * 5. No star re-exports (export * from) — they make the API surface
 *    unpredictable and break tree-shaking in some bundlers
 *
 * Import order for consumers:
 *   import '@nexcode/editor/styles';           ← CSS (required)
 *   import { NexEditor, Bold, Italic } from '@nexcode/editor';
 */

// ─── Root Component ───────────────────────────────────────────────────────────

/**
 * The primary editor component.
 * Drop this into any React or Next.js application to get a full editor.
 *
 * @example
 * import { NexEditor } from '@nexcode/editor';
 *
 * <NexEditor
 *   content="<p>Hello world</p>"
 *   extensions={[Bold, Italic, Heading]}
 *   onUpdate={(editor) => console.log(editor.getHTML())}
 * />
 */
export { NexEditor } from './Editor';
export type { NexEditorProps } from './Editor';

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useEditor — initialize the editor imperatively without the <NexEditor /> component.
 * Use this when you need full control over the editor's container element.
 *
 * @example
 * const { containerRef, editor } = useEditor({
 *   extensions: [Bold, Italic],
 *   onUpdate: (e) => setValue(e.getHTML()),
 * });
 * return <div ref={containerRef} />;
 */
export { useEditor } from './hooks/useEditor';
export type { UseEditorReturn } from './hooks/useEditor';

/**
 * useEditorState — subscribe to editor state changes inside custom components.
 * Returns the current ProseMirror EditorState on every transaction.
 *
 * @example
 * const state = useEditorState(editor);
 * const isBold = state ? isMarkActive(state, state.schema.marks.bold) : false;
 */
export { useEditorState } from './hooks/useEditorState';

/**
 * useFontLoader — manage Google Font loading state in custom UI.
 */
export { useFontLoader } from './hooks/useFontLoader';
export type { UseFontLoaderReturn } from './hooks/useFontLoader';

/**
 * useNexEditorContext — access the editor instance from within <NexEditor /> children.
 * Returns null if called outside of an EditorProvider.
 *
 * @example
 * function MyButton() {
 *   const editor = useNexEditorContext();
 *   if (!editor) return null;
 *   return <button onClick={() => editor.focus()}>Focus</button>;
 * }
 */
export { useNexEditorContext } from './ui/EditorContext';

// ─── UI Components ────────────────────────────────────────────────────────────

/**
 * Toolbar — the default formatting toolbar.
 * Rendered automatically by <NexEditor /> unless showToolbar={false}.
 * Export this if you want to render the toolbar in a custom position.
 */
export { Toolbar } from './ui/Toolbar/Toolbar';
export { ToolbarButton } from './ui/Toolbar/ToolbarButton';
export { ToolbarIcon } from './ui/Toolbar/ToolbarIcon';
export type { ToolbarProps } from './ui/Toolbar/Toolbar';
export type { ToolbarButtonProps } from './ui/Toolbar/ToolbarButton';

/**
 * BubbleMenu — contextual toolbar that appears above text selections.
 * Add this as a child of <NexEditor /> to enable it.
 *
 * @example
 * <NexEditor extensions={[Bold, Italic, Link]}>
 *   <BubbleMenu extensions={[Bold, Italic, Link]} />
 * </NexEditor>
 */
export { BubbleMenu } from './ui/BubbleMenu/BubbleMenu';
export type { BubbleMenuProps } from './ui/BubbleMenu/BubbleMenu';

/**
 * FloatingMenu — insert menu that appears on empty paragraphs.
 */
export { FloatingMenu } from './ui/FloatingMenu/FloatingMenu';
export type { FloatingMenuProps } from './ui/FloatingMenu/FloatingMenu';

/**
 * FontPicker — Google Fonts selector dropdown.
 * Renders in the toolbar automatically when the Font extension is registered.
 * Export this if you want to embed it in a custom toolbar.
 */
export { FontPicker } from './ui/FontPicker/FontPicker';
export type { FontPickerProps } from './ui/FontPicker/FontPicker';

/**
 * LinkPopover — dialog for inserting and editing hyperlinks.
 * Renders inside <NexEditor /> automatically when the Link extension is registered.
 */
export { LinkPopover } from './ui/LinkPopover/LinkPopover';
export type { LinkPopoverProps } from './ui/LinkPopover/LinkPopover';

/**
 * ColorPicker — text color and highlight color selector.
 */
export { ColorPicker } from './ui/ColorPicker/ColorPicker';
export type { ColorPickerProps } from './ui/ColorPicker/ColorPicker';

/**
 * TableControls — table insert dialog and context menu.
 */
export { TableControls } from './ui/TableControls/TableControls';
export type { TableControlsProps } from './ui/TableControls/TableControls';

// ─── Extensions ───────────────────────────────────────────────────────────────

/**
 * Inline formatting marks.
 *
 * @example
 * extensions={[Bold, Italic, Underline, Strike]}
 */
export { Bold } from './extensions/bold';
export { Italic } from './extensions/italic';
export { Underline } from './extensions/underline';
export { Strike } from './extensions/strike';

/**
 * Text color and highlight marks.
 *
 * @example
 * extensions={[TextColor, Highlight]}
 */
export { TextColor, Highlight } from './extensions/color';
export { applyTextColor, removeTextColor, applyHighlight, removeHighlight } from './extensions/color';

/**
 * Link mark — insert validated hyperlinks.
 *
 * @example
 * extensions={[Link]}
 */
export { Link } from './extensions/link';
export { insertLink, removeLink, getLinkAtCursor } from './extensions/link';

/**
 * Block node extensions.
 *
 * @example
 * extensions={[
 *   Paragraph,
 *   Heading.configure({ levels: [1, 2, 3] }),
 * ]}
 */
export { Paragraph } from './extensions/paragraph';
export { Heading, HeadingExtension } from './extensions/heading';
export type { HeadingConfig } from './extensions/heading';

/**
 * List extensions — always register all three together.
 *
 * @example
 * extensions={[BulletList, OrderedList, ListItem]}
 */
export { BulletList, OrderedList, ListItem } from './extensions/list';

/**
 * Image node — insert images by URL.
 *
 * @example
 * extensions={[Image]}
 * // Then insert programmatically:
 * insertImage(editor.view, { src: 'https://...', alt: 'Description' });
 */
export { Image } from './extensions/image';
export { insertImage } from './extensions/image';
export type { InsertImageOptions } from './extensions/image';

/**
 * Code block node.
 *
 * @example
 * extensions={[CodeBlock]}
 */
export { CodeBlock } from './extensions/codeblock';

/**
 * Table extensions — register all four together.
 *
 * @example
 * extensions={[Table, TableRow, TableCell, TableHeader]}
 * // Then insert programmatically:
 * insertTable(editor.view, 3, 3, true);
 */
export { Table, TableRow, TableCell, TableHeader } from './extensions/table';
export { insertTable } from './extensions/table';

/**
 * Table commands — re-exported from prosemirror-tables.
 * Consumers get these without a direct prosemirror-tables dependency.
 */
export {
    addRowAfter,
    addRowBefore,
    addColumnAfter,
    addColumnBefore,
    deleteRow,
    deleteColumn,
    deleteTable,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
} from './extensions/table';

/**
 * Google Fonts extension — applies font-family marks and loads fonts.
 *
 * @example
 * extensions={[FontFamily]}
 */
export { FontFamily, DEFAULT_FONTS } from './extensions/font';
export { loadFont, applyFont, removeFont, isFontLoaded } from './extensions/font';

// ─── Core Utilities ───────────────────────────────────────────────────────────

/**
 * Schema builder — for advanced consumers who build a custom schema.
 */
export { buildSchema, schemaHasNode, schemaHasMark } from './core/schema';

/**
 * Editor commands — reusable ProseMirror command factories.
 * Import these to build custom toolbar buttons or keyboard shortcuts.
 *
 * @example
 * import { isMarkActive, createToggleMarkCommand } from '@nexcode/editor';
 */
export {
    // Mark utilities
    isMarkActive,
    isMarkActiveAcrossSelection,
    createToggleMarkCommand,

    // Node utilities
    isNodeActive,
    createSetBlockTypeCommand,

    // List utilities
    createToggleListCommand,

    // Blockquote
    createToggleBlockquoteCommand,

    // Text alignment
    createSetAlignmentCommand,
    isAlignmentActive,

    // Content
    clearFormattingCommand,
    createInsertNodeCommand,

    // History
    undoCommand,
    redoCommand,

    // View utilities
    focusEditor,
    scrollSelectionIntoView,
} from './core/commands';

export type { TextAlignment } from './core/commands';

// ─── Security Utilities ───────────────────────────────────────────────────────

/**
 * Security helpers — exported so consumers can use the same
 * sanitization layer in their own upload handlers, API routes, etc.
 *
 * @example
 * // In a Next.js API route that accepts HTML from a form:
 * import { sanitizeHTML, isURLSafe } from '@nexcode/editor';
 * const safe = sanitizeHTML(req.body.content);
 */
export { sanitizeHTML, sanitizeURL, isURLSafe } from './security/sanitizer';
export {
    validateFontFamily,
    validateColor,
    validateFontSize,
    validateContent,
    validateURL,
    validateProseMirrorJSON,
} from './security/validator';

/**
 * CSP helpers — for Next.js consumers configuring Content Security Policy.
 *
 * @example
 * // next.config.js
 * import { buildNextJSCSPHeader } from '@nexcode/editor';
 * headers: [buildNextJSCSPHeader({ nonce })]
 */
export {
    getEditorCSPDirectives,
    buildEditorCSP,
    buildNextJSCSPHeader,
    EDITOR_EXTERNAL_DOMAINS,
} from './security/csp';
export type {
    EditorCSPDirectives,
    BuildCSPOptions,
} from './security/csp';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Editor types — import these for type-safe integration.
 *
 * @example
 * import type { NexEditorInstance, NexEditorOptions } from '@nexcode/editor';
 */
export type {
    NexEditorInstance,
    NexEditorOptions,
    Dispatch,
    Command,
    NexSchema,
    EditorTheme,
    EditorContextValue,
} from './types/editor.types';

/**
 * Extension types — import these to build custom extensions.
 *
 * @example
 * import type { NexMarkExtension, ToolbarItemDescriptor } from '@nexcode/editor';
 *
 * const MyMark: NexMarkExtension = {
 *   name: 'my_mark',
 *   type: 'mark',
 *   markSpec: { ... },
 * };
 */
export type {
    NexExtension,
    NexMarkExtension,
    NexNodeExtension,
    NexFunctionalExtension,
    ExtensionType,
    ExtensionWithConfig,
    ToolbarItemDescriptor,
} from './types/extension.types';

/**
 * Font types — import these to configure the font system.
 *
 * @example
 * import type { NexFont, FontPickerConfig } from '@nexcode/editor';
 */
export type {
    NexFont,
    FontCategory,
    FontWeight,
    ValidatedFontFamily,
    FontLoadStatus,
    FontLoaderState,
    FontLoadResult,
    FontPickerConfig,
    GoogleFontsURLParams,
} from './types/font.types';