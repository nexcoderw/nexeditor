import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(ROOT_DIR, 'src/data/google-fonts-catalog.ts');
const DEFAULT_SOURCE_URL = 'https://fonts.google.com/metadata/fonts';

const CATEGORY_MAP = {
    'Sans Serif': 'sans-serif',
    'Serif': 'serif',
    'Monospace': 'monospace',
    'Display': 'display',
    'Handwriting': 'handwriting',
};

const VALID_WEIGHTS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);

function parseArgs(argv) {
    const args = { input: null };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--input') {
            args.input = argv[i + 1] ?? null;
            i += 1;
        }
    }

    return args;
}

async function readSource(inputPath) {
    if (inputPath) {
        return readFile(resolve(process.cwd(), inputPath), 'utf8');
    }

    const response = await fetch(DEFAULT_SOURCE_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch Google Fonts metadata: ${response.status} ${response.statusText}`);
    }

    return response.text();
}

function parseMetadata(raw) {
    const trimmed = raw.trimStart();
    const sanitized = trimmed.startsWith(")]}'")
        ? trimmed.slice(trimmed.indexOf('\n') + 1)
        : trimmed;

    return JSON.parse(sanitized);
}

function mapCategory(category) {
    const mapped = CATEGORY_MAP[category];
    if (!mapped) {
        throw new Error(`Unsupported Google Fonts category: ${category}`);
    }

    return mapped;
}

function extractWeights(fonts) {
    const weights = [...new Set(
        Object.keys(fonts ?? {})
            .map((key) => Number.parseInt(key, 10))
            .filter((weight) => VALID_WEIGHTS.has(weight)),
    )].sort((a, b) => a - b);

    return weights.length > 0 ? weights : [400];
}

function hasItalicVariant(fonts) {
    return Object.keys(fonts ?? {}).some((key) => key.endsWith('i'));
}

function buildCatalog(metadata) {
    return metadata.familyMetadataList
        .map((entry) => ({
            family: entry.family,
            category: mapCategory(entry.category),
            weights: extractWeights(entry.fonts),
            hasItalic: hasItalicVariant(entry.fonts),
        }))
        .sort((a, b) => a.family.localeCompare(b.family));
}

function buildModuleSource(catalog) {
    return `/**
 * google-fonts-catalog.ts
 *
 * Generated from the official Google Fonts metadata feed.
 * To refresh this file, run:
 *   node packages/core/scripts/update-google-fonts-catalog.mjs
 */

import type { NexFont } from '../types/font.types';

export const GOOGLE_FONTS_CATALOG: NexFont[] = ${JSON.stringify(catalog, null, 4)};
`;
}

async function main() {
    const { input } = parseArgs(process.argv.slice(2));
    const raw = await readSource(input);
    const metadata = parseMetadata(raw);
    const catalog = buildCatalog(metadata);
    const output = buildModuleSource(catalog);

    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, output);

    console.log(`[google-fonts] Wrote ${catalog.length} families to ${OUTPUT_PATH}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
