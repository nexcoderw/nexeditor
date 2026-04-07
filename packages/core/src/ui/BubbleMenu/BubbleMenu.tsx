/**
 * BubbleMenu.tsx
 *
 * A floating toolbar that appears above the user's text selection.
 * This is the contextual toolbar — shown only when text is selected,
 * positioned dynamically near the selection.
 *
 * Positioning:
 * - Reads the selection's bounding rect from the ProseMirror view
 * - Positions itself above the selection, centered horizontally
 * - Flips below the selection if it would overflow the viewport top
 * - Flips left/right if it would overflow the viewport sides
 *
 * Visibility:
 * - Shown when a non-empty text selection exists
 * - Hidden when the selection is empty (cursor only)
 * - Hidden when the editor is not focused
 * - Smooth fade in/out via CSS transitions
 *
 * The BubbleMenu shows a subset of toolbar actions most relevant
 * to inline text formatting: bold, italic, underline, link, color.
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
import styles from './BubbleMenu.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BubbleMenuProps {
    /** Extensions to derive menu items from — usually a subset of all extensions */
    extensions: NexExtension[];
    /** Additional CSS class */
    className?: string;
}

// ─── Position ─────────────────────────────────────────────────────────────────

interface MenuPosition {
    top: number;
    left: number;
    isVisible: boolean;
}

const HIDDEN_POSITION: MenuPosition = { top: 0, left: 0, isVisible: false };

// ─── Component ────────────────────────────────────────────────────────────────

export function BubbleMenu({ extensions, className = '' }: BubbleMenuProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const editorState = useEditorState(editor);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<MenuPosition>(HIDDEN_POSITION);

    // Collect inline formatting items from extensions
    const menuItems = extensions.reduce<ToolbarItemDescriptor[]>((items, ext) => {
        if (
            ext.type === 'mark' &&
            ext.toolbar &&
            // Only show format and insert group items in the bubble menu
            (ext.toolbar.group === 'format' || ext.toolbar.group === 'insert')
        ) {
            items.push(ext.toolbar);
        }
        return items;
    }, []);

    // Calculate the bubble menu position based on the selection
    const updatePosition = useCallback(() => {
        if (!editor || !editorState) {
            setPosition(HIDDEN_POSITION);
            return;
        }

        const { selection } = editorState;

        // Hide when selection is empty or editor is not focused
        if (selection.empty || !editor.isFocused) {
            setPosition(HIDDEN_POSITION);
            return;
        }

        // Get the bounding rect of the selection from ProseMirror
        const { view } = editor;
        const { from, to } = selection;

        // coordsAtPos gives us the pixel coordinates of a document position
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const menuEl = menuRef.current;
        if (!menuEl) {
            setPosition(HIDDEN_POSITION);
            return;
        }

        const menuWidth = menuEl.offsetWidth || 200; // Fallback width
        const menuHeight = menuEl.offsetHeight || 40;
        const OFFSET = 8; // Gap between selection and menu

        // Center the menu horizontally over the selection
        const selectionCenterX = (start.left + end.right) / 2;
        const left = Math.max(
            8, // Min 8px from left edge
            Math.min(
                selectionCenterX - menuWidth / 2,
                window.innerWidth - menuWidth - 8, // Max 8px from right edge
            ),
        );

        // Position above the selection, flip below if too close to top
        const topAbove = start.top - menuHeight - OFFSET + window.scrollY;
        const topBelow = end.bottom + OFFSET + window.scrollY;

        const top = start.top > menuHeight + OFFSET + 8
            ? topAbove
            : topBelow;

        setPosition({ top, left, isVisible: true });
    }, [editor, editorState]);

    // Recalculate position on selection changes
    useEffect(() => {
        updatePosition();
    }, [updatePosition, editorState]);

    // Hide on scroll to prevent stale positioning
    useEffect(() => {
        const handleScroll = () => setPosition(HIDDEN_POSITION);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!editor || menuItems.length === 0) return null;

    const menuStyle: CSSProperties = {
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        opacity: position.isVisible ? 1 : 0,
        pointerEvents: position.isVisible ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
    };

    const menuClass = ['nex-bubble-menu', styles.menu, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className={menuClass}
            role="toolbar"
            aria-label="Text formatting"
            aria-hidden={!position.isVisible}
        >
            {menuItems.map((item) => {
                const isActive = editorState ? item.isActive(editorState) : false;
                const isEnabled = editorState ? item.isEnabled(editorState) : false;

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={[
                            styles.button,
                            isActive ? styles.buttonActive : '',
                            !isEnabled ? styles.buttonDisabled : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        aria-label={item.label}
                        aria-pressed={isActive}
                        disabled={!isEnabled}
                        title={item.shortcutHint ? `${item.label} (${item.shortcutHint})` : item.label}
                        onMouseDown={(e) => {
                            // Prevent editor losing focus on button click
                            e.preventDefault();
                        }}
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