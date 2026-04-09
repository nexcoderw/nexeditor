/**
 * font-size.test.ts
 *
 * Unit tests for the FontSize mark extension and helper commands.
 */

import { describe, expect, it, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { buildSchema } from '../../../src/core/schema';
import {
    FontSize,
    applyFontSize,
    changeFontSize,
    getCurrentFontSize,
    getCurrentFontSizePx,
    MIN_FONT_SIZE_PX,
} from '../../../src/extensions/font-size';

function buildTestSchema(): ReturnType<typeof buildSchema> {
    return buildSchema([FontSize]);
}

function createEmptyState(schema: ReturnType<typeof buildSchema>): EditorState {
    return EditorState.create({
        schema,
        doc: schema.topNodeType.createAndFill()!,
    });
}

function createMockView(state: EditorState): EditorView {
    const view = {
        state,
        dispatch: vi.fn((tr) => {
            view.state = view.state.apply(tr);
        }),
        focus: vi.fn(),
    } as unknown as EditorView & { state: EditorState };

    return view;
}

describe('FontSize extension', () => {
    it('has name "font_size"', () => {
        expect(FontSize.name).toBe('font_size');
    });

    it('is a mark extension', () => {
        expect(FontSize.type).toBe('mark');
    });

    it('registers in the schema', () => {
        const schema = buildTestSchema();
        expect(schema.marks['font_size']).toBeDefined();
    });

    it('toolbar is in the text group', () => {
        expect(FontSize.toolbar?.group).toBe('text');
    });
});

describe('applyFontSize', () => {
    it('rejects invalid font size values', () => {
        const schema = buildTestSchema();
        const view = createMockView(createEmptyState(schema));

        expect(applyFontSize(view, 'calc(100% - 2px)')).toBe(false);
        expect(view.dispatch).not.toHaveBeenCalled();
    });

    it('stores a valid font size mark for subsequent typing', () => {
        const schema = buildTestSchema();
        const view = createMockView(createEmptyState(schema));

        expect(applyFontSize(view, '18px')).toBe(true);
        expect(view.dispatch).toHaveBeenCalledOnce();
        expect(view.focus).toHaveBeenCalledOnce();
        expect(getCurrentFontSize(view.state)).toBe('18px');
        expect(getCurrentFontSizePx(view.state)).toBe(18);
    });

    it('returns false when font_size is not in the schema', () => {
        const schema = buildSchema([]);
        const view = createMockView(createEmptyState(schema));

        expect(applyFontSize(view, '18px')).toBe(false);
    });
});

describe('changeFontSize', () => {
    it('increases the current size', () => {
        const schema = buildTestSchema();
        const view = createMockView(createEmptyState(schema));

        applyFontSize(view, '18px');
        expect(changeFontSize(view, 2)).toBe(true);
        expect(getCurrentFontSize(view.state)).toBe('20px');
    });

    it('clamps to the minimum size', () => {
        const schema = buildTestSchema();
        const view = createMockView(createEmptyState(schema));

        expect(changeFontSize(view, -100)).toBe(true);
        expect(getCurrentFontSizePx(view.state)).toBe(MIN_FONT_SIZE_PX);
    });
});
