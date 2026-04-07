/**
 * FloatingMenu.tsx
 *
 * A menu that floats at the start of an empty paragraph.
 * Shown when the cursor is in an empty block — suggests what the
 * user can insert: heading, image, table, code block, etc.
 *
 * This is the "+" or "/" menu pattern common in Notion-style editors.
 *
 * Positioning:
 * - Appears at the left edge of the empty paragraph
 * - Follows the cursor as the user moves between empty paragraphs
 * - Disappears when the paragraph has content
 */

'use client';

import {
    useEffect,
    useRef,
    useState,
    useCallback,
    type CSSProperties,
} from 'react';
import { useNexEditorContext } from '../EditorContext';
import { useEditorState } from '../../hooks/useEditorState';
import { ToolbarIcon } from '../Toolbar/ToolbarIcon';
import type { NexExtension } from '../../types/extension.types';
import type { ToolbarItemDescriptor } from '../../types/extension.types';
import styles from './FloatingMenu.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FloatingMenuProps {
    extensions: NexExtension[];
    className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if the current selection is in an empty block.
 * The floating menu only shows in empty paragraphs.
 */
function isInEmptyBlock(
    state: import('prosemirror-state').EditorState,
): boolean {
    const { $from, empty } = state.selection;

    if (!empty) return false;

    // Must be in a textblock (paragraph, heading, etc.)
    if (!$from.parent.isTextblock) return false;

    // The parent block must have no content
    return $from.parent.content.size === 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FloatingMenu({
    extensions,
    className = '',
}: FloatingMenuProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const editorState = useEditorState(editor);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, visible: false });

    // Collect insert-type items from extensions
    const insertItems = extensions.reduce<ToolbarItemDescriptor[]>((items, ext) => {
        if (
            ext.type === 'node' &&
            ext.toolbar &&
            (ext.toolbar.group === 'insert' || ext.toolbar.group === 'media')
        ) {
            items.push(ext.toolbar);
        }
        return items;
    }, []);

    const updatePosition = useCallback(() => {
        if (!editor || !editorState) {
            setPosition((p) => ({ ...p, visible: false }));
            return;
        }

        // Only show in empty blocks
        if (!isInEmptyBlock(editorState) || !editor.isFocused) {
            setPosition((p) => ({ ...p, visible: false }));
            return;
        }

        const { view } = editor;
        const { from } = editorState.selection;
        const coords = view.coordsAtPos(from);

        setPosition({
            // Position at the left edge of the empty line, vertically centered
            top: coords.top + window.scrollY - 4,
            left: coords.left - 32, // 32px to the left of the cursor
            visible: true,
        });
    }, [editor, editorState]);

    useEffect(() => {
        updatePosition();
    }, [updatePosition, editorState]);

    if (!editor || insertItems.length === 0) return null;

    const menuStyle: CSSProperties = {
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 999,
        opacity: position.visible ? 1 : 0,
        pointerEvents: position.visible ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
    };

    const menuClass = ['nex-floating-menu', styles.menu, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className={menuClass}
            role="toolbar"
            aria-label="Insert content"
            aria-hidden={!position.visible}
        >
            {insertItems.map((item) => {
                const isEnabled = editorState ? item.isEnabled(editorState) : false;

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={[styles.button, !isEnabled ? styles.buttonDisabled : '']
                            .filter(Boolean)
                            .join(' ')}
                        aria-label={item.label}
                        title={item.label}
                        disabled={!isEnabled}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            if (isEnabled && editor) {
                                item.execute(editor.view);
                            }
                        }}
                    >
                        <ToolbarIcon name={item.icon} size={14} />
                    </button>
                );
            })}
        </div>
    );
}