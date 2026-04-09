/**
 * Toolbar.tsx
 *
 * The editor toolbar — renders buttons for all extension toolbar descriptors.
 *
 * Architecture:
 * - The toolbar is data-driven: it reads ToolbarItemDescriptor from each extension
 * - Buttons group themselves by their `group` field with visual dividers between groups
 * - Active state is determined by reading the current EditorState
 * - Disabled state prevents clicks when commands are not applicable
 *
 * The toolbar re-renders on every editor state change via useEditorState().
 * This is necessary because active states (bold, italic, etc.) change on
 * every cursor move. The re-render is cheap — only button active states change.
 *
 * Accessibility:
 * - Each button has aria-label from the descriptor's label field
 * - Active buttons have aria-pressed="true"
 * - Disabled buttons have aria-disabled and are not focusable
 * - The toolbar has role="toolbar" with aria-label
 * - Groups are separated by role="separator" dividers
 */

'use client';

import { useMemo } from 'react';
import { useNexEditorContext } from '../EditorContext';
import { useEditorState } from '../../hooks/useEditorState';
import { ToolbarButton } from './ToolbarButton';
import type { NexExtension } from '../../types/extension.types';
import type { ToolbarItemDescriptor } from '../../types/extension.types';
import styles from './Toolbar.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ToolbarProps {
    /** The registered extensions — toolbar items are derived from these */
    extensions: NexExtension[];

    /** Additional CSS class for the toolbar wrapper */
    className?: string;
}

// ─── Toolbar Groups ───────────────────────────────────────────────────────────

/** Order in which groups appear left to right in the toolbar */
const GROUP_ORDER: ToolbarItemDescriptor['group'][] = [
    'text',
    'format',
    'insert',
    'media',
    'misc',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Toolbar({ extensions, className = '' }: ToolbarProps): JSX.Element | null {
    const editor = useNexEditorContext();
    const editorState = useEditorState(editor);

    // Collect all toolbar items from extensions
    const toolbarItems = useMemo<ToolbarItemDescriptor[]>(() => {
        const items: ToolbarItemDescriptor[] = [];

        const sorted = [...extensions].sort(
            (a, b) => (b.priority ?? 100) - (a.priority ?? 100),
        );

        for (const ext of sorted) {
            if ((ext.type === 'mark' || ext.type === 'node') && ext.toolbar) {
                items.push(ext.toolbar);
            }
        }

        return items;
    }, [extensions]);

    // Group items by their group field
    const groupedItems = useMemo<
        Map<ToolbarItemDescriptor['group'], ToolbarItemDescriptor[]>
    >(() => {
        const groups = new Map<
            ToolbarItemDescriptor['group'],
            ToolbarItemDescriptor[]
        >();

        for (const item of toolbarItems) {
            const group = item.group;
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group)!.push(item);
        }

        return groups;
    }, [toolbarItems]);

    // Don't render the toolbar if the editor isn't ready
    if (!editor || !editorState) return null;

    // Build ordered groups — only include groups that have items
    const orderedGroups = GROUP_ORDER.filter((group) => groupedItems.has(group));

    const toolbarClass = ['nex-toolbar', styles.toolbar, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            role="toolbar"
            aria-label="Text formatting"
            className={toolbarClass}
        >
            {orderedGroups.map((group, groupIndex) => {
                const items = groupedItems.get(group)!;

                return (
                    <div key={group} className={styles.group} role="group" aria-label={group}>
                        {/* Divider between groups — not before the first group */}
                        {groupIndex > 0 && (
                            <div
                                role="separator"
                                className={styles.divider}
                                aria-orientation="vertical"
                            />
                        )}

                        {items.map((item) => {
                            const isActive = editorState ? item.isActive(editorState) : false;
                            const isEnabled = editorState ? item.isEnabled(editorState) : false;

                            return (
                                <ToolbarButton
                                    key={item.id}
                                    item={item}
                                    isActive={isActive}
                                    isEnabled={isEnabled}
                                    onExecute={() => {
                                        if (editor && isEnabled) {
                                            item.execute(editor.view);
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
