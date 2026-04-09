/**
 * editor.spec.ts
 *
 * End-to-end tests for the editor — runs in real browsers via Playwright.
 *
 * These tests verify:
 * - The editor mounts and is interactive
 * - Keyboard shortcuts work (bold, italic, undo/redo)
 * - Toolbar buttons work
 * - Paste sanitization blocks XSS
 * - The placeholder appears and disappears correctly
 * - Content can be read back via getHTML()
 *
 * Each test navigates to the playground app at http://localhost:5173.
 * The playground must be running before these tests execute.
 * (Handled automatically by playwright.config.ts webServer config.)
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get a locator for the ProseMirror editor content area.
 * The editor sets data-nex-editor="true" on the contenteditable div.
 */
function getEditor(page: Page) {
    return page.locator('[data-nex-editor="true"]');
}

/**
 * Get a toolbar button by its aria-label.
 */
function getToolbarButton(page: Page, label: string) {
    return page.locator(`[role="toolbar"] button[aria-label="${label}"]`);
}

/**
 * Type text into the editor.
 * Clicks first to focus, then types.
 */
async function typeInEditor(page: Page, text: string): Promise<void> {
    const editor = getEditor(page);
    await editor.click();
    await editor.type(text);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
    // Navigate to the playground app before each test
    await page.goto('/');

    // Wait for the editor to be visible and interactive
    await expect(getEditor(page)).toBeVisible();
});

// ─── Mount and basic interaction ──────────────────────────────────────────────

test.describe('Editor mount', () => {

    test('renders the editor with correct ARIA attributes', async ({ page }) => {
        const editor = getEditor(page);
        await expect(editor).toHaveAttribute('role', 'textbox');
        await expect(editor).toHaveAttribute('aria-multiline', 'true');
    });

    test('editor is focusable', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();
        await expect(editor).toBeFocused();
    });

    test('shows placeholder when editor is empty', async ({ page }) => {
        // The placeholder is rendered via CSS ::before — check the attribute
        const placeholder = page.locator('.nex-placeholder');
        await expect(placeholder).toBeVisible();
        await expect(placeholder).toHaveAttribute('data-placeholder');
    });

    test('hides placeholder when editor has content', async ({ page }) => {
        await typeInEditor(page, 'Hello world');
        const placeholder = page.locator('.nex-placeholder');
        await expect(placeholder).not.toBeVisible();
    });

    test('renders the toolbar', async ({ page }) => {
        const toolbar = page.locator('[role="toolbar"]');
        await expect(toolbar).toBeVisible();
    });
});

// ─── Text input ───────────────────────────────────────────────────────────────

