/**
 * color.test.ts
 *
 * Unit tests for TextColor and Highlight mark extensions.
 * Focus: color validation before mark application.
 */

import { describe, it, expect, vi } from 'vitest';
import {
    TextColor,
    Highlight,
    applyTextColor,
    applyHighlight,
    removeTextColor,
    removeHighlight,
} from '../../../src/extensions/color';
import { buildSchema } from '../../../src/core/schema';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

function buildTestSchema(): ReturnType<typeof buildSchema> {
    return buildSchema([TextColor, Highlight]);
}

function createEmptyState(schema: ReturnType<typeof buildSchema>): EditorState {
    return EditorState.create({
        schema,
        doc: schema.topNodeType.createAndFill()!,
    });
}

function createMockView(schema: ReturnType<typeof buildSchema>): EditorView {
    const state = createEmptyState(schema);
    return {
        state,
        dispatch: vi.fn(),
        focus: vi.fn(),
    } as unknown as EditorView;
}

describe('TextColor extension', () => {

    it('has name "text_color"', () => {
        expect(TextColor.name).toBe('text_color');
    });

    it('is a mark extension', () => {
        expect(TextColor.type).toBe('mark');
    });

    it('registers in schema', () => {
        const schema = buildTestSchema();
        expect(schema.marks['text_color']).toBeDefined();
    });

    it('has color attribute defaulting to null', () => {
        const attrs = TextColor.markSpec.attrs as Record<string, { default: unknown }>;
        expect(attrs['color']?.default).toBeNull();
    });

    it('toolbar is in format group', () => {
        expect(TextColor.toolbar?.group).toBe('format');
    });

    it('toolbar isEnabled when schema has text_color mark', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);
        expect(TextColor.toolbar!.isEnabled(state)).toBe(true);
    });
});

describe('Highlight extension', () => {

    it('has name "highlight"', () => {
        expect(Highlight.name).toBe('highlight');
    });

    it('registers in schema', () => {
        const schema = buildTestSchema();
        expect(schema.marks['highlight']).toBeDefined();
    });

    it('has color attribute defaulting to yellow', () => {
        const attrs = Highlight.markSpec.attrs as Record<string, { default: unknown }>;
        expect(attrs['color']?.default).toBe('#FFFF00');
    });

    it('toDOM renders as <mark> element', () => {
        const schema = buildTestSchema();
        const markType = schema.marks['highlight']!;
        const mark = markType.create({ color: '#FFFF00' });
        const dom = Highlight.markSpec.toDOM!(mark, false) as [string, ...unknown[]];
        expect(dom[0]).toBe('mark');
    });
});

describe('applyTextColor', () => {

    it('rejects invalid color values', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyTextColor(view, 'not-a-color!!!');
        expect(result).toBe(false);
        expect(view.dispatch).not.toHaveBeenCalled();
    });

    it('rejects CSS injection via color value', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyTextColor(view, 'red; display: none');
        expect(result).toBe(false);
    });

    it('rejects url() in color value', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyTextColor(view, 'url(javascript:alert(1))');
        expect(result).toBe(false);
    });

    it('accepts valid hex color', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyTextColor(view, '#FF0000');
        expect(result).toBe(true);
    });

    it('accepts valid rgb() color', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyTextColor(view, 'rgb(255, 0, 0)');
        expect(result).toBe(true);
    });

    it('accepts named colors', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyTextColor(view, 'red');
        expect(result).toBe(true);
    });

    it('returns false when text_color mark is not in schema', () => {
        const schemaWithout = buildSchema([]);
        const view = createMockView(schemaWithout);
        const result = applyTextColor(view, '#FF0000');
        expect(result).toBe(false);
    });
});

describe('applyHighlight', () => {

    it('rejects invalid color', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyHighlight(view, 'invalid!!!');
        expect(result).toBe(false);
    });

    it('accepts valid hex color', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        const result = applyHighlight(view, '#FFFF00');
        expect(result).toBe(true);
    });
});

describe('removeTextColor', () => {

    it('dispatches a transaction when called', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        removeTextColor(view);
        expect(view.dispatch).toHaveBeenCalled();
    });
});

describe('removeHighlight', () => {

    it('dispatches a transaction when called', () => {
        const schema = buildTestSchema();
        const view = createMockView(schema);
        removeHighlight(view);
        expect(view.dispatch).toHaveBeenCalled();
    });
});