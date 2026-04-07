/**
 * history.ts
 *
 * Undo/redo history plugin for the editor.
 *
 * Wraps ProseMirror's battle-tested history plugin with our
 * extension interface. Consumers get Cmd+Z / Cmd+Shift+Z out of the box.
 *
 * Configuration:
 * - depth: 200 steps — generous enough for real editing sessions
 * - newGroupDelay: 500ms — typing within 500ms is grouped into one undo step,
 *   so Cmd+Z undoes a word or phrase, not a single character
 */

import { history } from 'prosemirror-history';
import type { NexFunctionalExtension } from '../../types/extension.types';

export const HistoryExtension: NexFunctionalExtension = {
    name: 'history',
    type: 'functional',

    // High priority — history must be initialized before other plugins
    // that might dispatch transactions on mount
    priority: 200,

    plugins() {
        return [
            history({
                // Maximum number of undoable steps kept in memory
                depth: 200,

                // Milliseconds of inactivity before a new undo group starts.
                // This means rapid typing is grouped into one undo step.
                newGroupDelay: 500,
            }),
        ];
    },
};