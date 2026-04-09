/**
 * heading.test.ts
 *
 * Unit tests for the Heading node extension.
 *
 * Tests cover:
 * - Default configuration (h1–h6)
 * - Custom level configuration
 * - Input rules for # syntax
 * - Keyboard shortcuts per level
 * - Toolbar descriptor
 */

import { describe, it, expect } from 'vitest';
import { Heading, HeadingExtension } from '../../../src/extensions/heading';
import { buildSchema } from '../../../src/core/schema';
import { EditorState } from 'prosemirror-state';

function createEmptyState(schema: ReturnType<typeof buildSchema>): EditorState {
    return EditorState.create({
        schema,
        doc: schema.topNodeType.createAndFill()!,
    });
}

describe('Heading extension', () => {

    // ── Default extension ──────────────────────────────────────────────────────

    describe('HeadingExtension (default h1–h6)', () => {

        it('has name "heading"', () => {
            expect(HeadingExtension.name).toBe('heading');
        });

        it('is a node extension', () => {
            expect(HeadingExtension.type).toBe('node');
        });

        it('registers in the schema', () => {
            const schema = buildSchema([HeadingExtension]);
            expect(schema.nodes['heading']).toBeDefined();
        });

        it('nodeSpec has level attribute', () => {
            const attrs = HeadingExtension.nodeSpec.attrs as Record<string, { default: unknown }>;
            expect(attrs['level']).toBeDefined();
            expect(attrs['level']?.default).toBe(1);
        });

        it('nodeSpec is in block group', () => {
            expect(HeadingExtension.nodeSpec.group).toBe('block');
        });

        it('nodeSpec has defining: true', () => {
            expect(HeadingExtension.nodeSpec.defining).toBe(true);
        });

        it('parseDOM includes h1 through h6', () => {
            const parseDOM = HeadingExtension.nodeSpec.parseDOM ?? [];
            const tags = parseDOM.map((rule) => ('tag' in rule ? rule.tag : ''));
            expect(tags).toContain('h1');
            expect(tags).toContain('h2');
            expect(tags).toContain('h3');
            expect(tags).toContain('h4');
            expect(tags).toContain('h5');
            expect(tags).toContain('h6');
        });

        it('provides shortcuts for all 6 levels', () => {
            const schema = buildSchema([HeadingExtension]);
            const shortcuts = HeadingExtension.shortcuts!(schema);
            expect(shortcuts['Mod-Alt-1']).toBeDefined();
            expect(shortcuts['Mod-Alt-2']).toBeDefined();
            expect(shortcuts['Mod-Alt-3']).toBeDefined();
            expect(shortcuts['Mod-Alt-4']).toBeDefined();
            expect(shortcuts['Mod-Alt-5']).toBeDefined();
            expect(shortcuts['Mod-Alt-6']).toBeDefined();
        });

        it('provides input rules for all 6 levels', () => {
            const schema = buildSchema([HeadingExtension]);
            const rules = HeadingExtension.inputRules!(schema);
            expect(rules.length).toBe(6);
        });

        it('toolbar isEnabled returns true when schema has heading', () => {
            const schema = buildSchema([HeadingExtension]);
            const state = createEmptyState(schema);
            expect(HeadingExtension.toolbar!.isEnabled(state)).toBe(true);
        });
    });

    // ── Configurable extension ─────────────────────────────────────────────────

    describe('Heading.configure()', () => {

        it('limits levels to configured subset', () => {
            const ext = Heading.configure({ levels: [1, 2] });
            const schema = buildSchema([ext]);

            if (ext.type !== 'node') return;

            const parseDOM = ext.nodeSpec.parseDOM ?? [];
            const tags = parseDOM.map((rule) => ('tag' in rule ? rule.tag : ''));

            expect(tags).toContain('h1');
            expect(tags).toContain('h2');
            expect(tags).not.toContain('h3');
        });

        it('provides shortcuts only for configured levels', () => {
            const ext = Heading.configure({ levels: [1, 2] });
            const schema = buildSchema([ext]);

            if (ext.type !== 'node') return;
            const shortcuts = ext.shortcuts!(schema);

            expect(shortcuts['Mod-Alt-1']).toBeDefined();
            expect(shortcuts['Mod-Alt-2']).toBeDefined();
            expect(shortcuts['Mod-Alt-3']).toBeUndefined();
        });

        it('provides input rules only for configured levels', () => {
            const ext = Heading.configure({ levels: [1, 2, 3] });
            const schema = buildSchema([ext]);

            if (ext.type !== 'node') return;
            const rules = ext.inputRules!(schema);

            expect(rules.length).toBe(3);
        });

        it('returns a valid NexNodeExtension', () => {
            const ext = Heading.configure({ levels: [1] });
            expect(ext.type).toBe('node');
            expect(ext.name).toBe('heading');
        });
    });
});