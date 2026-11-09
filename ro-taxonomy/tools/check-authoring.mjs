#!/usr/bin/env node
// Validate one Romanian authoring file (or all with --all). Exit 1 on errors.
// Usage: node tools/check-authoring.mjs authoring/pg-matematica.json [--quiet]
// Other authoring files are read too, so a file may cite their standards, and liceu files may use
// keys of the primar–gimnaziu files (pg-*.json) as prerequisites.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DE_TOPICS } from './de-candidates.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const deKeys = new Map(JSON.parse(readFileSync(DE_TOPICS, 'utf8')).topics.map(t => [t.key, t]));

const TYPES = new Set(['CONCEPTUAL', 'PROCEDURAL', 'REPRESENTATIONAL', 'LANGUAGE', 'META']);
const RELS = new Set(['exact', 'close', 'broader', 'narrower', 'related']);
const KEY_RE = /^[a-z]{2}-[a-z0-9-]+$/;
export const MAX_GRADE = 12;                         // 0 = clasa pregătitoare, 1–12 = clasele I–XII
export const CLUSTER_BANDS = [0, 3, 5, 7, 9, 11];    // CP–II, III–IV, V–VI, VII–VIII, IX–X, XI–XII
export const PROFILES = ['MI', 'SN', 'SS', 'FIL'];   // matematică-informatică, științe ale naturii, științe sociale, filologie
// Subjects, their key prefixes and tiers. Every file must use exactly these subject names.
export const SUBJECTS = {
  'Limba și literatura română': { prefix: 'lr', en: 'Romanian Language and Literature', tier: 'core' },
  'Matematică': { prefix: 'ma', en: 'Mathematics', tier: 'core' },
  'Științe ale naturii': { prefix: 'sn', en: 'Natural Sciences', tier: 'core' },
  'Biologie': { prefix: 'bi', en: 'Biology', tier: 'core' },
  'Fizică': { prefix: 'fi', en: 'Physics', tier: 'core' },
  'Chimie': { prefix: 'ch', en: 'Chemistry', tier: 'core' },
  'Istorie': { prefix: 'is', en: 'History', tier: 'core' },
  'Geografie': { prefix: 'ge', en: 'Geography', tier: 'core' },
  'Educație civică și socială': { prefix: 'ec', en: 'Civic and Social Education', tier: 'core' },
  'Științe socio-umane': { prefix: 'su', en: 'Social Sciences and Philosophy', tier: 'core' },
  'Limba engleză': { prefix: 'en', en: 'English', tier: 'core' },
  'Informatică și TIC': { prefix: 'in', en: 'Computer Science and ICT', tier: 'core' },
  'Limba franceză': { prefix: 'fr', en: 'French', tier: 'extended' },
  'Limba latină': { prefix: 'la', en: 'Latin', tier: 'extended' },
  'Educație muzicală': { prefix: 'mu', en: 'Music', tier: 'extended' },
  'Arte vizuale': { prefix: 'av', en: 'Visual Arts', tier: 'extended' },
  'Educație fizică și sport': { prefix: 'ef', en: 'Physical Education and Sport', tier: 'extended' },
  'Religie': { prefix: 're', en: 'Religion', tier: 'extended' },
  'Educație tehnologică': { prefix: 'et', en: 'Technology Education', tier: 'extended' },
  'Dezvoltare personală și consiliere': { prefix: 'dp', en: 'Personal Development and Guidance', tier: 'extended' },
};
// Files for clasa pregătitoare – VIII are named pg-*.json; liceu files (liceu-*.json) may use their keys directly.
export const isBase = f => f.startsWith('pg-');
const authoringDir = join(root, 'authoring');
const authoringFiles = () => readdirSync(authoringDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));

function loadOthers(path) {
  const keys = new Map(), std = new Set(), clusters = new Map();
  for (const f of authoringFiles()) {
    const p = join(authoringDir, f);
    if (resolve(p) === resolve(path)) continue;
    let g; try { g = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; } // a file may be mid-edit
    for (const t of g.topics || []) keys.set(t.key, { gradeStart: t.gradeStart, file: f, base: isBase(f) });
    for (const s of g.sources || []) for (const st of s.standards || []) std.add(`${s.slug}:${st.code}`);
    for (const c of g.clusters || []) clusters.set(`${c.subject}|${c.domain}|${c.gradeStart}`, f);
  }
  return { keys, std, clusters };
}

