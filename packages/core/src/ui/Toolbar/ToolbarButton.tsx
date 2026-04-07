/**
 * ToolbarButton.tsx
 *
 * A single toolbar button — renders an icon, tooltip, and handles clicks.
 *
 * Accessibility:
 * - role="button" with aria-label from the descriptor
 * - aria-pressed reflects the active state (e.g., bold is pressed when active)
 * - aria-disabled when the command is not applicable
 * - Tooltip shows the label + keyboard shortcut hint
 * - Keyboard accessible: Enter and Space trigger the action
 */

'use client';

import { useCallback, type KeyboardEvent } from 'react';
import type { ToolbarItemDescriptor } from '../../types/extension.types';
import { ToolbarIcon } from './ToolbarIcon';
import styles from './Toolbar.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ToolbarButtonProps {
    item: ToolbarItemDescriptor;
    isActive: boolean;
    isEnabled: boolean;
    onExecute: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ToolbarButton({
    item,
    isActive,
    isEnabled,
    onExecute,
}: ToolbarButtonProps): JSX.Element {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLButtonElement>) => {
            // Trigger on Enter and Space — standard button keyboard interaction
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isEnabled) onExecute();
            }
        },
        [isEnabled, onExecute],
    );

    // Build the tooltip text — includes shortcut hint if available
    const tooltip = item.shortcutHint
        ? `${item.label} (${item.shortcutHint})`
        : item.label;

    const buttonClass = [
        styles.button,
        isActive ? styles.buttonActive : '',
        !isEnabled ? styles.buttonDisabled : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type="button"
            className={buttonClass}
            aria-label={item.label}
            aria-pressed={isActive}
            aria-disabled={!isEnabled}
            title={tooltip}
            disabled={!isEnabled}
            onMouseDown={(e) => {
                // Prevent the editor from losing focus when clicking toolbar buttons.
                // Without this, clicking a button blurs the editor and the selection
                // is lost before the command runs.
                e.preventDefault();
            }}
            onClick={() => {
                if (isEnabled) onExecute();
            }}
            onKeyDown={handleKeyDown}
        >
            <ToolbarIcon name={item.icon} />
        </button>
    );
}