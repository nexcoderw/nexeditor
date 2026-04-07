/**
 * LinkPopover.tsx
 *
 * A small popover for inserting and editing hyperlinks.
 *
 * Opens when:
 * - The user triggers Mod+K shortcut
 * - The Link toolbar button is clicked
 * - The cursor is placed on an existing link
 *
 * Features:
 * - Pre-fills URL when editing an existing link
 * - Validates URL before insertion (sanitizer layer)
 * - Shows the current linked text or allows entering new text
 * - Offers Remove Link when editing an existing link
 *
 * Security: URL is validated through sanitizeURL() before any
 * insertion — javascript: and other dangerous schemes are rejected
 * with a visible error message.
 */

'use client';

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type KeyboardEvent,
} from 'react';
import { useNexEditorContext } from '../EditorContext';
import { getLinkAtCursor, insertLink, removeLink } from '../../extensions/link';
import { isURLSafe } from '../../security/sanitizer';
import styles from './LinkPopover.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LinkPopoverProps {
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LinkPopover({ className = '' }: LinkPopoverProps): JSX.Element | null {
    const editor = useNexEditorContext();

    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false); // True when editing existing link

    const inputRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Listen for the custom event dispatched by the Link extension toolbar button
    useEffect(() => {
        if (!editor) return;

        const handleOpen = () => {
            // Check if cursor is on an existing link
            const existingLink = getLinkAtCursor(editor.state);

            setUrl(existingLink?.href ?? '');
            setIsEditing(!!existingLink);
            setError(null);
            setIsOpen(true);

            // Focus the input after the popover renders
            setTimeout(() => inputRef.current?.focus(), 0);
        };

        editor.view.dom.addEventListener('nex:open-link-popover', handleOpen);
        return () => {
            editor.view.dom.removeEventListener('nex:open-link-popover', handleOpen);
        };
    }, [editor]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleOutside = (e: MouseEvent) => {
            if (!popoverRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

    const handleSubmit = useCallback(() => {
        if (!editor) return;

        const trimmedUrl = url.trim();

        // Validate before inserting
        if (!trimmedUrl) {
            setError('URL cannot be empty');
            return;
        }

        // Add https:// if no protocol specified — improves UX
        const urlWithProtocol =
            trimmedUrl.startsWith('http://') ||
                trimmedUrl.startsWith('https://') ||
                trimmedUrl.startsWith('mailto:') ||
                trimmedUrl.startsWith('tel:') ||
                trimmedUrl.startsWith('/') ||
                trimmedUrl.startsWith('#')
                ? trimmedUrl
                : `https://${trimmedUrl}`;

        // Security check — sanitizer rejects dangerous schemes
        if (!isURLSafe(urlWithProtocol)) {
            setError('This URL is not allowed for security reasons');
            return;
        }

        const success = insertLink(editor.view, urlWithProtocol);

        if (success) {
            setIsOpen(false);
            setUrl('');
            setError(null);
        } else {
            setError('Failed to insert link. Please check the URL.');
        }
    }, [editor, url]);

    const handleRemove = useCallback(() => {
        if (!editor) return;
        removeLink(editor.view);
        setIsOpen(false);
        setUrl('');
        setError(null);
    }, [editor]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        },
        [handleSubmit],
    );

    if (!isOpen || !editor) return null;

    const popoverClass = ['nex-link-popover', styles.popover, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div ref={popoverRef} className={popoverClass} role="dialog" aria-label="Insert link">
            <div className={styles.header}>
                <span className={styles.title}>
                    {isEditing ? 'Edit link' : 'Insert link'}
                </span>
                <button
                    type="button"
                    className={styles.closeButton}
                    aria-label="Close"
                    onClick={() => setIsOpen(false)}
                >
                    ×
                </button>
            </div>

            <div className={styles.body}>
                <label className={styles.label} htmlFor="nex-link-url">
                    URL
                </label>
                <input
                    ref={inputRef}
                    id="nex-link-url"
                    type="url"
                    className={[styles.input, error ? styles.inputError : '']
                        .filter(Boolean)
                        .join(' ')}
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        setError(null); // Clear error on typing
                    }}
                    onKeyDown={handleKeyDown}
                    autoComplete="url"
                    spellCheck={false}
                />

                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}
            </div>

            <div className={styles.footer}>
                {isEditing && (
                    <button
                        type="button"
                        className={styles.removeButton}
                        onClick={handleRemove}
                    >
                        Remove link
                    </button>
                )}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.applyButton}
                        onClick={handleSubmit}
                    >
                        {isEditing ? 'Update' : 'Insert'}
                    </button>
                </div>
            </div>
        </div>
    );
}