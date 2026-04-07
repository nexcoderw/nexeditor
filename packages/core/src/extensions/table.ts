/**
 * table.ts
 *
 * Table node extension — full table editing support.
 *
 * Built on prosemirror-tables which provides:
 * - Table structure nodes: table, table_row, table_cell, table_header
 * - Column and row selection
 * - Cell merging and splitting
 * - Arrow key navigation between cells
 * - Tab to move to the next cell
 *
 * We wrap prosemirror-tables in our extension interface so it
 * participates in the same schema registration and plugin system
 * as all other extensions.
 *
 * Table creation: triggered from the toolbar, which opens the
 * TableControls UI component to let the user pick rows × columns.
 */

import {
    tableNodes,
    columnResizing,
    tableEditing,
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
    setCellAttr,
} from 'prosemirror-tables';
import type { Schema } from 'prosemirror-model';
import type { NexNodeExtension } from '../types/extension.types';

// ─── Table Nodes ──────────────────────────────────────────────────────────────

/**
 * prosemirror-tables exports a tableNodes() factory that returns
 * all four node specs: table, table_row, table_cell, table_header.
 * We register them as a single extension to keep things simple.
 */
const tableNodeSpecs = tableNodes({
    // table_cell and table_header can contain block content (paragraphs, lists)
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {
        // Background color for individual cells
        background: {
            default: null,
            getFromDOM(dom) {
                const el = dom as HTMLElement;
                return el.style.backgroundColor || null;
            },
            setDOMAttr(value, attrs) {
                if (value) {
                    (attrs as Record<string, string>)['style'] =
                        `${(attrs as Record<string, string>)['style'] ?? ''};background-color:${value as string}`;
                }
            },
        },
    },
});

// ─── Extension ────────────────────────────────────────────────────────────────

export const Table: NexNodeExtension = {
    name: 'table',
    type: 'node',
    priority: 100,

    // Use the table node spec from prosemirror-tables
    nodeSpec: tableNodeSpecs['table']!,

    plugins(schema: Schema) {
        return [
            // Allows users to resize columns by dragging column borders
            columnResizing({}),

            // Core table editing behaviour: cell selection, arrow key navigation
            tableEditing(),
        ];
    },

    toolbar: {
        id: 'table',
        label: 'Table',
        icon: 'table',
        group: 'insert',

        isActive(_state) {
            return false;
        },

        isEnabled(state) {
            return !!state.schema.nodes['table'];
        },

        execute(view) {
            // Open the TableControls UI to let the user pick dimensions
            const event = new CustomEvent('nex:open-table-dialog', {
                bubbles: true,
                detail: { view },
            });
            view.dom.dispatchEvent(event);
        },
    },
};

/**
 * The table_row node must also be registered in the schema.
 * We export it as a companion extension to Table.
 */
export const TableRow: NexNodeExtension = {
    name: 'table_row',
    type: 'node',
    priority: 100,
    nodeSpec: tableNodeSpecs['table_row']!,
};

/**
 * The table_cell node.
 */
export const TableCell: NexNodeExtension = {
    name: 'table_cell',
    type: 'node',
    priority: 100,
    nodeSpec: tableNodeSpecs['table_cell']!,
};

/**
 * The table_header node — for header cells (<th>).
 */
export const TableHeader: NexNodeExtension = {
    name: 'table_header',
    type: 'node',
    priority: 100,
    nodeSpec: tableNodeSpecs['table_header']!,
};

// ─── Table Helpers ────────────────────────────────────────────────────────────

/**
 * Insert a new table at the current cursor position.
 *
 * @param view - The editor view
 * @param rows - Number of rows (excluding header row)
 * @param cols - Number of columns
 * @param withHeaderRow - Whether to include a header row
 */
export function insertTable(
    view: import('prosemirror-view').EditorView,
    rows: number,
    cols: number,
    withHeaderRow: boolean = true,
): boolean {
    const { state, dispatch } = view;
    const schema = state.schema;

    const tableNodeType = schema.nodes['table'];
    const rowNodeType = schema.nodes['table_row'];
    const cellNodeType = schema.nodes['table_cell'];
    const headerNodeType = schema.nodes['table_header'];

    if (!tableNodeType || !rowNodeType || !cellNodeType || !headerNodeType) {
        return false;
    }

    // Build the default cell content — an empty paragraph
    const createCell = (isHeader: boolean) => {
        const cellType = isHeader ? headerNodeType : cellNodeType;
        return cellType.createAndFill()!;
    };

    // Build rows
    const tableRows = [];

    // Header row
    if (withHeaderRow) {
        const headerCells = Array.from({ length: cols }, () => createCell(true));
        tableRows.push(rowNodeType.create(null, headerCells));
    }

    // Body rows
    for (let r = 0; r < rows; r++) {
        const cells = Array.from({ length: cols }, () => createCell(false));
        tableRows.push(rowNodeType.create(null, cells));
    }

    const table = tableNodeType.create(null, tableRows);

    dispatch(state.tr.replaceSelectionWith(table).scrollIntoView());
    view.focus();
    return true;
}

// Re-export prosemirror-tables commands so consumers don't need to
// import prosemirror-tables directly
export {
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
    setCellAttr,
};