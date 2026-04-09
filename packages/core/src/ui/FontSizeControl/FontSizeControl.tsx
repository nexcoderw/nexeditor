/**
 * FontSizeControl.tsx
 *
 * Docs-style font size control for the built-in toolbar.
 *
 * UI shape:
 * - Decrease button
 * - Numeric input
 * - Increase button
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { EditorState } from 'prosemirror-state';
import { useNexEditorContext } from '../EditorContext';
import {
    applyFontSize,
    changeFontSize,
    DEFAULT_FONT_SIZE_PX,
    getCurrentFontSizePx,
    MAX_FONT_SIZE_PX,
    MIN_FONT_SIZE_PX,
} from '../../extensions/font-size';
import styles from './FontSizeControl.module.css';

export interface FontSizeControlProps {
    editorState: EditorState;
    className?: string;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    step?: number;
}

function clampSize(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
}

export function FontSizeControl({
    editorState,
    className = '',
    defaultSize = DEFAULT_FONT_SIZE_PX,
    minSize = MIN_FONT_SIZE_PX,
    maxSize = MAX_FONT_SIZE_PX,
    step = 1,
}: FontSizeControlProps): JSX.Element | null {
    const editor = useNexEditorContext();

    const isEnabled = !!editor && !!editorState.schema.marks['font_size'];

    const currentSize = useMemo(
        () => getCurrentFontSizePx(editorState, defaultSize),
        [defaultSize, editorState],
    );

    const [inputValue, setInputValue] = useState(String(currentSize));

    useEffect(() => {
        setInputValue(String(currentSize));
    }, [currentSize]);

    const resetInput = useCallback(() => {
        setInputValue(String(currentSize));
    }, [currentSize]);

    const commitSize = useCallback(
        (value: string) => {
            if (!editor || !isEnabled) return;

            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) {
                resetInput();
                return;
            }

            const clamped = clampSize(parsed, minSize, maxSize);
            if (!applyFontSize(editor.view, `${clamped}px`)) {
                resetInput();
                return;
            }

            setInputValue(String(clamped));
        },
        [editor, isEnabled, maxSize, minSize, resetInput],
    );

    const adjustSize = useCallback(
        (direction: -1 | 1) => {
            if (!editor || !isEnabled) return;

            const draft = Number.parseInt(inputValue, 10);
            const baseSize = Number.isFinite(draft) ? draft : currentSize;
            const nextSize = clampSize(baseSize + (direction * step), minSize, maxSize);

            if (!changeFontSize(editor.view, nextSize - currentSize, currentSize)) {
                resetInput();
                return;
            }

            setInputValue(String(nextSize));
        },
        [
            currentSize,
            editor,
            inputValue,
            isEnabled,
            maxSize,
            minSize,
            resetInput,
            step,
        ],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            switch (event.key) {
                case 'Enter':
                    event.preventDefault();
                    commitSize(inputValue);
                    break;
                case 'Escape':
                    event.preventDefault();
                    resetInput();
                    editor?.focus();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    adjustSize(1);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    adjustSize(-1);
                    break;
            }
        },
        [adjustSize, commitSize, editor, inputValue, resetInput],
    );

    const wrapperClass = [styles.wrapper, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={wrapperClass} aria-label="Font size controls">
            <button
                type="button"
                className={styles.stepButton}
                aria-label="Decrease font size"
                disabled={!isEnabled || currentSize <= minSize}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => adjustSize(-1)}
            >
                -
            </button>

            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={styles.input}
                aria-label="Font size"
                disabled={!isEnabled}
                value={inputValue}
                onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^\d]/g, '');
                    setInputValue(nextValue);
                }}
                onFocus={(event) => event.target.select()}
                onBlur={() => commitSize(inputValue)}
                onKeyDown={handleKeyDown}
            />

            <button
                type="button"
                className={styles.stepButton}
                aria-label="Increase font size"
                disabled={!isEnabled || currentSize >= maxSize}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => adjustSize(1)}
            >
                +
            </button>
        </div>
    );
}
