/**
 * italic.test.ts
 *
 * Unit tests for the Italic mark extension.
 */

import { describe, it, expect } from 'vitest';
import { Italic } from '../../../src/extensions/italic';
import { buildSchema } from '../../../src/core/schema';
import { EditorState } from 'prosemirror-state';

function createEmptyState(schema: ReturnType<typeof buildSchema>): EditorState {
    return EditorState.create({
        schema,
        doc: schema.topNodeType.createAndFill()!,
    });
}

describe('Italic extension', () => {

    it('has name "italic"', () => {
        expect(Italic.name).toBe('italic');
    });

    it('is a mark extension', () => {
        expect(Italic.type).toBe('mark');
    });

    it('declares a Mod-i shortcut', () => {
        expect(Italic.shortcut).toBe('Mod-i');
    });

    it('parseDOM includes <em> tag rule', () => {
        const parseDOM = Italic.markSpec.parseDOM ?? [];
        const hasEm = parseDOM.some(
            (rule) => 'tag' in rule && rule.tag === 'em',
        );
        expect(hasEm).toBe(true);
    });

    it('parseDOM includes <i> tag rule', () => {
        const parseDOM = Italic.markSpec.parseDOM ?? [];
        const hasI = parseDOM.some(
            (rule) => 'tag' in rule && rule.tag === 'i',
        );
        expect(hasI).toBe(true);
    });

    it('toDOM renders as <em>', () => {
        const schema = buildSchema([Italic]);
        const markType = schema.marks['italic']!;
        const mark = markType.create();
        const dom = Italic.markSpec.toDOM!(mark, false);
        expect(dom[0]).toBe('em');
    });

    it('is registered in the schema', () => {
        const schema = buildSchema([Italic]);
        expect(schema.marks['italic']).toBeDefined();
    });

    it('toolbar isActive returns false in empty state', () => {
        const schema = buildSchema([Italic]);
        const state = createEmptyState(schema);
        expect(Italic.toolbar!.isActive(state)).toBe(false);
    });

    it('toolbar has correct group', () => {
        expect(Italic.toolbar?.group).toBe('format');
    });

    it('provides input rules', () => {
        const schema = buildSchema([Italic]);
        const rules = Italic.inputRules!(schema);
        expect(rules.length).toBeGreaterThanOrEqual(2); // *text* and _text_
    });
});