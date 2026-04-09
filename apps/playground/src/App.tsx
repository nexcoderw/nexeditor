/**
 * App.tsx
 *
 * The playground application.
 *
 * This is a comprehensive demo of @nexcode/editor that:
 * - Shows all available extensions in action
 * - Demonstrates theme switching (light / dark / auto)
 * - Shows the BubbleMenu and FloatingMenu in use
 * - Provides a live HTML/JSON output panel for developers
 * - Tests read-only mode
 * - Demonstrates setContent() and clearContent() APIs
 *
 * This file is intentionally verbose — it serves as living documentation
 * showing developers exactly how to integrate the editor.
 */

'use client';

import { useState, useCallback } from 'react';

// Import the editor CSS before the component
import '@nexcode/editor/styles';

import {
    NexEditor,
    BubbleMenu,
    FloatingMenu,

    // Extensions
    Bold,
    Italic,
    Underline,
    Strike,
    Heading,
    Paragraph,
    BulletList,
    OrderedList,
    ListItem,
    Link,
    Image,
    CodeBlock,
    Table,
    TableRow,
    TableCell,
    TableHeader,
    TextColor,
    Highlight,
    FontFamily,
    FontSize,

    // Types
    type NexEditorInstance,
    type EditorTheme,
} from '@nexcode/editor';

// ─── Extension Set ────────────────────────────────────────────────────────────

/**
 * All extensions enabled in the playground.
 * This is a kitchen-sink configuration — real apps would use a subset.
 */
const EXTENSIONS = [
    // Inline marks
    Bold,
    Italic,
    Underline,
    Strike,
    TextColor,
    Highlight,
    Link,
    FontFamily,
    FontSize,

    // Block nodes
    Paragraph,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    BulletList,
    OrderedList,
    ListItem,
    CodeBlock,
    Image,

    // Tables
    Table,
    TableRow,
    TableCell,
    TableHeader,
];

// ─── Initial Content ──────────────────────────────────────────────────────────

