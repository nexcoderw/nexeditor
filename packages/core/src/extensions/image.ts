/**
 * image.ts
 *
 * Image node extension.
 *
 * Security:
 * - All image src values are validated through sanitizeURL()
 * - Only https:// and relative paths are accepted — no data: URIs
 * - Width and height are validated as numbers to prevent attribute injection
 * - Alt text is preserved for accessibility
 *
 * Images are inline nodes (they sit inside paragraphs) but behave like
 * block elements visually. This matches how most rich text editors handle images.
 *
 * Image upload is NOT handled by this extension — consumers handle
 * file upload in their application and pass a URL to insertImage().
 * This separation keeps the editor UI-agnostic and storage-agnostic.
 */

import type { NexNodeExtension } from '../types/extension.types';
import { sanitizeURL } from '../security/sanitizer';

export const Image: NexNodeExtension = {
    name: 'image',
    type: 'node',
    priority: 100,

    nodeSpec: {
        // Images sit inline within text content
        inline: true,
        group: 'inline',

        // Images are leaf nodes — they have no children
        atom: true,

        attrs: {
            src: { default: '' },
            alt: { default: null },
            title: { default: null },
            width: { default: null },
            height: { default: null },
        },

        parseDOM: [
            {
                tag: 'img[src]',
                getAttrs(dom) {
                    const el = dom as HTMLImageElement;
                    const src = el.getAttribute('src');

                    // Validate src — reject data: URIs and other unsafe schemes
                    const safeSrc = src ? sanitizeURL(src) : null;
                    if (!safeSrc) return false; // Reject this image entirely

                    const width = el.getAttribute('width');
                    const height = el.getAttribute('height');

                    return {
                        src: safeSrc,
                        alt: el.getAttribute('alt') ?? null,
                        title: el.getAttribute('title') ?? null,
                        // Validate dimensions are numeric — prevent attribute injection
                        width: width && /^\d+$/.test(width) ? parseInt(width, 10) : null,
                        height: height && /^\d+$/.test(height) ? parseInt(height, 10) : null,
                    };
                },
            },
        ],

        toDOM(node) {
            const { src, alt, title, width, height } = node.attrs as {
                src: string;
                alt: string | null;
                title: string | null;
                width: number | null;
                height: number | null;
            };

            const attrs: Record<string, string> = { src };

            // Alt text is critical for accessibility — always include even if empty
            attrs['alt'] = alt ?? '';
            if (title) attrs['title'] = title;

            // Only include dimensions if explicitly set
            if (width !== null) attrs['width'] = String(width);
            if (height !== null) attrs['height'] = String(height);

            // loading="lazy" improves performance for documents with many images
            attrs['loading'] = 'lazy';

            return ['img', attrs];
        },
    },

    toolbar: {
        id: 'image',
        label: 'Image',
        icon: 'image',
        group: 'media',

        isActive(_state) {
            // Images cannot be "active" in the mark sense — return false always
            return false;
        },

        isEnabled(state) {
            return !!state.schema.nodes['image'];
        },

        execute(view) {
            // Signal the UI layer to open the image insertion dialog
            const event = new CustomEvent('nex:open-image-dialog', {
                bubbles: true,
                detail: { view },
            });
            view.dom.dispatchEvent(event);
        },
    },
};

// ─── Image Helpers ────────────────────────────────────────────────────────────

export interface InsertImageOptions {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
}

/**
 * Insert an image at the current cursor position.
 *
 * The src is validated before insertion — unsafe URLs are rejected.
 * Returns true if the image was inserted, false if the URL was unsafe.
 *
 * @example
 * // After a user uploads a file and gets back a URL:
 * insertImage(view, {
 *   src: 'https://cdn.example.com/uploads/photo.jpg',
 *   alt: 'A beautiful photo',
 *   width: 800,
 *   height: 600,
 * });
 */
export function insertImage(
    view: import('prosemirror-view').EditorView,
    options: InsertImageOptions,
): boolean {
    const { state, dispatch } = view;
    const nodeType = state.schema.nodes['image'];
    if (!nodeType) return false;

    // Validate and sanitize the src before inserting into the document
    const safeSrc = sanitizeURL(options.src);
    if (!safeSrc) {
        console.warn('[NexEditor] insertImage: URL rejected by sanitizer:', options.src);
        return false;
    }

    const attrs = {
        src: safeSrc,
        alt: options.alt ?? null,
        title: options.title ?? null,
        width: options.width ?? null,
        height: options.height ?? null,
    };

    const node = nodeType.createAndFill(attrs);
    if (!node) return false;

    dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
    view.focus();
    return true;
}