export function checkFile(path, { allSources = null } = {}) {
  const errors = [], warnings = [];
  const E = m => errors.push(m), W = m => warnings.push(m);
  const fileName = path.split('/').pop();
  const mayUseBase = !isBase(fileName);
  let f;
  try { f = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { return { errors: [`JSON parse: ${e.message}`], warnings, stats: {} }; }
  for (const k of ['group', 'subjects', 'domains', 'sources', 'topics', 'clusters']) if (!(k in f)) E(`missing top-level "${k}"`);
  for (const s of f.subjects || []) {
    if (!SUBJECTS[s.name]) E(`subject "${s.name}" is not one of the agreed subject names (see docs/authoring-format.md)`);
    if (!s.nameEn || !Array.isArray(s.grades) || !s.description) E(`subject ${s.name}: needs nameEn, grades [from, to] and description`);
  }
  const subjects = new Set((f.subjects || []).map(s => s.name));
  const domains = new Set((f.domains || []).map(d => `${d.subject}|${d.name}`));
  for (const d of f.domains || []) if (!d.nameEn) E(`domain ${d.subject}|${d.name}: missing nameEn`);
  const stdKeys = new Set(), ownSlugs = new Set();
  for (const s of f.sources || []) {
    if (!s.slug || !Array.isArray(s.standards)) { E(`source missing slug/standards: ${JSON.stringify(s).slice(0, 80)}`); continue; }
    if (!/^ro-[a-z0-9-]+$/.test(s.slug)) E(`source slug ${s.slug}: use the pattern ro-<subject>-<grades>-<year>`);
    ownSlugs.add(s.slug);
    for (const k of ['country', 'name', 'version', 'sourceUrl', 'level']) if (!s[k]) W(`source ${s.slug}: missing ${k}`);
    const seen = new Set();
    for (const st of s.standards) {
      if (!st.code) { E(`source ${s.slug}: standard without code`); continue; }
      if (seen.has(st.code)) E(`source ${s.slug}: duplicate code ${st.code}`);
      seen.add(st.code); stdKeys.add(`${s.slug}:${st.code}`);
      if (!st.titleEn || !st.titleRo) W(`source ${s.slug}:${st.code} needs titleRo and titleEn`);
      if ((st.titleRo || '').split(/\s+/).length > 22) W(`source ${s.slug}:${st.code}: titleRo is long — paraphrase, don't copy`);
    }
  }
  if (allSources) for (const k of allSources) stdKeys.add(k);
  const others = loadOthers(path);
  for (const k of others.std) stdKeys.add(k);
  const topics = f.topics || [];
  const keys = new Map();
  for (const t of topics) {
    if (!t.key || !KEY_RE.test(t.key)) E(`bad key: ${t.key}`);
    else if (SUBJECTS[t.subject] && !t.key.startsWith(SUBJECTS[t.subject].prefix + '-')) E(`${t.key}: key must start with "${SUBJECTS[t.subject].prefix}-" for ${t.subject}`);
    if (keys.has(t.key)) E(`duplicate key: ${t.key}`);
    if (others.keys.has(t.key)) E(`key ${t.key} already exists in ${others.keys.get(t.key).file}`);
    keys.set(t.key, t);
  }
  const nameSeen = new Map();
  for (const t of topics) {
    const id = t.key;
    for (const k of ['type', 'subject', 'domain', 'name', 'nameRo', 'description', 'evidence', 'assessmentPrompt', 'gradeStart', 'gradeEnd', 'standards', 'prerequisites', 'deMatches'])
      if (t[k] === undefined || t[k] === null) E(`${id}: missing ${k}`);
    if (t.type && !TYPES.has(t.type)) E(`${id}: bad type ${t.type}`);
    if (t.subject && !subjects.has(t.subject)) E(`${id}: subject "${t.subject}" not declared in subjects[]`);
    if (t.domain && !domains.has(`${t.subject}|${t.domain}`)) E(`${id}: domain "${t.domain}" not declared for ${t.subject}`);
    if (!Array.isArray(t.evidence) || t.evidence.length !== 3) E(`${id}: evidence must have exactly 3 items`);
    if (t.assessmentPrompt && !t.assessmentPrompt.includes('{{name}}')) E(`${id}: assessmentPrompt lacks {{name}}`);
    if (!(Number.isInteger(t.gradeStart) && Number.isInteger(t.gradeEnd) && t.gradeStart >= 0 && t.gradeEnd <= MAX_GRADE && t.gradeStart <= t.gradeEnd))
      E(`${id}: bad grades ${t.gradeStart}-${t.gradeEnd}`);
    if (t.gradeStart >= 9) {
      if (!Array.isArray(t.profiles) || !t.profiles.length || t.profiles.some(p => !PROFILES.includes(p)) || new Set(t.profiles).size !== t.profiles.length)
        E(`${id}: liceu topic (clasa ${t.gradeStart}) needs "profiles": a non-empty subset of ${PROFILES.join(', ')}`);
    } else if (t.profiles != null) E(`${id}: "profiles" is only for topics starting in clasa IX–XII`);
    if (isBase(fileName) && t.gradeStart >= 9) E(`${id}: pg-* files cover clasa pregătitoare – VIII only`);
    if (!isBase(fileName) && t.gradeStart < 9) W(`${id}: liceu files should start topics in clasa IX or later`);
    if (t.description && t.description.length < 40) W(`${id}: very short description`);
    if (/\((age|clasa|cls\.?|grade) ?\d|\(cl\.? ?[ivx]/i.test(t.name || '')) W(`${id}: avoid age/grade suffixes in names`);
    const nk = `${t.subject}|${(t.name || '').toLowerCase()}`;
    if (nameSeen.has(nk)) W(`${id}: duplicate name with ${nameSeen.get(nk)}`); else nameSeen.set(nk, id);
    for (const s of t.standards || []) {
      if (!s.includes(':')) E(`${id}: standard "${s}" not namespaced`);
      else if (!stdKeys.has(s)) E(`${id}: unknown standard ${s}`);
    }
    if (!(t.standards || []).length) W(`${id}: no curriculum standard cited`);
    for (const p of t.prerequisites || []) {
      const ext = !keys.has(p.key) && others.keys.get(p.key);
      if (!keys.has(p.key) && !(ext && ext.base && mayUseBase)) {
        E(ext ? `${id}: prerequisite ${p.key} is in ${ext.file}; ${mayUseBase ? 'only keys of this file or the pg-* files are allowed' : 'pg-* files may only use their own keys'} — use externalPrerequisites`
              : `${id}: prerequisite ${p.key} not found${mayUseBase ? ' in this file or the pg-* files' : ' in this file'} (use externalPrerequisites for other subjects)`);
        continue;
      }
      if (!['hard', 'soft'].includes(p.strength)) E(`${id}: bad strength on ${p.key}`);
      if (!p.reason) W(`${id}: prerequisite ${p.key} lacks reason`);
      if (p.key === id) E(`${id}: self prerequisite`);
      const pt = keys.get(p.key) || ext;
      if (pt.gradeStart > t.gradeStart) E(`${id} (clasa ${t.gradeStart}) depends on later-starting ${p.key} (clasa ${pt.gradeStart})`);
    }
    for (const x of t.externalPrerequisites || []) {
      if (!x.subject || !x.concept || !['hard', 'soft'].includes(x.strength)) E(`${id}: malformed externalPrerequisite`);
      else if (!SUBJECTS[x.subject]) E(`${id}: externalPrerequisite subject "${x.subject}" is not an agreed subject name`);
    }
    if (t.descriptionRo != null || t.evidenceRo != null || t.assessmentPromptRo != null) {
      if (!t.descriptionRo || !Array.isArray(t.evidenceRo) || t.evidenceRo.length !== 3 || !(t.assessmentPromptRo || '').includes('{{name}}'))
        E(`${id}: Romanian texts incomplete (descriptionRo, evidenceRo[3], assessmentPromptRo with {{name}})`);
      if (t.notes && !t.notesRo) E(`${id}: notesRo missing`);
      if (/[şţŞŢ]/.test(JSON.stringify([t.descriptionRo, t.evidenceRo, t.assessmentPromptRo, t.notesRo]))) E(`${id}: Romanian text uses cedilla ş/ţ (use ș/ț)`);
    } else W(`${id}: no Romanian texts yet (descriptionRo, evidenceRo, assessmentPromptRo)`);
    const seenDe = new Set();
    for (const m of t.deMatches || []) {
      if (!deKeys.has(m.key)) E(`${id}: German key ${m.key} does not exist`);
      if (!RELS.has(m.relation)) E(`${id}: bad relation ${m.relation}`);
      if (seenDe.has(m.key)) E(`${id}: duplicate German match ${m.key}`); seenDe.add(m.key);
    }
    if ((t.deMatches || []).length > 4) W(`${id}: more than 4 deMatches`);
  }
  // cycle detection within the file
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
  if (topics.length && roots / topics.length > 0.15) W(`${roots}/${topics.length} topics have no prerequisites at all (aim for few roots)`);
  for (const c of f.clusters || []) {
    if (!domains.has(`${c.subject}|${c.domain}`)) E(`cluster for unknown domain ${c.subject}|${c.domain}`);
    if (!CLUSTER_BANDS.includes(c.gradeStart)) E(`cluster ${c.domain}: gradeStart must be one of ${CLUSTER_BANDS.join(',')}`);
    const ck = `${c.subject}|${c.domain}|${c.gradeStart}`;
    if (others.clusters.has(ck)) E(`cluster ${ck} already exists in ${others.clusters.get(ck)} — do not duplicate it`);
    if (!c.summary || !c.summaryRo) E(`cluster ${c.domain}/${c.gradeStart}: summary and summaryRo required`);
  }
  const usedDomains = new Set(topics.map(t => `${t.subject}|${t.domain}`));
  for (const d of domains) if (!usedDomains.has(d)) W(`declared domain without topics: ${d}`);
  const stats = {
    topics: topics.length,
    edges: topics.reduce((a, t) => a + (t.prerequisites || []).length, 0),
    externalEdges: topics.reduce((a, t) => a + (t.externalPrerequisites || []).length, 0),
    crossFileEdges: topics.reduce((a, t) => a + (t.prerequisites || []).filter(p => !keys.has(p.key)).length, 0),
    withDeMatch: topics.filter(t => (t.deMatches || []).length).length,
    romaniaSpecific: topics.filter(t => t.romaniaSpecific).length,
    standards: stdKeys.size, clusters: (f.clusters || []).length,
  };
  return { errors, warnings, stats };
}

if (process.argv[1]?.endsWith('check-authoring.mjs')) {
  const args = process.argv.slice(2);
  const files = args.includes('--all') ? authoringFiles().map(f => join(authoringDir, f)) : args.filter(a => !a.startsWith('--'));
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
