#!/usr/bin/env node
// Inline the Romanian–German comparison into a self-contained ../comparison-ro-de/index.html.
// The page (scripts/explorer-template.html) shows everything in English, German or Romanian.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../comparison-ro-de');
// Escape "</" so embedded JSON can never close the <script> element.
const safe = s => s.trim().replace(/<\//g, '<\\/');
const html = readFileSync(join(here, 'explorer-template.html'), 'utf8')
  .replace('__COMPARISON__', () => safe(readFileSync(join(out, 'comparison.json'), 'utf8')))
  .replace('__EXPLORER__', () => safe(readFileSync(join(out, 'explorer-data.json'), 'utf8')));
writeFileSync(join(out, 'index.html'), html);
console.log(`explorer written: ${join(out, 'index.html')} (${Math.round(html.length / 1024)} KB)`);
