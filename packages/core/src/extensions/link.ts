/**
 * link.ts
 *
 * Hyperlink mark extension.
 *
 * Security is the primary concern here:
 * - All href values are validated through sanitizeURL() before insertion
 * - javascript: and other dangerous URI schemes are blocked at the mark level
 * - All external links get rel="noopener noreferrer" automatically
 * - The mark stores href, target, and rel as attributes — not raw HTML
 *
 * The Link extension does not auto-detect URLs as the user types.
 * Links are inserted explicitly via the LinkPopover UI component.
 * This is intentional — auto-linking can create unexpected behaviour
 * and is better handled as a separate opt-in extension.
 *
 * Shortcut: Mod+K — opens the LinkPopover
 */

import { toggleMark } from 'prosemirror-commands';
import type { Schema } from 'prosemirror-model';
import type { NexMarkExtension } from '../types/extension.types';
import { isMarkActive } from '../core/commands';
import { sanitizeURL } from '../security/sanitizer';

export const Link: NexMarkExtension = {
    name: 'link',
    type: 'mark',
    priority: 100,

    markSpec: {
        // Links are inclusive: false — when the cursor is at the end of a link,
        // new text typed will NOT be part of the link.
        // This matches natural user expectations.
        inclusive: false,

        attrs: {
            // href is the only required attribute
            href: { default: null },

            // target: '_blank' opens in a new tab — we enforce noopener automatically
            target: { default: null },

            // rel is always set to 'noopener noreferrer' for external links
            rel: { default: 'noopener noreferrer' },

            // Optional: link title for tooltip
            title: { default: null },
        },

        parseDOM: [
            {
                tag: 'a[href]',
                getAttrs(dom) {
                    const el = dom as HTMLAnchorElement;
                    const href = el.getAttribute('href');

                    // Validate href on parse — reject dangerous URLs even from trusted HTML
                    const safeHref = href ? sanitizeURL(href) : null;
                    if (!safeHref) return false; // Returning false rejects this DOM node

                    return {
                        href: safeHref,
                        target: el.getAttribute('target'),
                        // Always enforce noopener noreferrer regardless of source
                        rel: 'noopener noreferrer',
                        title: el.getAttribute('title'),
                    };
                },
            },
        ],

        toDOM(node) {
            const { href, target, rel, title } = node.attrs as {
                href: string | null;
                target: string | null;
                rel: string;
                title: string | null;
            };

            // Build the attribute object — omit null values
            const attrs: Record<string, string> = {
                rel: rel ?? 'noopener noreferrer',
            };

            if (href) attrs['href'] = href;
            if (target) attrs['target'] = target;
            if (title) attrs['title'] = title;

            return ['a', attrs, 0];
        },
    },

    // Mod+K — conventional link shortcut (matches VS Code, Google Docs, Notion)
    shortcut: 'Mod-k',

    toggleCommand(schema: Schema) {
        return toggleMark(schema.marks['link']!);
    },

    toolbar: {
        id: 'link',
        label: 'Link',
        shortcutHint: 'Mod+K',
        icon: 'link',
        group: 'insert',

        isActive(state) {
            const markType = state.schema.marks['link'];
            if (!markType) return false;
            return isMarkActive(state, markType);
        },

        isEnabled(state) {
            // Link can only be applied when text is selected or cursor is in a link
            return !!state.schema.marks['link'];
        },

        execute(view) {
            // The actual link insertion is handled by the LinkPopover component.
            // This toolbar button signals the popover to open — the popover
            // reads the current selection and collects the URL from the user.
            const event = new CustomEvent('nex:open-link-popover', {
                bubbles: true,
                detail: { view },
            });
            view.dom.dispatchEvent(event);
        },
    },
};

// ─── Link Helpers ─────────────────────────────────────────────────────────────

/**
 * Get the link mark at the current cursor position, if any.
 * Used by the LinkPopover to pre-fill the URL input when editing an existing link.
 *
 * @returns The link mark's attributes, or null if cursor is not on a link
 */
export function getLinkAtCursor(
    state: import('prosemirror-state').EditorState,
): { href: string; target: string | null; title: string | null } | null {
    const markType = state.schema.marks['link'];
    if (!markType) return null;

    const { $from } = state.selection;

    // Find the link mark at the cursor position
    const mark = markType.isInSet($from.marks());
    if (!mark) return null;

    const attrs = mark.attrs as {
        href: string | null;
        target: string | null;
        title: string | null;
    };

    return {
        href: attrs.href ?? '',
        target: attrs.target,
        title: attrs.title,
    };
}

/**
 * Insert or update a link at the current selection.
 *
 * If text is selected: wraps the selection in a link mark.
 * If no text is selected: inserts the URL as linked text.
 *
 * The href is validated through sanitizeURL() before insertion.
 * Returns false if the URL is unsafe.
 */
export function insertLink(
    view: import('prosemirror-view').EditorView,
    href: string,
    options: { target?: string; title?: string } = {},
): boolean {
    const { state, dispatch } = view;
    const markType = state.schema.marks['link'];
    if (!markType) return false;

    // Validate the URL before touching the document
    const safeHref = sanitizeURL(href);
    if (!safeHref) {
        console.warn('[NexEditor] insertLink: URL rejected by sanitizer:', href);
        return false;
    }

    const attrs = {
        href: safeHref,
        target: options.target ?? null,
        rel: 'noopener noreferrer',
        title: options.title ?? null,
    };

    const { from, to, empty } = state.selection;

    if (empty) {
        // No selection — insert the URL as the link text
        const linkNode = state.schema.text(safeHref, [markType.create(attrs)]);
        dispatch(state.tr.replaceSelectionWith(linkNode).scrollIntoView());
    } else {
        // Selection exists — apply link mark to the selected text
        toggleMark(markType, attrs)(state, dispatch, view);
    }

    view.focus();
    return true;
}

/**
 * Remove the link mark at the current cursor position or selection.
 */
export function removeLink(
    view: import('prosemirror-view').EditorView,
): void {
    const { state, dispatch } = view;
    const markType = state.schema.marks['link'];
    if (!markType) return;

    const { from, to } = state.selection;
    dispatch(state.tr.removeMark(from, to, markType));
    view.focus();
}