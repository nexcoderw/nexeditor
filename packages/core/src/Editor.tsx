/**
 * Editor.tsx
 *
 * The root <NexEditor /> React component — the primary export of the package.
 *
 * Responsibilities:
 * - Renders the editor container div that ProseMirror mounts into
 * - Initializes the editor via useEditor()
 * - Wraps children in EditorProvider (context)
 * - Renders the default Toolbar unless toolbarSlot is provided
 * - Handles the "use client" boundary for Next.js App Router
 *
 * Next.js usage:
 * Since this component uses browser APIs, consumers using Next.js App Router
 * must either:
 * a) Add 'use client' to the file that imports <NexEditor /> (simplest)
 * b) Create a wrapper component with 'use client' and import it in a Server Component
 *
 * The component itself is marked 'use client' so it works correctly
 * when imported directly in App Router page files.
 *
 * @example Basic usage
 * <NexEditor
 *   content="<p>Hello world</p>"
 *   extensions={[Bold, Italic, Heading, Link]}
 *   onUpdate={(editor) => setValue(editor.getHTML())}
 * />
 *
 * @example With custom toolbar
 * <NexEditor extensions={[Bold, Italic]}>
 *   <MyCustomToolbar />
 * </NexEditor>
 *
 * @example Read-only mode
 * <NexEditor content={savedHTML} readOnly />
 */

'use client';

import { type ReactNode, type CSSProperties } from 'react';
import { useEditor } from './hooks/useEditor';
import { EditorProvider } from './ui/EditorContext';
import { Toolbar } from './ui/Toolbar/Toolbar';
import type { NexEditorOptions } from './types/editor.types';
import type { EditorTheme } from './types/editor.types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NexEditorProps extends NexEditorOptions {
    /**
     * Visual theme for the editor UI.
     * 'auto' follows the system prefers-color-scheme.
     * @default 'auto'
     */
    theme?: EditorTheme;

    /**
     * Additional CSS class names applied to the editor wrapper.
     * Use this to size the editor or override specific styles.
     */
    className?: string;

    /**
     * Inline styles applied to the editor wrapper element.
     */
    style?: CSSProperties;

    /**
     * Whether to show the built-in toolbar.
     * Set to false when providing a custom toolbar via children.
     * @default true
     */
    showToolbar?: boolean;

    /**
     * Minimum height of the editor content area.
     * @default '200px'
     */
    minHeight?: string;

    /**
     * Maximum height of the editor content area.
     * When content exceeds this height, the editor scrolls.
     * @default undefined (no max height)
     */
    maxHeight?: string;

    /**
     * Child components rendered inside the editor provider.
     * Use this to add custom UI components (toolbars, floating menus, etc.)
     * that need access to the editor context.
     */
    children?: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * The primary NexEditor component.
 *
 * Renders a fully functional rich text editor with toolbar.
 * All extensions, content, and callbacks are passed via props.
 */
export function NexEditor({
    theme = 'auto',
    className = '',
    style,
    showToolbar = true,
    minHeight = '200px',
    maxHeight,
    children,
    ...editorOptions
}: NexEditorProps): JSX.Element {
    const { containerRef, editor } = useEditor(editorOptions);

    // Build theme data attribute — CSS uses this for light/dark theming
    const themeAttr = theme === 'auto' ? undefined : theme;

    // Build the wrapper class list
    const wrapperClass = [
        'nex-editor-wrapper',
        className,
        editorOptions.readOnly ? 'nex-editor-wrapper--readonly' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <EditorProvider editor={editor}>
            <div
                className={wrapperClass}
                data-nex-theme={themeAttr}
                style={style}
            >
                {/* Built-in toolbar — hidden in readOnly mode */}
                {showToolbar && !editorOptions.readOnly && (
                    <Toolbar extensions={editorOptions.extensions ?? []} />
                )}

                {/* The ProseMirror editor mount point */}
                <div
                    ref={containerRef}
                    className="nex-editor-mount"
                    style={{
                        minHeight,
                        maxHeight,
                        // When maxHeight is set, enable scrolling
                        overflowY: maxHeight ? 'auto' : undefined,
                    }}
                />

                {/* Consumer-provided child components (custom toolbars, menus, etc.) */}
                {children}
            </div>
        </EditorProvider>
    );
}