#!/usr/bin/env node
// Validate one authoring file (or all with --all). Exit 1 on errors.
// Usage: node tools/check-authoring.mjs authoring/mathematik.json [--quiet]
// Other authoring files are read too, so a file may cite their standards and use
// keys of the Klasse 0–6 base files as prerequisites.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const osTopics = JSON.parse(readFileSync(resolve(root, '../os-taxonomy/data/topics.json'), 'utf8')).topics;
const osIds = new Set(osTopics.map(t => t.id));

// Shared slugs that any file may cite even if another file owns the catalogue.
const SHARED_SLUGS = new Set([
  'kmk-bista-primar-mathematik-2022', 'kmk-bista-msa-mathematik-2022',
  'kmk-bista-primar-deutsch-2022', 'kmk-bista-msa-deutsch-2022',
  'kmk-bista-fremdsprache-2023', 'kmk-digitale-welt-2016',
  'gi-informatik-primar-2019', 'gdsu-perspektivrahmen-2013',
]);
const TYPES = new Set(['CONCEPTUAL', 'PROCEDURAL', 'REPRESENTATIONAL', 'LANGUAGE', 'META']);
const RELS = new Set(['exact', 'close', 'broader', 'narrower', 'related']);
const KEY_RE = /^[a-z]{2}-[a-z0-9-]+$/;
const MAX_GRADE = 13;                       // Jahrgangsstufe 0 (Vorschule) … 13 (G9 Abitur year)
const CLUSTER_BANDS = [0, 1, 3, 5, 7, 9, 11]; // Vorschule, Kl. 1–2, 3–4, 5–6, 7–8, 9–10, Oberstufe 11–13
const LEVELS = new Set(['gA', 'eA']);         // Oberstufe: grundlegendes / erhöhtes Anforderungsniveau
// Files that existed before the Gymnasium extension. Their keys may be used as prerequisites
// from any file; keys of other files must go through externalPrerequisites (keeps the graph acyclic).
export const BASE_FILES = new Set(['deutsch.json', 'englisch-informatik.json', 'mathematik.json', 'musik-kunst-sport-ethik.json', 'sachunterricht.json', 'sek1-gesellschaft-natur.json']);
const authoringDir = join(root, 'authoring');

function loadOthers(path) {
  const keys = new Map(), std = new Set(), clusters = new Map();
  for (const f of readdirSync(authoringDir).filter(f => f.endsWith('.json') && !f.startsWith('_'))) {
    const p = join(authoringDir, f);
    if (resolve(p) === resolve(path)) continue;
    let g; try { g = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; } // a file may be mid-edit
    for (const t of g.topics || []) keys.set(t.key, { gradeStart: t.gradeStart, file: f, base: BASE_FILES.has(f) });
    for (const s of g.sources || []) for (const st of s.standards || []) std.add(`${s.slug}:${st.code}`);
    for (const c of g.clusters || []) clusters.set(`${c.subject}|${c.domain}|${c.gradeStart}`, f);
  }
  return { keys, std, clusters };
}

