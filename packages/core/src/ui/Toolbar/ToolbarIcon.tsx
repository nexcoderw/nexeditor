/**
 * ToolbarIcon.tsx
 *
 * Renders SVG icons for toolbar buttons.
 *
 * All icons are inline SVG — no external icon font dependency.
 * This means:
 * - Zero extra network requests
 * - No icon font FOUT (flash of unstyled text)
 * - Full control over sizing and color via CSS currentColor
 * - Works offline and in restricted network environments
 *
 * Icons use currentColor so they inherit the button's text color.
 * Active and disabled states change color via CSS on the parent button.
 */

'use client';

// ─── Icon Map ─────────────────────────────────────────────────────────────────

type IconName =
    | 'bold' | 'italic' | 'underline' | 'strikethrough'
    | 'heading' | 'paragraph'
    | 'list-bullet' | 'list-ordered'
    | 'link' | 'image' | 'table'
    | 'code-block' | 'text-color' | 'highlight' | 'font-family' | 'font-size'
    | 'align-left' | 'align-center' | 'align-right' | 'align-justify'
    | 'undo' | 'redo' | 'clear-formatting';

interface ToolbarIconProps {
    name: string;
    size?: number;
}

export function ToolbarIcon({ name, size = 16 }: ToolbarIconProps): JSX.Element {
    const icon = ICONS[name as IconName];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {icon ?? <path d="M12 12h.01" />}
        </svg>
    );
}

// ─── Icon Paths ───────────────────────────────────────────────────────────────
// All paths follow the Lucide icon style — 24x24 grid, 2px stroke

const ICONS: Record<IconName, JSX.Element> = {
    bold: (
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    ),

    italic: (
        <>
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
        </>
    ),

    underline: (
        <>
            <path d="M6 4v6a6 6 0 0 0 12 0V4" />
            <line x1="4" y1="20" x2="20" y2="20" />
        </>
    ),

    strikethrough: (
        <>
            <path d="M16 4H9a3 3 0 0 0-2.83 4" />
            <path d="M14 12a4 4 0 0 1 0 8H6" />
            <line x1="4" y1="12" x2="20" y2="12" />
        </>
    ),

    heading: (
        <>
            <path d="M4 12h16" />
            <path d="M4 18V6" />
            <path d="M20 18V6" />
        </>
    ),

    paragraph: (
        <>
            <path d="M13 4v16" />
            <path d="M17 4H9.5a4.5 4.5 0 0 0 0 9H13" />
        </>
    ),

    'list-bullet': (
        <>
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
        </>
    ),

    'list-ordered': (
        <>
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </>
    ),

    link: (
        <>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
    ),

    image: (
        <>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </>
    ),

    table: (
        <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
        </>
    ),

    'code-block': (
        <>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </>
    ),

    'text-color': (
        <>
            <path d="M9 7h6l3 10H6L9 7z" />
            <line x1="12" y1="7" x2="12" y2="3" />
            <line x1="4" y1="20" x2="20" y2="20" strokeWidth={3} />
        </>
    ),

    highlight: (
        <>
            <path d="M12 2l3.5 7h7L17 13.5l2.5 7.5-7.5-4.5-7.5 4.5 2.5-7.5L2 9h7z" />
        </>
    ),

    'font-family': (
        <>
            <path d="M4 20V7l8-3 8 3v13" />
            <path d="M12 4v16" />
            <line x1="4" y1="20" x2="20" y2="20" />
        </>
    ),

    'font-size': (
        <>
            <path d="M6 18l4-12 4 12" />
            <line x1="7.5" y1="14" x2="12.5" y2="14" />
            <line x1="16" y1="8" x2="22" y2="8" />
            <line x1="19" y1="5" x2="19" y2="11" />
        </>
    ),

    'align-left': (
        <>
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
        </>
    ),

    'align-center': (
        <>
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
        </>
    ),

    'align-right': (
        <>
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
        </>
    ),

    'align-justify': (
        <>
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
        </>
    ),

    undo: (
        <>
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </>
    ),

    redo: (
        <>
            <polyline points="15 14 20 9 15 4" />
            <path d="M4 20v-7a4 4 0 0 0 4-4h12" />
        </>
    ),

    'clear-formatting': (
        <>
            <path d="M17 11H6.5a4 4 0 0 0 0 8H11" />
            <path d="M13 7h6" />
            <path d="M6 17L17 6" />
            <line x1="3" y1="21" x2="21" y2="3" />
        </>
    ),
};