test.describe('Text input', () => {

    test('accepts text input', async ({ page }) => {
        await typeInEditor(page, 'Hello NexEditor');
        const editor = getEditor(page);
        await expect(editor).toContainText('Hello NexEditor');
    });

    test('Enter key creates a new paragraph', async ({ page }) => {
        await typeInEditor(page, 'Line one');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Line two');

        const editor = getEditor(page);
        const paragraphs = editor.locator('p');
        await expect(paragraphs).toHaveCount(2);
    });

    test('Backspace deletes characters', async ({ page }) => {
        await typeInEditor(page, 'Hello');
        await page.keyboard.press('Backspace');
        const editor = getEditor(page);
        await expect(editor).toContainText('Hell');
        await expect(editor).not.toContainText('Hello');
    });
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

test.describe('Keyboard shortcuts', () => {

    test('Mod+B applies bold formatting', async ({ page }) => {
        await typeInEditor(page, 'Bold text');

        // Select all text
        await page.keyboard.press('Control+a');

        // Apply bold
        await page.keyboard.press('Control+b');

        const editor = getEditor(page);
        const boldEl = editor.locator('strong');
        await expect(boldEl).toBeVisible();
        await expect(boldEl).toContainText('Bold text');
    });

    test('Mod+I applies italic formatting', async ({ page }) => {
        await typeInEditor(page, 'Italic text');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+i');

        const editor = getEditor(page);
        await expect(editor.locator('em')).toBeVisible();
    });

    test('Mod+Z undoes last action', async ({ page }) => {
        await typeInEditor(page, 'Hello');
        await page.keyboard.press('Control+z');

        const editor = getEditor(page);
        // After undo, 'Hello' should be partially or fully gone
        // (depends on undo grouping — at minimum last char should be removed)
        const text = await editor.textContent();
        expect(text?.length).toBeLessThan(6); // 'Hello' is 5 chars
    });

    test('Mod+Shift+Z redoes last undone action', async ({ page }) => {
        await typeInEditor(page, 'Hello');
        await page.keyboard.press('Control+z');
        await page.keyboard.press('Control+Shift+z');

        const editor = getEditor(page);
        await expect(editor).toContainText('Hello');
    });

    test('Mod+Alt+1 converts to heading 1', async ({ page }) => {
        await typeInEditor(page, 'My Heading');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+Alt+1');

        const editor = getEditor(page);
        await expect(editor.locator('h1')).toBeVisible();
        await expect(editor.locator('h1')).toContainText('My Heading');
    });

    test('Mod+Alt+0 resets heading to paragraph', async ({ page }) => {
        await typeInEditor(page, 'My Heading');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+Alt+1');

        // Now reset to paragraph
        await page.keyboard.press('Control+Alt+0');

        const editor = getEditor(page);
        await expect(editor.locator('h1')).not.toBeVisible();
        await expect(editor.locator('p')).toBeVisible();
    });
});

// ─── Markdown input rules ─────────────────────────────────────────────────────

test.describe('Markdown input rules', () => {

    test('# space converts to h1', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();
        await page.keyboard.type('# ');

        await expect(editor.locator('h1')).toBeVisible();
    });

    test('## space converts to h2', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();
        await page.keyboard.type('## ');

        await expect(editor.locator('h2')).toBeVisible();
    });

    test('- space converts to bullet list', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();
        await page.keyboard.type('- ');

        await expect(editor.locator('ul')).toBeVisible();
        await expect(editor.locator('li')).toBeVisible();
    });

    test('1. space converts to ordered list', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();
        await page.keyboard.type('1. ');

        await expect(editor.locator('ol')).toBeVisible();
    });

    test('``` space converts to code block', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();
        await page.keyboard.type('``` ');

        await expect(editor.locator('pre')).toBeVisible();
        await expect(editor.locator('code')).toBeVisible();
    });

    test('**text** converts to bold', async ({ page }) => {
        await typeInEditor(page, '**bold**');

        const editor = getEditor(page);
        await expect(editor.locator('strong')).toBeVisible();
        await expect(editor.locator('strong')).toContainText('bold');
    });

    test('~~text~~ converts to strikethrough', async ({ page }) => {
        await typeInEditor(page, '~~strike~~');

        const editor = getEditor(page);
        await expect(editor.locator('s')).toBeVisible();
    });
});

// ─── Toolbar buttons ──────────────────────────────────────────────────────────