export function checkFile(path, { allSources = null } = {}) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  let f;
  try { f = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { return { errors: [`JSON parse: ${e.message}`], warnings, stats: {} }; }
  for (const k of ['group', 'subjects', 'domains', 'sources', 'topics', 'clusters']) if (!(k in f)) E(`missing top-level "${k}"`);
  const subjects = new Set((f.subjects || []).map(s => s.name));
  const domains = new Set((f.domains || []).map(d => `${d.subject}|${d.name}`));
  const stdKeys = new Set();
  const ownSlugs = new Set();
  for (const s of f.sources || []) {
    if (!s.slug || !Array.isArray(s.standards)) { E(`source missing slug/standards: ${JSON.stringify(s).slice(0, 80)}`); continue; }
    ownSlugs.add(s.slug);
    for (const k of ['country', 'name', 'version', 'sourceUrl']) if (!s[k]) W(`source ${s.slug}: missing ${k}`);
    const seen = new Set();
    for (const st of s.standards) {
      if (!st.code) { E(`source ${s.slug}: standard without code`); continue; }
      if (seen.has(st.code)) E(`source ${s.slug}: duplicate code ${st.code}`);
      seen.add(st.code); stdKeys.add(`${s.slug}:${st.code}`);
      if (!st.titleEn && !st.titleDe) W(`source ${s.slug}:${st.code} has no title`);
    }
  }
  if (allSources) for (const k of allSources) stdKeys.add(k);
  const others = loadOthers(path);
  for (const k of others.std) stdKeys.add(k);
  const topics = f.topics || [];
  const keys = new Map();
  for (const t of topics) {
    if (!t.key || !KEY_RE.test(t.key)) E(`bad key: ${t.key}`);
    if (keys.has(t.key)) E(`duplicate key: ${t.key}`);
    if (others.keys.has(t.key)) E(`key ${t.key} already exists in ${others.keys.get(t.key).file}`);
    keys.set(t.key, t);
  }
  const nameSeen = new Map();
  for (const t of topics) {
    const id = t.key;
    for (const k of ['type', 'subject', 'domain', 'name', 'nameDe', 'description', 'evidence', 'assessmentPrompt', 'gradeStart', 'gradeEnd', 'standards', 'prerequisites', 'osMatches'])
      if (t[k] === undefined || t[k] === null) E(`${id}: missing ${k}`);
    if (t.type && !TYPES.has(t.type)) E(`${id}: bad type ${t.type}`);
    if (t.subject && !subjects.has(t.subject)) E(`${id}: subject "${t.subject}" not declared in subjects[]`);
    if (t.domain && !domains.has(`${t.subject}|${t.domain}`)) E(`${id}: domain "${t.domain}" not declared for ${t.subject}`);
    if (!Array.isArray(t.evidence) || t.evidence.length !== 3) E(`${id}: evidence must have exactly 3 items`);
    if (t.assessmentPrompt && !t.assessmentPrompt.includes('{{name}}')) E(`${id}: assessmentPrompt lacks {{name}}`);
    if (!(Number.isInteger(t.gradeStart) && Number.isInteger(t.gradeEnd) && t.gradeStart >= 0 && t.gradeEnd <= MAX_GRADE && t.gradeStart <= t.gradeEnd))
      E(`${id}: bad grades ${t.gradeStart}-${t.gradeEnd}`);
    if (t.gradeStart >= 11 && !LEVELS.has(t.courseLevel)) E(`${id}: Oberstufe topic (Kl. ${t.gradeStart}) needs courseLevel "gA" or "eA"`);
    if (t.gradeStart < 11 && t.courseLevel != null) E(`${id}: courseLevel is only for topics starting in Kl. 11–13`);
    if (t.description && t.description.length < 40) W(`${id}: very short description`);
    if (/\(age \d+\+?\)|\(Kl\.? ?\d/.test(t.name || '')) W(`${id}: avoid age/grade suffixes in names`);
    const nk = `${t.subject}|${(t.name || '').toLowerCase()}`;
    if (nameSeen.has(nk)) W(`${id}: duplicate name with ${nameSeen.get(nk)}`); else nameSeen.set(nk, id);
    for (const s of t.standards || []) {
      const slug = s.split(':')[0];
      if (!s.includes(':')) E(`${id}: standard "${s}" not namespaced`);
      else if (!stdKeys.has(s) && !(SHARED_SLUGS.has(slug) && !ownSlugs.has(slug))) E(`${id}: unknown standard ${s}`);
    }
    for (const p of t.prerequisites || []) {
      const ext = !keys.has(p.key) && others.keys.get(p.key);
      if (!keys.has(p.key) && !(ext && ext.base)) {
        E(ext ? `${id}: prerequisite ${p.key} is in ${ext.file}; only keys of this file or the Klasse 0–6 base files are allowed — use externalPrerequisites`
              : `${id}: prerequisite ${p.key} not found in this file or the Klasse 0–6 base files (use externalPrerequisites for other subjects)`);
        continue;
      }
      if (!['hard', 'soft'].includes(p.strength)) E(`${id}: bad strength on ${p.key}`);
      if (!p.reason) W(`${id}: prerequisite ${p.key} lacks reason`);
      if (p.key === id) E(`${id}: self prerequisite`);
      const pt = keys.get(p.key) || ext;
      if (pt.gradeStart > t.gradeStart) E(`${id} (Kl.${t.gradeStart}) depends on later-starting ${p.key} (Kl.${pt.gradeStart})`);
    }
    for (const x of t.externalPrerequisites || []) if (!x.subject || !x.concept || !['hard', 'soft'].includes(x.strength)) E(`${id}: malformed externalPrerequisite`);
    const seenOs = new Set();
    for (const m of t.osMatches || []) {
      if (!osIds.has(m.id)) E(`${id}: os id ${m.id} does not exist`);
      if (!RELS.has(m.relation)) E(`${id}: bad relation ${m.relation}`);
      if (seenOs.has(m.id)) E(`${id}: duplicate os match ${m.id}`); seenOs.add(m.id);
    }
    if ((t.osMatches || []).length > 4) W(`${id}: more than 4 osMatches`);
  }
  // cycle detection
  const state = new Map();
  const visit = (k, stack) => {
    if (state.get(k) === 2) return;
    if (state.get(k) === 1) { E(`cycle: ${[...stack, k].join(' -> ')}`); return; }
    state.set(k, 1);
    for (const p of keys.get(k)?.prerequisites || []) if (keys.has(p.key)) visit(p.key, [...stack, k]);
    state.set(k, 2);
  };
  for (const k of keys.keys()) visit(k, []);
  const roots = topics.filter(t => !(t.prerequisites || []).length && !(t.externalPrerequisites || []).length).length;
  if (topics.length && roots / topics.length > 0.2) W(`${roots}/${topics.length} topics have no prerequisites at all (aim for few roots)`);
  for (const c of f.clusters || []) {
    if (!domains.has(`${c.subject}|${c.domain}`)) E(`cluster for unknown domain ${c.subject}|${c.domain}`);
    if (!CLUSTER_BANDS.includes(c.gradeStart)) E(`cluster ${c.domain}: gradeStart must be one of ${CLUSTER_BANDS.join(',')}`);
    const ck = `${c.subject}|${c.domain}|${c.gradeStart}`;
    if (others.clusters.has(ck)) E(`cluster ${ck} already exists in ${others.clusters.get(ck)} — do not duplicate it`);
    if (!c.summary || !c.summaryDe) E(`cluster ${c.domain}/${c.gradeStart}: summary and summaryDe required`);
  }
  const usedDomains = new Set(topics.map(t => `${t.subject}|${t.domain}`));
  for (const d of domains) if (!usedDomains.has(d)) W(`declared domain without topics: ${d}`);
  const stats = {
    topics: topics.length,
    edges: topics.reduce((a, t) => a + (t.prerequisites || []).length, 0),
    externalEdges: topics.reduce((a, t) => a + (t.externalPrerequisites || []).length, 0),
    crossFileEdges: topics.reduce((a, t) => a + (t.prerequisites || []).filter(p => !keys.has(p.key)).length, 0),
    withOsMatch: topics.filter(t => (t.osMatches || []).length).length,
    germanSpecific: topics.filter(t => t.germanSpecific).length,
    standards: stdKeys.size, clusters: (f.clusters || []).length,
  };
  return { errors, warnings, stats };
}

const isMain = process.argv[1] && process.argv[1].endsWith('check-authoring.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const files = args.includes('--all')
    ? readdirSync(join(root, 'authoring')).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => join(root, 'authoring', f))
    : args.filter(a => !a.startsWith('--'));
  let bad = 0;
  for (const p of files) {
    const { errors, warnings, stats } = checkFile(p);
    console.log(`\n${p}\n  stats: ${JSON.stringify(stats)}`);
    for (const e of errors) console.log(`  ERROR   ${e}`);
    if (!args.includes('--quiet')) for (const w of warnings) console.log(`  warning ${w}`);
    console.log(`  ${errors.length} errors, ${warnings.length} warnings`);
    if (errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
