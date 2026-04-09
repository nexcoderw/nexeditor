# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.x.x   | ✅ Yes     |

## Reporting a vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Please report security issues to:

**Email:** security@nexcode.africa  
**Website:** https://nexcode.africa  
**Response time:** Within 48 hours

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (optional)

We will acknowledge receipt within 48 hours and provide a fix timeline.
Responsible disclosure is appreciated — we will credit you in the changelog.

---

## Security architecture

### HTML sanitization

All HTML entering the editor — paste, `setContent()`, import, drag-and-drop —
is sanitized through [DOMPurify](https://github.com/cure53/DOMPurify) before
touching the ProseMirror document model.

**Sanitization layers:**

1. **Tag allowlist** — only known-safe HTML elements are permitted
2. **Attribute allowlist** — event handlers, `srcdoc`, `formaction`, and other
   dangerous attributes are always stripped
3. **URL validation** — `javascript:`, `vbscript:`, `data:`, and `blob:` URIs
   are blocked in `href` and `src` attributes
4. **CSS filtering** — inline styles are reduced to a safe subset of visual
   properties; `url()`, `expression()`, `var()`, and `calc()` are blocked
5. **Tab-napping prevention** — all `target="_blank"` links automatically
   receive `rel="noopener noreferrer"`
6. **SVG and MathML blocked** — both have complex parsers with documented
   XSS histories; neither is permitted in editor content

### Google Fonts security

- Font names are validated via a strict regex pattern before any use
- Validated names use a branded TypeScript type (`ValidatedFontFamily`)
  to prevent unvalidated strings from reaching CSS or the FontFace API
- Google Fonts URLs are **constructed** from validated names — never
  from user-supplied URLs (prevents URL injection)
- Only `fonts.gstatic.com` is allowed as a font file source;
  other origins are blocked even if they appear in the Google Fonts CSS

### Content Security Policy

The editor contacts exactly two external domains:
- `https://fonts.googleapis.com` — Google Fonts CSS API
- `https://fonts.gstatic.com` — Google Fonts CDN

Use `buildNextJSCSPHeader()` from `@nexcode/editor` to get the correct
CSP directives without hardcoding them.

### Input validation

Runtime validators (separate from TypeScript types) guard:
- Font family names — regex + explicit dangerous character blocklist
- Color values — only hex, rgb(), rgba(), hsl(), and named colors
- Font sizes — only numeric values with safe CSS units
- Content input — prototype pollution prevention via key blocklist
- URLs — length limit + dangerous scheme blocklist

---

## Known limitations

- The editor does not sanitize content that is programmatically set via
  the ProseMirror API directly (bypassing `setContent()`). If you
  integrate with the ProseMirror API directly, sanitize your input first
  using the exported `sanitizeHTML()` function.

- Collaboration features (future) will require additional security review
  of CRDT patches before they are applied to the document.