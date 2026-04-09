/**
 * main.tsx
 *
 * Playground app entry point.
 * Mounts the React app into the #root div.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error(
        '[Playground] Root element #root not found. Check index.html.',
    );
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);