const INITIAL_CONTENT = `
<h1>Welcome to NexEditor</h1>
<p>
  A production-grade, secure rich text editor for <strong>React</strong> and
  <strong>Next.js</strong>. Built on ProseMirror with Google Fonts integration.
</p>

<h2>Features</h2>
<ul>
  <li><strong>Security first</strong> — all HTML is sanitized via DOMPurify</li>
  <li><strong>Google Fonts</strong> — full bundled catalog with lazy-loaded previews</li>
  <li><strong>Font size control</strong> — adjust text size with the toolbar stepper</li>
  <li><strong>Fully accessible</strong> — ARIA labels, keyboard navigation, focus management</li>
  <li><strong>Theme aware</strong> — light, dark, and auto (system preference) modes</li>
  <li><strong>Next.js ready</strong> — SSR safe, "use client" boundary handled for you</li>
</ul>

<h2>Try the editor</h2>
<p>
  Select this text and use the <strong>bubble menu</strong> that appears above.
  Click on an empty line to see the <strong>floating menu</strong>.
</p>

<blockquote>
  "The best editor is the one that gets out of the way." — NexCode Africa
</blockquote>

<h3>Code example</h3>
<pre><code class="language-typescript">import { NexEditor, Bold, Italic } from '@nexcode/editor';

export default function MyEditor() {
  return (
    &lt;NexEditor
      extensions={[Bold, Italic]}
      onUpdate={(editor) =&gt; console.log(editor.getHTML())}
    /&gt;
  );
}</code></pre>
`;

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
    const [theme, setTheme] = useState<EditorTheme>('auto');
    const [outputMode, setOutputMode] = useState<'html' | 'json'>('html');
    const [output, setOutput] = useState<string>('');
    const [editorInstance, setEditorInstance] = useState<NexEditorInstance | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    // Called every time the document changes
    const handleUpdate = useCallback((editor: NexEditorInstance) => {
        // Update live output panel
        if (outputMode === 'html') {
            setOutput(editor.getHTML());
        } else {
            setOutput(JSON.stringify(editor.getJSON(), null, 2));
        }

        // Update word count
        const text = editor.getText();
        const words = text.trim().split(/\s+/).filter(Boolean);
        setWordCount(words.length);
    }, [outputMode]);

    const handleReady = useCallback((editor: NexEditorInstance) => {
        setEditorInstance(editor);
        // Set initial output
        setOutput(editor.getHTML());
    }, []);

    // Manual API actions (for the demo buttons)
    const handleSetContent = useCallback(() => {
        editorInstance?.setContent('<p>Content was replaced via <code>setContent()</code> API.</p>');
    }, [editorInstance]);

    const handleClearContent = useCallback(() => {
        editorInstance?.clearContent();
    }, [editorInstance]);

    const handleFocus = useCallback(() => {
        editorInstance?.focus();
    }, [editorInstance]);

    return (
        <div style={styles.app}>
            {/* ── Page header ──────────────────────────────────────────────────── */}
            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <div style={styles.brand}>
                        <span style={styles.brandName}>NexEditor</span>
                        <span style={styles.brandTag}>by NexCode Africa</span>
                    </div>

                    <nav style={styles.nav}>
                        {/* Theme switcher */}
                        <div style={styles.navGroup}>
                            <span style={styles.navLabel}>Theme:</span>
                            {(['light', 'dark', 'auto'] as EditorTheme[]).map((t) => (
                                <button
                                    key={t}
                                    style={{
                                        ...styles.navButton,
                                        ...(theme === t ? styles.navButtonActive : {}),
                                    }}
                                    onClick={() => setTheme(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Read-only toggle */}
                        <label style={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={isReadOnly}
                                onChange={(e) => setIsReadOnly(e.target.checked)}
                                style={styles.toggleInput}
                            />
                            <span style={styles.toggleLabel}>Read-only</span>
                        </label>
                    </nav>
                </div>
            </header>

            {/* ── Main layout ──────────────────────────────────────────────────── */}
            <main style={styles.main}>
                {/* ── Editor panel ─────────────────────────────────────────────── */}
                <div style={styles.editorPanel}>

                    {/* Status bar */}
                    <div style={styles.statusBar}>
                        <span style={styles.statusItem}>
                            {wordCount} {wordCount === 1 ? 'word' : 'words'}
                        </span>
                        {isReadOnly && (
                            <span style={styles.readOnlyBadge}>Read-only</span>
                        )}
                    </div>

                    {/* The editor */}
                    <NexEditor
                        content={INITIAL_CONTENT}
                        extensions={EXTENSIONS}
                        theme={theme}
                        readOnly={isReadOnly}
                        placeholder="Start writing something amazing..."
                        minHeight="400px"
                        onUpdate={handleUpdate}
                        onReady={handleReady}
                        onFocus={() => console.log('[Playground] Editor focused')}
                        onBlur={() => console.log('[Playground] Editor blurred')}
                    >
                        {/* BubbleMenu — appears above text selections */}
                        <BubbleMenu
                            extensions={[Bold, Italic, Underline, Strike, Link, TextColor]}
                        />

                        {/* FloatingMenu — appears on empty paragraphs */}
                        <FloatingMenu
                            extensions={[Heading.configure({ levels: [1, 2, 3] }), CodeBlock, Image]}
                        />
                    </NexEditor>

                    {/* API controls */}
                    <div style={styles.apiControls}>
                        <span style={styles.apiLabel}>API:</span>
                        <button style={styles.apiButton} onClick={handleSetContent}>
                            setContent()
                        </button>
                        <button style={styles.apiButton} onClick={handleClearContent}>
                            clearContent()
                        </button>
                        <button style={styles.apiButton} onClick={handleFocus}>
                            focus()
                        </button>
                    </div>
                </div>

                {/* ── Output panel ─────────────────────────────────────────────── */}
                <div style={styles.outputPanel}>
                    <div style={styles.outputHeader}>
                        <span style={styles.outputTitle}>Live Output</span>

                        <div style={styles.outputTabs}>
                            <button
                                style={{
                                    ...styles.outputTab,
                                    ...(outputMode === 'html' ? styles.outputTabActive : {}),
                                }}
                                onClick={() => {
                                    setOutputMode('html');
                                    if (editorInstance) {
                                        setOutput(editorInstance.getHTML());
                                    }
                                }}
                            >
                                HTML
                            </button>
                            <button
                                style={{
                                    ...styles.outputTab,
                                    ...(outputMode === 'json' ? styles.outputTabActive : {}),
                                }}
                                onClick={() => {
                                    setOutputMode('json');
                                    if (editorInstance) {
                                        setOutput(JSON.stringify(editorInstance.getJSON(), null, 2));
                                    }
                                }}
                            >
                                JSON
                            </button>
                        </div>
                    </div>

                    <pre style={styles.outputContent}>
                        <code>{output || '(empty)'}</code>
                    </pre>
                </div>
            </main>

            {/* ── Footer ───────────────────────────────────────────────────────── */}
            <footer style={styles.footer}>
                <span>
                    <strong>@nexcode/editor</strong> — built by{' '}
                    <a
                        href="https://nexcode.africa"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.footerLink}
                    >
                    KAJUGA Daniels / NexCode Africa
                    </a>
                </span>
                <span style={styles.footerDivider}>·</span>
                <span>Powered by ProseMirror + React + Google Fonts</span>
            </footer>
        </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

/**
 * Inline styles for the playground shell.
 * These are intentionally simple — the playground is a dev tool, not a product UI.
 * Component styles live in the editor's CSS system.
 */
const styles: Record<string, React.CSSProperties> = {
    app: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },

    // ── Header ─────────────────────────────────────────────────────────────────

    header: {
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
    },

    headerInner: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
    },

    brand: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
    },

    brandName: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#4F46E5',
        letterSpacing: '-0.02em',
    },

    brandTag: {
        fontSize: '12px',
        color: '#6B7280',
    },

    nav: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },

    navGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },

    navLabel: {
        fontSize: '13px',
        color: '#6B7280',
        marginRight: '4px',
    },

    navButton: {
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        background: 'transparent',
        color: '#374151',
        cursor: 'pointer',
        transition: 'all 120ms ease',
    },

    navButtonActive: {
        background: '#4F46E5',
        borderColor: '#4F46E5',
        color: '#ffffff',
    },

    toggle: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        userSelect: 'none',
    },

    toggleInput: {
        width: '16px',
        height: '16px',
        cursor: 'pointer',
        accentColor: '#4F46E5',
    },

    toggleLabel: {
        fontSize: '13px',
        color: '#374151',
    },

    // ── Main ───────────────────────────────────────────────────────────────────

    main: {
        flex: 1,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 420px',
        gap: '24px',
        alignItems: 'start',
    },

    // ── Editor panel ───────────────────────────────────────────────────────────

    editorPanel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },

    statusBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 4px',
    },

    statusItem: {
        fontSize: '12px',
        color: '#9CA3AF',
    },

    readOnlyBadge: {
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: '20px',
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #FDE68A',
    },

    apiControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 4px',
    },

    apiLabel: {
        fontSize: '12px',
        color: '#9CA3AF',
        fontFamily: 'monospace',
    },

    apiButton: {
        padding: '4px 10px',
        fontSize: '12px',
        fontFamily: 'monospace',
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        background: 'transparent',
        color: '#374151',
        cursor: 'pointer',
        transition: 'border-color 120ms ease',
    },

    // ── Output panel ───────────────────────────────────────────────────────────

    outputPanel: {
        position: 'sticky',
        top: '72px',
        background: '#1E1E2E',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        maxHeight: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
    },

    outputHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
    },

    outputTitle: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#A1A1AA',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },

    outputTabs: {
        display: 'flex',
        gap: '2px',
    },

    outputTab: {
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 500,
        border: '1px solid transparent',
        borderRadius: '4px',
        background: 'transparent',
        color: '#71717A',
        cursor: 'pointer',
        transition: 'all 100ms ease',
    },

    outputTabActive: {
        background: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        color: '#A5B4FC',
    },

    outputContent: {
        flex: 1,
        overflow: 'auto',
        margin: 0,
        padding: '16px',
        fontFamily: "'SFMono-Regular', Consolas, monospace",
        fontSize: '12px',
        lineHeight: '1.6',
        color: '#A1A1AA',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },

    // ── Footer ─────────────────────────────────────────────────────────────────

    footer: {
        padding: '16px 24px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#6B7280',
    },

    footerDivider: {
        color: '#D1D5DB',
    },

    footerLink: {
        color: '#4F46E5',
        textDecoration: 'none',
    },
};
