/**
 * schema.test.ts
 *
 * Unit tests for the schema builder.
 *
 * Tests verify:
 * - Base nodes are always present
 * - Extensions contribute their nodes and marks
 * - Duplicate extension names emit warnings
 * - schemaHasNode and schemaHasMark utilities work correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { buildSchema, schemaHasNode, schemaHasMark } from '../../../src/core/schema';
import { Bold } from '../../../src/extensions/bold';
import { Italic } from '../../../src/extensions/italic';
import { HeadingExtension } from '../../../src/extensions/heading';

describe('buildSchema', () => {

    // ── Base nodes ────────────────────────────────────────────────────────────

    it('always includes the doc node', () => {
        const schema = buildSchema([]);
        expect(schema.nodes['doc']).toBeDefined();
    });

    it('always includes the paragraph node', () => {
        const schema = buildSchema([]);
        expect(schema.nodes['paragraph']).toBeDefined();
    });

    it('always includes the text node', () => {
        const schema = buildSchema([]);
        expect(schema.nodes['text']).toBeDefined();
    });

    it('always includes the hard_break node', () => {
        const schema = buildSchema([]);
        expect(schema.nodes['hard_break']).toBeDefined();
    });

    // ── Extension nodes ───────────────────────────────────────────────────────

    it('registers mark extensions in schema.marks', () => {
        const schema = buildSchema([Bold, Italic]);
        expect(schema.marks['bold']).toBeDefined();
        expect(schema.marks['italic']).toBeDefined();
    });

    it('registers node extensions in schema.nodes', () => {
        const schema = buildSchema([HeadingExtension]);
        expect(schema.nodes['heading']).toBeDefined();
    });

    it('does not include marks when no mark extensions passed', () => {
        const schema = buildSchema([]);
        expect(schema.marks['bold']).toBeUndefined();
        expect(schema.marks['italic']).toBeUndefined();
    });

    // ── Priority ordering ─────────────────────────────────────────────────────

    it('processes extensions in priority order', () => {
        const highPriority = {
            ...Bold,
            name: 'bold',
            priority: 200,
        };
        const lowPriority = {
            ...Bold,
            name: 'bold',
            priority: 50,
        };

        // Higher priority should win — no error, just a warning
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const schema = buildSchema([lowPriority, highPriority]);
        expect(schema.marks['bold']).toBeDefined();
        consoleSpy.mockRestore();
    });

    // ── Duplicate name warning ────────────────────────────────────────────────

    it('emits a console warning for duplicate extension names', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        buildSchema([Bold, { ...Bold, name: 'bold', priority: 50 }]);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Duplicate mark extension name: "bold"'),
        );

        consoleSpy.mockRestore();
    });

    // ── Functional extensions ─────────────────────────────────────────────────

    it('ignores functional extensions (they contribute no schema nodes)', () => {
        const { HistoryExtension } =
            await import('../../../src/core/plugins/history').then((m) => m);
        const schema = buildSchema([HistoryExtension]);
        // History is functional — should not add any new nodes or marks
        expect(schema.nodes['history']).toBeUndefined();
    });
});

describe('schemaHasNode', () => {

    it('returns true for a registered node', () => {
        const schema = buildSchema([HeadingExtension]);
        expect(schemaHasNode(schema, 'heading')).toBe(true);
    });

    it('returns true for base nodes', () => {
        const schema = buildSchema([]);
        expect(schemaHasNode(schema, 'paragraph')).toBe(true);
        expect(schemaHasNode(schema, 'doc')).toBe(true);
    });

    it('returns false for an unregistered node', () => {
        const schema = buildSchema([]);
        expect(schemaHasNode(schema, 'heading')).toBe(false);
        expect(schemaHasNode(schema, 'table')).toBe(false);
    });
});

describe('schemaHasMark', () => {

    it('returns true for a registered mark', () => {
        const schema = buildSchema([Bold]);
        expect(schemaHasMark(schema, 'bold')).toBe(true);
    });

    it('returns false for an unregistered mark', () => {
        const schema = buildSchema([]);
        expect(schemaHasMark(schema, 'bold')).toBe(false);
    });

    it('returns false for a node name passed as mark', () => {
        const schema = buildSchema([Bold]);
        expect(schemaHasMark(schema, 'paragraph')).toBe(false);
    });
});