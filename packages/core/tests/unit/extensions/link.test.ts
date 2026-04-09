/**
 * link.test.ts
 *
 * Unit tests for the Link mark extension.
 *
 * Focus: security-critical URL validation behaviour.
 * Every URL scheme we block must be tested here.
 */

import { describe, it, expect, vi } from 'vitest';
import { Link, getLinkAtCursor, insertLink } from '../../../src/extensions/link';
import { buildSchema } from '../../../src/core/schema';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

function buildTestSchema(): ReturnType<typeof buildSchema> {
    return buildSchema([Link]);
}

function createEmptyState(schema: ReturnType<typeof buildSchema>): EditorState {
    return EditorState.create({
        schema,
        doc: schema.topNodeType.createAndFill()!,
    });
}

describe('Link extension', () => {

    // ── Extension shape ────────────────────────────────────────────────────────

    it('has name "link"', () => {
        expect(Link.name).toBe('link');
    });

    it('is a mark extension', () => {
        expect(Link.type).toBe('mark');
    });

    it('declares Mod-k shortcut', () => {
        expect(Link.shortcut).toBe('Mod-k');
    });

    // ── markSpec ──────────────────────────────────────────────────────────────

    it('is non-inclusive — new text after link is not linked', () => {
        expect(Link.markSpec.inclusive).toBe(false);
    });

    it('has href attribute defaulting to null', () => {
        const attrs = Link.markSpec.attrs as Record<string, { default: unknown }>;
        expect(attrs['href']?.default).toBeNull();
    });

    it('has rel attribute defaulting to noopener noreferrer', () => {
        const attrs = Link.markSpec.attrs as Record<string, { default: unknown }>;
        expect(attrs['rel']?.default).toBe('noopener noreferrer');
    });

    it('parseDOM includes a[href] rule', () => {
        const parseDOM = Link.markSpec.parseDOM ?? [];
        const hasAnchor = parseDOM.some(
            (rule) => 'tag' in rule && rule.tag === 'a[href]',
        );
        expect(hasAnchor).toBe(true);
    });

    // ── URL security in parseDOM ───────────────────────────────────────────────

    it('rejects javascript: href during parsing', () => {
        // The getAttrs function returns false to reject nodes with unsafe href
        const parseDOM = Link.markSpec.parseDOM ?? [];
        const anchorRule = parseDOM.find(
            (rule) => 'tag' in rule && rule.tag === 'a[href]',
        );

        expect(anchorRule).toBeDefined();

        if (anchorRule && 'getAttrs' in anchorRule) {
            // Simulate a DOM element with a javascript: href
            const mockEl = {
                getAttribute: (attr: string) => {
                    if (attr === 'href') return 'javascript:alert(1)';
                    return null;
                },
            } as unknown as HTMLElement;

            // getAttrs returns false to reject the element
            const result = (anchorRule.getAttrs as (node: HTMLElement) => unknown)(mockEl);
            expect(result).toBe(false);
        }
    });

    it('accepts https: href during parsing', () => {
        const parseDOM = Link.markSpec.parseDOM ?? [];
        const anchorRule = parseDOM.find(
            (rule) => 'tag' in rule && rule.tag === 'a[href]',
        );

        if (anchorRule && 'getAttrs' in anchorRule) {
            const mockEl = {
                getAttribute: (attr: string) => {
                    if (attr === 'href') return 'https://example.com';
                    return null;
                },
            } as unknown as HTMLElement;

            const result = (anchorRule.getAttrs as (node: HTMLElement) => unknown)(mockEl);
            expect(result).not.toBe(false);
        }
    });

    // ── toDOM ────────────────────────────────────────────────────────────────

    it('toDOM renders noopener noreferrer on all links', () => {
        const schema = buildTestSchema();
        const markType = schema.marks['link']!;
        const mark = markType.create({
            href: 'https://example.com',
            rel: 'noopener noreferrer',
        });

        const dom = Link.markSpec.toDOM!(mark, false) as [string, Record<string, string>, number];
        expect(dom[1]?.['rel']).toContain('noopener');
        expect(dom[1]?.['rel']).toContain('noreferrer');
    });

    // ── Schema registration ────────────────────────────────────────────────────

    it('registers in the schema', () => {
        const schema = buildTestSchema();
        expect(schema.marks['link']).toBeDefined();
    });

    // ── Toolbar ───────────────────────────────────────────────────────────────

    it('has toolbar descriptor in insert group', () => {
        expect(Link.toolbar?.group).toBe('insert');
    });

    it('toolbar isEnabled when link mark is in schema', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);
        expect(Link.toolbar!.isEnabled(state)).toBe(true);
    });

    // ── getLinkAtCursor ────────────────────────────────────────────────────────

    it('getLinkAtCursor returns null when cursor is not on a link', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);
        const result = getLinkAtCursor(state);
        expect(result).toBeNull();
    });

    // ── insertLink ────────────────────────────────────────────────────────────

    it('insertLink rejects javascript: URLs', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);

        // Create a minimal mock EditorView
        const mockView = {
            state,
            dispatch: vi.fn(),
            focus: vi.fn(),
        } as unknown as EditorView;

        const result = insertLink(mockView, 'javascript:alert(1)');
        expect(result).toBe(false);
        expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    it('insertLink rejects data: URIs', () => {
        const schema = buildTestSchema();
        const state = createEmptyState(schema);

        const mockView = {
            state,
            dispatch: vi.fn(),
            focus: vi.fn(),
        } as unknown as EditorView;

        const result = insertLink(mockView, 'data:text/html,<script>alert(1)</script>');
        expect(result).toBe(false);
        expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    it('insertLink accepts valid https URLs', () => {
        const schema = buildTestSchema();
        const doc = schema.nodes['paragraph']!.create(
            null,
            schema.text('Hello world'),
        );
        const fullDoc = schema.topNodeType.create(null, doc);
        const state = EditorState.create({
            schema,
            doc: fullDoc,
        });

        const mockView = {
            state,
            dispatch: vi.fn(),
            focus: vi.fn(),
        } as unknown as EditorView;

        const result = insertLink(mockView, 'https://example.com');
        expect(result).toBe(true);
    });
});