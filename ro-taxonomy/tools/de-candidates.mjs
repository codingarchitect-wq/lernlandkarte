#!/usr/bin/env node
// BM25 candidate search over the German taxonomy (name, German name, description, evidence),
// used to find German counterparts (deMatches) for Romanian topics.
// Usage:
//   node tools/de-candidates.mjs --query "written subtraction" [--subjects Mathematik,Sachunterricht] [--k 8]
//   node tools/de-candidates.mjs --file authoring/pg-matematica.json [--subjects ...] [--k 6] [--json]
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DE_TOPICS = resolve(here, '../../de-taxonomy/data/topics.json');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const has = name => args.includes(`--${name}`);

const STOP = new Set(('a an the and or of to in on for with by from at as is are be can that this it its their them they ' +
  'into about using use how what when which who why than then there these those such e.g eg etc understand know ' +
  'simple different own other each some all any more most one two three child children pupils students learn learning ' +
  'der die das und oder von zu im in mit fur auf ein eine einer eines den dem des als bei nach aus').split(/\s+/));

export function tokenize(s) {
  return (s || '').toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 1 && !STOP.has(w))
    .map(stem);
}
function stem(w) {
  // tiny English stemmer (good enough for ranking)
  return w.replace(/(ies)$/, 'y').replace(/(ing|edly|ed|ly|es|s)$/, '').replace(/(ation|ment|ness)$/, '');
}

export function buildIndex(subjects) {
  const topics = JSON.parse(readFileSync(DE_TOPICS, 'utf8')).topics.filter(t => !subjects || subjects.includes(t.subject));
  const docs = topics.map(t => {
    const nameToks = tokenize(t.name);
    // weight the English name 3x, German name, description and evidence 1x
    return { t, toks: [...nameToks, ...nameToks, ...nameToks, ...tokenize(t.nameDe), ...tokenize(t.description), ...tokenize(t.evidence.join(' '))] };
  });
  const df = new Map();
  for (const d of docs) for (const w of new Set(d.toks)) df.set(w, (df.get(w) || 0) + 1);
  const avgdl = docs.reduce((a, d) => a + d.toks.length, 0) / Math.max(1, docs.length);
  for (const d of docs) { d.tf = new Map(); for (const w of d.toks) d.tf.set(w, (d.tf.get(w) || 0) + 1); }
  return { docs, df, avgdl, N: docs.length };
}

export function search(index, query, k = 8) {
  const q = [...new Set(tokenize(query))];
  const k1 = 1.4, b = 0.75, scored = [];
  for (const d of index.docs) {
    let s = 0;
    for (const w of q) {
      const f = d.tf.get(w); if (!f) continue;
      const n = index.df.get(w), idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.toks.length / index.avgdl));
    }
    if (s > 0) scored.push([s, d.t]);
  }
  scored.sort((a, b2) => b2[0] - a[0]);
  return scored.slice(0, k).map(([score, t]) => ({ score: +score.toFixed(2), t }));
}

const fmt = r => `  ${r.t.key}  [${r.t.subject} › ${r.t.domain}] Kl. ${r.t.gradeStart}${r.t.gradeEnd !== r.t.gradeStart ? '–' + r.t.gradeEnd : ''} (age ${r.t.ageRangeStart})${r.t.courseLevel ? ' ' + r.t.courseLevel : ''}  ` +
  `"${r.t.name}" / ${r.t.nameDe} (${r.score})\n      ${r.t.description.slice(0, 170).replace(/\s+/g, ' ')}`;

if (process.argv[1]?.endsWith('de-candidates.mjs')) {
  const subjects = opt('subjects') ? opt('subjects').split(',').map(s => s.trim()) : null;
  const k = Number(opt('k', 8));
  const index = buildIndex(subjects);
  if (opt('query')) {
    for (const r of search(index, opt('query'), k)) console.log(fmt(r));
  } else if (opt('file')) {
    const file = JSON.parse(readFileSync(opt('file'), 'utf8'));
    const out = [];
    for (const t of file.topics) {
      const res = search(index, `${t.name} ${t.name} ${t.description} ${(t.evidence || []).join(' ')}`, k);
      if (has('json')) out.push({ key: t.key, candidates: res.map(r => ({ key: r.t.key, name: r.t.name, subject: r.t.subject, grade: r.t.gradeStart, score: r.score })) });
      else { console.log(`\n## ${t.key} — ${t.name} (clasa ${t.gradeStart}-${t.gradeEnd})`); for (const r of res) console.log(fmt(r)); }
    }
    if (has('json')) console.log(JSON.stringify(out, null, 1));
  } else {
    console.error('Usage: --query "..." | --file authoring/x.json  [--subjects Mathematik,Sachunterricht] [--k 8] [--json]');
    process.exit(2);
  }
}
