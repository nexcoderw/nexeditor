/**
 * TableControls.tsx
 *
 * Context menu for table operations — appears when the cursor is inside a table.
 *
 * Operations available:
 * - Add row above / Add row below
 * - Add column left / Add column right
 * - Delete row / Delete column / Delete table
 * - Toggle header row / Toggle header column
 * - Merge selected cells / Split cell
 *
 * Opens via the 'nex:open-table-dialog' event or by clicking
 * within a table and triggering the table controls toolbar button.
 *
 * Also provides the initial table insertion dialog when triggered
 * from the Toolbar insert button (rows × columns selector).
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNexEditorContext } from '../EditorContext';
import { isNodeActive } from '../../core/commands';
import {
    insertTable,
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
} from '../../extensions/table';
import styles from './TableControls.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TableControlsProps {
    className?: string;
}

// ─── Table Insert Dialog ──────────────────────────────────────────────────────

function TableInsertDialog({
    onInsert,
    onClose,
}: {
    onInsert: (rows: number, cols: number) => void;
    onClose: () => void;
}): JSX.Element {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [withHeader, setWithHeader] = useState(true);

    return (
        <div className={styles.dialog} role="dialog" aria-label="Insert table">
            <div className={styles.header}>
                <span className={styles.title}>Insert table</span>
                <button
                    type="button"
                    className={styles.closeButton}
                    aria-label="Close"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            <div className={styles.body}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="nex-table-rows">
                        Rows
                    </label>
                    <input
                        id="nex-table-rows"
                        type="number"
                        className={styles.numberInput}
                        min={1}
                        max={50}
                        value={rows}
                        onChange={(e) => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="nex-table-cols">
                        Columns
                    </label>
                    <input
                        id="nex-table-cols"
                        type="number"
                        className={styles.numberInput}
                        min={1}
                        max={20}
                        value={cols}
                        onChange={(e) => setCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                </div>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={withHeader}
                        onChange={(e) => setWithHeader(e.target.checked)}
                    />
                    <span>Include header row</span>
                </label>
            </div>

            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.insertButton}
                    onClick={() => onInsert(rows, cols)}
                >
                    Insert
                </button>
            </div>
        </div>
    );
}

// ─── Table Context Menu ───────────────────────────────────────────────────────

function TableContextMenu({ onClose }: { onClose: () => void }): JSX.Element | null {
    const editor = useNexEditorContext();
    if (!editor) return null;

    const runCommand = (
        command: (
            state: import('prosemirror-state').EditorState,
            dispatch?: import('prosemirror-state').Transaction extends infer T ? (tr: T) => void : never,
            view?: import('prosemirror-view').EditorView,
        ) => boolean,
    ) => {
        command(editor.view.state, editor.view.dispatch, editor.view);
        onClose();
        editor.view.focus();
    };

    const menuItems = [
        { label: 'Add row above', action: () => runCommand(addRowBefore) },
        { label: 'Add row below', action: () => runCommand(addRowAfter) },
        { label: 'Add column left', action: () => runCommand(addColumnBefore) },
        { label: 'Add column right', action: () => runCommand(addColumnAfter) },
        { separator: true },
        { label: 'Toggle header row', action: () => runCommand(toggleHeaderRow) },
        { label: 'Toggle header column', action: () => runCommand(toggleHeaderColumn) },
        { separator: true },
        { label: 'Merge cells', action: () => runCommand(mergeCells) },
        { label: 'Split cell', action: () => runCommand(splitCell) },
        { separator: true },
        { label: 'Delete row', action: () => runCommand(deleteRow), danger: true },
        { label: 'Delete column', action: () => runCommand(deleteColumn), danger: true },
        { label: 'Delete table', action: () => runCommand(deleteTable), danger: true },
    ] as const;

    return (
        <div className={styles.contextMenu} role="menu">
            {menuItems.map((item, index) => {
                if ('separator' in item) {
                    return <div key={`sep-${index}`} className={styles.separator} role="separator" />;
                }

                return (
                    <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        className={[styles.menuItem, item.danger ? styles.menuItemDanger : '']
                            .filter(Boolean)
                            .join(' ')}
                        onClick={item.action}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TableControls({ className = '' }: TableControlsProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const [mode, setMode] = useState<'insert' | 'context' | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Listen for the insert table event from the toolbar
    useEffect(() => {
        if (!editor) return;

        const handleOpenDialog = () => setMode('insert');

        editor.view.dom.addEventListener('nex:open-table-dialog', handleOpenDialog);
        return () => {
            editor.view.dom.removeEventListener('nex:open-table-dialog', handleOpenDialog);
        };
    }, [editor]);

    // Close on outside click
    useEffect(() => {
        if (!mode) return;

        const handleOutside = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) {
                setMode(null);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [mode]);

    const handleInsert = useCallback(
        (rows: number, cols: number) => {
            if (!editor) return;
            insertTable(editor.view, rows, cols, true);
            setMode(null);
        },
        [editor],
    );

    if (!mode || !editor) return null;

    const wrapperClass = ['nex-table-controls', styles.wrapper, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div ref={wrapperRef} className={wrapperClass}>
            {mode === 'insert' && (
                <TableInsertDialog
                    onInsert={handleInsert}
                    onClose={() => setMode(null)}
                />
            )}
            {mode === 'context' && (
                <TableContextMenu onClose={() => setMode(null)} />
            )}
        </div>
    );
}