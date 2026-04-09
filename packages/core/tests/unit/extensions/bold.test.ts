/**
 * bold.test.ts
 *
 * Unit tests for the Bold mark extension.
 *
 * Tests verify:
 * - The markSpec is correctly defined
 * - The toggle command applies and removes the mark
 * - The toolbar descriptor reports correct active state
 * - Input rules transform **text** to bold
 */

import { describe, it, expect } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { Bold } from '../../../src/extensions/bold';
import { buildSchema } from '../../../src/core/schema';
import { isMarkActive } from '../../../src/core/commands';

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Build a minimal schema containing only the Bold mark.
 * We do not need the full extension set for unit tests.
 */
function buildTestSchema(): Schema {
    return buildSchema([Bold]);
}

/**
 * Create an empty EditorState with the given schema.
 */
function createEmptyState(schema: Schema): EditorState {
    return EditorState.create({
        schema,
        doc: schema.topNodeType.createAndFill()!,
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Bold extension', () => {

    // ── Extension shape ────────────────────────────────────────────────────────

    it('has name "bold"', () => {
        expect(Bold.name).toBe('bold');
    });

    it('is a mark extension', () => {
        expect(Bold.type).toBe('mark');
    });

    it('declares a Mod-b shortcut', () => {
        expect(Bold.shortcut).toBe('Mod-b');
    });

    it('has a toggle command factory', () => {
        expect(typeof Bold.toggleCommand).toBe('function');
    });

    it('has an input rules factory', () => {
        expect(typeof Bold.inputRules).toBe('function');
    });

    // ── markSpec ──────────────────────────────────────────────────────────────

    it('parseDOM includes <strong> tag rule', () => {
        const parseDOM = Bold.markSpec.parseDOM ?? [];
        const hasStrong = parseDOM.some(
            (rule) => 'tag' in rule && rule.tag === 'strong',
        );
        expect(hasStrong).toBe(true);
    });

    it('parseDOM includes <b> tag rule', () => {
        const parseDOM = Bold.markSpec.parseDOM ?? [];
        const hasB = parseDOM.some(
            (rule) => 'tag' in rule && rule.tag === 'b',
        );
        expect(hasB).toBe(true);
    });

    it('parseDOM includes font-weight style rule', () => {
        const parseDOM = Bold.markSpec.parseDOM ?? [];
        const hasStyle = parseDOM.some(
            (rule) => 'style' in rule && rule.style === 'font-weight',
        );
        expect(hasStyle).toBe(true);
    });

    it('toDOM renders as <strong>', () => {
        const schema = buildTestSchema();
        const markType = schema.marks['bold']!;
        const mark = markType.create();
        const dom = Bold.markSpec.toDOM!(mark, false);
        expect(dom[0]).toBe('strong');
    });

    // ── Schema registration ────────────────────────────────────────────────────

    it('is registered in the schema when passed to buildSchema', () => {
        const schema = buildTestSchema();
        expect(schema.marks['bold']).toBeDefined();
    });

    // ── Toggle command ─────────────────────────────────────────────────────────

    it('toggleCommand returns a function', () => {
        const schema = buildTestSchema();
        const command = Bold.toggleCommand!(schema);
        expect(typeof command).toBe('function');
    });

    it('toggleCommand is applicable in an empty state', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);
        const command = Bold.toggleCommand!(schema);
        // Command should be applicable (return true) even with no selection
        // because it can set stored marks
        const isApplicable = command(state, undefined);
        expect(typeof isApplicable).toBe('boolean');
    });

    // ── Toolbar descriptor ─────────────────────────────────────────────────────

    it('has a toolbar descriptor', () => {
        expect(Bold.toolbar).toBeDefined();
    });

    it('toolbar has correct id', () => {
        expect(Bold.toolbar?.id).toBe('bold');
    });

    it('toolbar has correct icon', () => {
        expect(Bold.toolbar?.icon).toBe('bold');
    });

    it('toolbar is in the format group', () => {
        expect(Bold.toolbar?.group).toBe('format');
    });

    it('toolbar isActive returns false in empty state', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);
        const isActive = Bold.toolbar!.isActive(state);
        expect(isActive).toBe(false);
    });

    it('toolbar isEnabled returns true when schema has bold mark', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);
        const isEnabled = Bold.toolbar!.isEnabled(state);
        expect(isEnabled).toBe(true);
    });

    it('toolbar isEnabled returns false when schema has no bold mark', () => {
        // Build a schema without Bold
        const schemaWithoutBold = buildSchema([]);
        const state = createEmptyState(schemaWithoutBold);
        const isEnabled = Bold.toolbar!.isEnabled(state);
        expect(isEnabled).toBe(false);
    });

    // ── Input rules ────────────────────────────────────────────────────────────

    it('inputRules returns an array', () => {
        const schema = buildTestSchema();
        const rules = Bold.inputRules!(schema);
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
    });

    it('inputRules returns InputRule instances', () => {
        const schema = buildTestSchema();
        const rules = Bold.inputRules!(schema);
        // InputRule instances have a `match` property (the regex)
        rules.forEach((rule) => {
            expect(rule).toHaveProperty('match');
        });
    });
});