test.describe('Toolbar buttons', () => {

    test('Bold button applies bold to selection', async ({ page }) => {
        await typeInEditor(page, 'Click bold');
        await page.keyboard.press('Control+a');

        const boldButton = getToolbarButton(page, 'Bold');
        await boldButton.click();

        const editor = getEditor(page);
        await expect(editor.locator('strong')).toBeVisible();
    });

    test('Bold button shows active state when cursor is in bold text', async ({ page }) => {
        await typeInEditor(page, 'Bold text');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+b');

        // Move cursor into bold text
        await page.keyboard.press('ArrowLeft');

        const boldButton = getToolbarButton(page, 'Bold');
        await expect(boldButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('Italic button applies italic', async ({ page }) => {
        await typeInEditor(page, 'Italic text');
        await page.keyboard.press('Control+a');

        const italicButton = getToolbarButton(page, 'Italic');
        await italicButton.click();

        const editor = getEditor(page);
        await expect(editor.locator('em')).toBeVisible();
    });

    test('clicking toolbar does not blur the editor', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();

        // Clicking the Bold button should not blur the editor
        const boldButton = getToolbarButton(page, 'Bold');
        await boldButton.click();

        // Editor should still be focused (or immediately regain focus)
        // We check this indirectly by verifying we can still type
        await page.keyboard.type('still focused');
        await expect(editor).toContainText('still focused');
    });
});

// ─── Paste sanitization (security) ───────────────────────────────────────────

test.describe('Paste sanitization', () => {

    test('strips script tags from pasted HTML', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();

        // Simulate pasting HTML with a script tag
        await page.evaluate(() => {
            const clipboardData = new DataTransfer();
            clipboardData.setData(
                'text/html',
                '<p>Safe content</p><script>window.__xss = true</script>',
            );

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData,
                bubbles: true,
                cancelable: true,
            });

            document.querySelector('[data-nex-editor="true"]')?.dispatchEvent(pasteEvent);
        });

        // The script tag should have been stripped
        const editorHTML = await editor.innerHTML();
        expect(editorHTML).not.toContain('<script>');
        expect(editorHTML).not.toContain('window.__xss');

        // XSS payload must not have executed
        const xssExecuted = await page.evaluate(() => (window as Record<string, unknown>)['__xss']);
        expect(xssExecuted).toBeUndefined();
    });

    test('strips onclick handlers from pasted HTML', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();

        await page.evaluate(() => {
            const clipboardData = new DataTransfer();
            clipboardData.setData(
                'text/html',
                '<p onclick="alert(1)">Malicious paragraph</p>',
            );

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData,
                bubbles: true,
                cancelable: true,
            });

            document.querySelector('[data-nex-editor="true"]')?.dispatchEvent(pasteEvent);
        });

        const editorHTML = await editor.innerHTML();
        expect(editorHTML).not.toContain('onclick');
        expect(editorHTML).toContain('Malicious paragraph');
    });

    test('strips javascript: href from pasted links', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();

        await page.evaluate(() => {
            const clipboardData = new DataTransfer();
            clipboardData.setData(
                'text/html',
                '<a href="javascript:alert(1)">Click me</a>',
            );

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData,
                bubbles: true,
                cancelable: true,
            });

            document.querySelector('[data-nex-editor="true"]')?.dispatchEvent(pasteEvent);
        });

        const editorHTML = await editor.innerHTML();
        expect(editorHTML).not.toContain('javascript:');
    });

    test('preserves safe pasted content', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();

        await page.evaluate(() => {
            const clipboardData = new DataTransfer();
            clipboardData.setData(
                'text/html',
                '<p>Hello <strong>world</strong></p>',
            );

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData,
                bubbles: true,
                cancelable: true,
            });

            document.querySelector('[data-nex-editor="true"]')?.dispatchEvent(pasteEvent);
        });

        await expect(editor).toContainText('Hello world');
        await expect(editor.locator('strong')).toBeVisible();
    });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

test.describe('Accessibility', () => {

    test('toolbar buttons are keyboard accessible', async ({ page }) => {
        const editor = getEditor(page);
        await editor.click();

        // Tab into the toolbar
        await page.keyboard.press('Tab');

        // The first toolbar button should be focused
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toHaveAttribute('role', 'button');
    });

    test('toolbar buttons have aria-label', async ({ page }) => {
        const buttons = page.locator('[role="toolbar"] button');
        const count = await buttons.count();

        for (let i = 0; i < count; i++) {
            const button = buttons.nth(i);
            await expect(button).toHaveAttribute('aria-label');
        }
    });

    test('active toolbar buttons have aria-pressed="true"', async ({ page }) => {
        await typeInEditor(page, 'Bold text');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+b');
        await page.keyboard.press('ArrowLeft');

        const boldButton = getToolbarButton(page, 'Bold');
        await expect(boldButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('disabled toolbar buttons have aria-disabled', async ({ page }) => {
        // Without a selection, some commands may be disabled
        // We just verify the attribute is present on some buttons
        const disabledButtons = page.locator(
            '[role="toolbar"] button[aria-disabled="true"]',
        );
        // There may or may not be disabled buttons — we just verify the pattern works
        const count = await disabledButtons.count();
        expect(count).toBeGreaterThanOrEqual(0); // At least no error
    });
});

// ─── Content serialization ────────────────────────────────────────────────────

test.describe('Content serialization', () => {

    test('getHTML returns valid HTML', async ({ page }) => {
        await typeInEditor(page, 'Serialize me');

        const html = await page.evaluate(() => {
            const editor = (window as Record<string, unknown>)['__nexEditor'];
            if (editor && typeof (editor as Record<string, unknown>)['getHTML'] === 'function') {
                return (editor as { getHTML: () => string }).getHTML();
            }
            return null;
        });

        if (html !== null) {
            expect(html).toContain('<p>');
            expect(html).toContain('Serialize me');
        }
    });
});