/**
 * dom.ts
 *
 * DOM utility functions used across the editor UI.
 *
 * All functions in this file are browser-only.
 * Guard calls with typeof window !== 'undefined' when used
 * in a Next.js SSR context.
 */

/**
 * Check whether a DOM node is inside a given container element.
 * Used by popovers and dropdowns to detect outside clicks.
 *
 * @param node      - The node to check (usually event.target)
 * @param container - The container element
 * @returns         - true if node is inside container
 */
export function isInsideElement(
    node: Node | null,
    container: Element | null,
): boolean {
    if (!node || !container) return false;
    return container.contains(node);
}

/**
 * Get the bounding rect of a DOM element relative to the viewport.
 * Returns null if the element is not mounted.
 */
export function getElementRect(
    element: Element | null,
): DOMRect | null {
    if (!element) return null;
    return element.getBoundingClientRect();
}

/**
 * Check whether an element would overflow the right edge of the viewport
 * if placed at a given left position with a given width.
 *
 * Used by dropdown and popover positioning logic.
 *
 * @param left  - Proposed left position in px
 * @param width - Element width in px
 * @returns     - true if the element would overflow the right edge
 */
export function wouldOverflowRight(left: number, width: number): boolean {
    if (typeof window === 'undefined') return false;
    return left + width > window.innerWidth - 8; // 8px safety margin
}

/**
 * Check whether an element would overflow the top of the viewport
 * if placed at a given top position.
 *
 * @param top    - Proposed top position in px
 * @param height - Element height in px
 * @returns      - true if the element would overflow the top edge
 */
export function wouldOverflowTop(top: number, height: number): boolean {
    return top - height < 8; // 8px safety margin
}

/**
 * Clamp a value between a minimum and maximum.
 * Used to keep popovers within the viewport bounds.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Dispatch a typed CustomEvent on a DOM element.
 * Typed wrapper to avoid repeating the CustomEvent boilerplate.
 *
 * @param element   - Target element
 * @param eventName - Event name (should follow the nex:event-name convention)
 * @param detail    - Event detail payload
 */
export function dispatchEditorEvent<T>(
    element: Element,
    eventName: string,
    detail: T,
): void {
    element.dispatchEvent(
        new CustomEvent(eventName, {
            bubbles: true,
            composed: true, // Cross shadow-DOM boundary if needed
            detail,
        }),
    );
}

/**
 * Get the closest ancestor element matching a CSS selector.
 * Typed wrapper around Element.closest() that handles null safely.
 *
 * @param element  - The starting element
 * @param selector - CSS selector to match
 * @returns        - The closest matching ancestor, or null
 */
export function closest<T extends Element>(
    element: Element | null,
    selector: string,
): T | null {
    if (!element) return null;
    return element.closest<T>(selector);
}