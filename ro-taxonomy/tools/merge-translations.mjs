#!/usr/bin/env node
// Merge a translation of the topic texts into an authoring file. Works for the German and the Romanian taxonomy
// (the same file sits in both tools/ folders).
// usage: node tools/merge-translations.mjs <authoring file> <de|ro> <translation .json> [--dry]
// The translation maps topic key -> { name? (only for the other country's language), description,
// evidence[3], assessmentPrompt, notes?, reasons: { <prerequisite key | "ext:<concept>">: text } }.
// Written fields get the language suffix: descriptionDe / descriptionRo, evidence…, assessmentPrompt…, the notes
// field (laenderNotes… in the German taxonomy, notes… in the Romanian one), reason… on each prerequisite, and
// nameRo / nameDe when the language is not the taxonomy's own.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NATIVE = root.endsWith('ro-taxonomy') ? 'ro' : 'de';
const [path, lang, trPath] = process.argv.slice(2);
if (!['de', 'ro'].includes(lang) || !trPath) { console.error('usage: merge-translations.mjs <authoring file> <de|ro> <translation .json> [--dry]'); process.exit(2); }
const SUF = lang === 'de' ? 'De' : 'Ro', notesF = NATIVE === 'de' ? 'laenderNotes' : 'notes', own = lang === NATIVE;
const src = readFileSync(path, 'utf8'), f = JSON.parse(src), tr = JSON.parse(readFileSync(trPath, 'utf8'));
const indent = (src.match(/\n( +)"/) || [, '  '])[1].length;
const errors = [];
let n = 0, reasons = 0;
for (const t of f.topics) {
  const r = tr[t.key];
  if (!r) { errors.push(`${t.key}: no translation`); continue; }
  if (!r.description || !Array.isArray(r.evidence) || r.evidence.length !== 3 || !r.assessmentPrompt?.includes('{{name}}')) { errors.push(`${t.key}: incomplete translation`); continue; }
  if (lang === 'ro' && /[şţŞŢ]/.test(JSON.stringify(r))) errors.push(`${t.key}: cedilla ş/ţ`);
  if (!own) { if (!r.name) errors.push(`${t.key}: name missing`); else t['name' + SUF] = r.name; }
  t['description' + SUF] = r.description; t['evidence' + SUF] = r.evidence; t['assessmentPrompt' + SUF] = r.assessmentPrompt;
  if (t[notesF]) { if (!r.notes) errors.push(`${t.key}: notes not translated`); else t[notesF + SUF] = r.notes; }
  for (const p of t.prerequisites || []) if (p.reason) { const x = r.reasons?.[p.key]; if (x) { p['reason' + SUF] = x; reasons++; } else errors.push(`${t.key}: reason for ${p.key} not translated`); }
  for (const p of t.externalPrerequisites || []) if (p.reason) { const x = r.reasons?.['ext:' + p.concept]; if (x) { p['reason' + SUF] = x; reasons++; } else errors.push(`${t.key}: reason for ext:${p.concept} not translated`); }
  n++;
}
for (const k of Object.keys(tr)) if (!f.topics.some(t => t.key === k)) errors.push(`unknown key in translation: ${k}`);
console.log(`${path} [${lang}]: ${n}/${f.topics.length} topics, ${reasons} reasons merged · ${errors.length} problems`);
for (const e of errors.slice(0, 20)) console.log('  ' + e);
if (errors.length) process.exit(1);
if (!process.argv.includes('--dry')) writeFileSync(path, JSON.stringify(f, null, indent) + '\n');
