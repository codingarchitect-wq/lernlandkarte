#!/usr/bin/env node
// Translations of the texts around the topics: subject and domain names and descriptions, domain bases,
// parent summaries (clusters), source notes and standard titles. Works for the German and the Romanian
// taxonomy (the same file sits in both tools/ folders).
//   node tools/i18n-meta.mjs export <lang> [--parts N]   → JSON for translators on stdout (or N files with --out)
//   node tools/i18n-meta.mjs merge <lang> <translation.json> [...]
// Export entries are { "<id>": { "en": English text, "native": the taxonomy's own-language text if any } }; a
// translation file maps the same ids to the translated text. Ids:
//   subject.name|S, subject.description|S, domain.name|S|D, domain.basis|S|D, cluster|S|D|grade,
//   source.notes|slug, code|slug|code, match|topic key|matched id or key (the note on a crosswalk link)
// Merged fields get the language suffix (nameRo, descriptionDe, basisRo, summaryDe, notesRo, titleDe, …) and are
// written to every authoring declaration whose English text equals the one the build uses.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NATIVE = root.endsWith('ro-taxonomy') ? 'ro' : 'de';
const [cmd, lang, ...rest] = process.argv.slice(2);
if (!['export', 'merge'].includes(cmd) || !['de', 'ro'].includes(lang)) { console.error('usage: i18n-meta.mjs export|merge <de|ro> …'); process.exit(2); }
const SUF = lang === 'de' ? 'De' : 'Ro', NSUF = NATIVE === 'de' ? 'De' : 'Ro', own = lang === NATIVE;
const J = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const subjects = J('data/subjects.json').subjects, curricula = J('data/curriculum-standards.json').curricula, clusters = J('data/clusters.json').clusters;
// crosswalk links: German taxonomy → os-taxonomy (deKey, osId), Romanian taxonomy → German taxonomy (roKey, deKey)
const links = (NATIVE === 'de' ? J('data/crosswalk-os-taxonomy.json') : J('data/crosswalk-de-taxonomy.json')).links.map(l => NATIVE === 'de' ? { from: l.deKey, to: l.osId, l } : { from: l.roKey, to: l.deKey, l });

if (cmd === 'export') {
  const out = {};
  const add = (id, en, native) => { if (en) out[id] = native ? { en, native } : { en }; };
  for (const s of subjects) {
    if (!own) add(`subject.name|${s.name}`, s.nameEn, s.name);
    add(`subject.description|${s.name}`, s.description);
    for (const d of s.domains) { if (!own) add(`domain.name|${s.name}|${d.name}`, d.nameEn, d.name); add(`domain.basis|${s.name}|${d.name}`, d.basis); }
  }
  if (!own) for (const c of clusters) add(`cluster|${c.subject}|${c.domain}|${c.gradeStart}`, c.summary, c['summary' + NSUF]);
  for (const c of curricula) {
    add(`source.notes|${c.slug}`, c.notes);
    if (!own) for (const x of c.topics) add(`code|${c.slug}|${x.code}`, x.data.titleEn, x.data['title' + NSUF]);
  }
  for (const { from, to, l } of links) add(`match|${from}|${to}`, l.note);
  // already translated entries are skipped (e.g. after a partial merge)
  const done = id => {
    const [kind, a, b, c2] = id.split('|');
    if (kind === 'subject.name') return subjects.find(s => s.name === a)?.['name' + SUF];
    if (kind === 'subject.description') return subjects.find(s => s.name === a)?.['description' + SUF];
    const dom = subjects.find(s => s.name === a)?.domains.find(d => d.name === b);
    if (kind === 'domain.name') return dom?.['name' + SUF];
    if (kind === 'domain.basis') return dom?.['basis' + SUF];
    if (kind === 'cluster') return clusters.find(c => c.subject === a && c.domain === b && String(c.gradeStart) === c2)?.['summary' + SUF];
    if (kind === 'source.notes') return curricula.find(c => c.slug === a)?.['notes' + SUF];
    if (kind === 'code') return curricula.find(c => c.slug === a)?.topics.find(x => x.code === b)?.data['title' + SUF];
    if (kind === 'match') return links.find(x => x.from === a && x.to === b)?.l['note' + SUF];
  };
  for (const id of Object.keys(out)) if (done(id)) delete out[id];
  const parts = rest.includes('--parts') ? +rest[rest.indexOf('--parts') + 1] : 1, outPrefix = rest.includes('--out') ? rest[rest.indexOf('--out') + 1] : null;
  const ids = Object.keys(out);
  if (parts === 1 && !outPrefix) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
  // split by kind first, so each part is homogeneous where possible
  const size = Math.ceil(ids.length / parts);
  for (let p = 0; p < parts; p++) {
    const slice = Object.fromEntries(ids.slice(p * size, (p + 1) * size).map(id => [id, out[id]]));
    writeFileSync(`${outPrefix}.part${p + 1}.json`, JSON.stringify(slice, null, 1));
    console.error(`${outPrefix}.part${p + 1}.json: ${Object.keys(slice).length} entries, ${Object.values(slice).reduce((a, v) => a + v.en.split(/\s+/).length, 0)} words`);
  }
  process.exit(0);
}

// ---------- merge ----------
const tr = Object.assign({}, ...rest.map(p => JSON.parse(readFileSync(p, 'utf8'))));
const dataSubj = new Map(subjects.map(s => [s.name, s]));
const dataDom = new Map(subjects.flatMap(s => s.domains.map(d => [s.name + '|' + d.name, d])));
const dataSrc = new Map(curricula.map(c => [c.slug, c]));
const dir = join(root, 'authoring');
const n = {};
const put = (obj, field, id) => { if (tr[id] != null) { obj[field] = tr[id]; n[field] = (n[field] || 0) + 1; } };
for (const f of readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'))) {
  const src = readFileSync(join(dir, f), 'utf8'), j = JSON.parse(src), indent = (src.match(/\n( +)"/) || [, '  '])[1].length;
  for (const s of j.subjects || []) {
    if (!own) put(s, 'name' + SUF, `subject.name|${s.name}`);
    if (s.description === dataSubj.get(s.name)?.description) put(s, 'description' + SUF, `subject.description|${s.name}`);
  }
  for (const d of j.domains || []) {
    if (!own) put(d, 'name' + SUF, `domain.name|${d.subject}|${d.name}`);
    if (d.basis === dataDom.get(d.subject + '|' + d.name)?.basis) put(d, 'basis' + SUF, `domain.basis|${d.subject}|${d.name}`);
  }
  if (!own) for (const c of j.clusters || []) put(c, 'summary' + SUF, `cluster|${c.subject}|${c.domain}|${c.gradeStart}`);
  for (const s of j.sources || []) {
    if (s.notes === dataSrc.get(s.slug)?.notes) put(s, 'notes' + SUF, `source.notes|${s.slug}`);
    if (!own) for (const st of s.standards || []) put(st, 'title' + SUF, `code|${s.slug}|${st.code}`);
  }
  for (const t of j.topics || []) for (const m of t.osMatches || t.deMatches || []) if (m.note) put(m, 'note' + SUF, `match|${t.key}|${m.id ?? m.key}`);
  writeFileSync(join(dir, f), JSON.stringify(j, null, indent) + '\n');
}
console.log(`merged ${lang}: ${JSON.stringify(n)}`);
