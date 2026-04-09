# NexEditor

**A production-grade, secure, Google Fonts-powered RichText editor for React and Next.js.**

Built by [KAJUGA Daniels](https://nexcode.africa) · Powered by ProseMirror

---

## Packages

| Package                              | Description               |
| ------------------------------------ | ------------------------- |
| [`@nexcode/editor`](./packages/core) | The published npm package |
| [`playground`](./apps/playground)    | Development and demo app  |

## Quick start

```bash
# Install dependencies
npm install

# Start the playground (editor dev environment)
npm run dev

# Run unit tests
npm test

# Run E2E tests (playground must be running)
npm run test:e2e

# Build the package
npm run build
```

## Installation (for consumers)

```bash
npm install @nexcode/editor
```

```tsx
// Import styles first
import '@nexcode/editor/styles';

import { NexEditor, Bold, Italic, Heading, Link } from '@nexcode/editor';

export default function MyEditor() {
  return (
    <NexEditor
      extensions={[Bold, Italic, Heading, Link]}
      onUpdate={(editor) => console.log(editor.getHTML())}
    />
  );
}
```

## Next.js App Router

```tsx
// app/editor/page.tsx
'use client'; // Required — the editor uses browser APIs

import '@nexcode/editor/styles';
import { NexEditor, Bold, Italic } from '@nexcode/editor';

export default function EditorPage() {
  return <NexEditor extensions={[Bold, Italic]} />;
}
```

## CSP configuration

The editor loads fonts from Google Fonts. Add these directives to your CSP:

```js
// next.config.js
import { buildNextJSCSPHeader } from '@nexcode/editor';

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [buildNextJSCSPHeader()],
      },
    ];
  },
};
```

## Security

All HTML entering the editor is sanitized via DOMPurify with a strict allowlist.
See [SECURITY.md](./SECURITY.md) for the full security policy and responsible disclosure information.

## License

MIT — © KAJUGA Daniels / [NexCode Africa](https://nexcode.africa)
