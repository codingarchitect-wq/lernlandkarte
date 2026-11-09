#!/usr/bin/env node
// Merge authoring/*.json into data/*.json (os-taxonomy-compatible layout).
//   node tools/build.mjs            # build + write
//   node tools/build.mjs --dry      # build, print report, write nothing
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFile } from './check-authoring.mjs';
import { tokenize } from './os-candidates.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const DRY = process.argv.includes('--dry');
const VERSION = 'de-v2';
// Core subjects can be shown on their own; extended = second foreign languages, arts, sport, religion/ethics.
const TIER = {
  Mathematik: 'core', Deutsch: 'core', Englisch: 'core', Sachunterricht: 'core', Naturwissenschaften: 'core',
  Biologie: 'core', Chemie: 'core', Physik: 'core', Geschichte: 'core', Erdkunde: 'core', 'Politik und Wirtschaft': 'core',
  'Informatik & Medienbildung': 'core',
  Französisch: 'extended', Latein: 'extended', Musik: 'extended', Kunst: 'extended', Sport: 'extended', 'Religion & Ethik': 'extended',
};
const stageOf = g => g === 0 ? 'Elementarbereich' : g <= 4 ? 'Primarstufe' : g <= 10 ? 'Sekundarstufe I' : 'Sekundarstufe II';

const authoringDir = join(root, 'authoring');
const files = readdirSync(authoringDir).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort();
const overridesPath = join(authoringDir, '_external-resolutions.json');
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};

// ---------- load + per-file checks ----------
const groups = [];
const allStdKeys = new Set();
for (const f of files) {
  const g = JSON.parse(readFileSync(join(authoringDir, f), 'utf8'));
  for (const s of g.sources || []) for (const st of s.standards || []) allStdKeys.add(`${s.slug}:${st.code}`);
  groups.push({ file: f, ...g });
}
let fatal = 0;
for (const g of groups) {
  const { errors } = checkFile(join(authoringDir, g.file), { allSources: allStdKeys });
  if (errors.length) { fatal += errors.length; console.error(`✗ ${g.file}: ${errors.length} errors, e.g. ${errors.slice(0, 3).join(' | ')}`); }
}

// ---------- merge ----------
const id = key => 'de_' + createHash('sha256').update(key).digest('base64url').slice(0, 10);
const subjects = new Map(), domains = new Map(), sources = new Map(), clusters = [], clusterKeys = new Set();
const topics = [], byKey = new Map();
for (const g of groups) {
  for (const s of g.subjects) {
    const prev = subjects.get(s.name);
    // the entry that reaches the highest Klasse describes the whole subject (with its translations)
    const keepPrev = prev && prev.grades[1] >= s.grades[1];
    const pick = f => keepPrev ? prev[f] : s[f] || prev?.[f];
    subjects.set(s.name, prev ? { ...prev, nameRo: prev.nameRo || s.nameRo, description: pick('description'), descriptionDe: pick('descriptionDe'), descriptionRo: pick('descriptionRo'), grades: [Math.min(prev.grades[0], s.grades[0]), Math.max(prev.grades[1], s.grades[1])] } : { ...s, group: g.group });
  }
  for (const d of g.domains) domains.set(`${d.subject}|${d.name}`, d);
  for (const s of g.sources) {
    const prev = sources.get(s.slug);
    if (!prev) sources.set(s.slug, { ...s, standards: [...s.standards], owner: g.group });
    else {
      const codes = new Map(prev.standards.map(x => [x.code, x]));
      for (const st of s.standards) {
        if (!codes.has(st.code)) prev.standards.push(st);
        else if (st.titleDe && codes.get(st.code).titleDe && st.titleDe !== codes.get(st.code).titleDe) console.warn(`! ${s.slug}:${st.code} defined differently in ${g.file} (kept ${prev.owner}'s title)`);
      }
    }
  }
  for (const c of g.clusters) {
    const ck = `${c.subject}|${c.domain}|${c.gradeStart}`;
    if (clusterKeys.has(ck)) { console.warn(`! duplicate cluster ${ck} in ${g.file} (kept the first)`); continue; }
    clusterKeys.add(ck); clusters.push(c);
  }
  for (const t of g.topics) {
    if (byKey.has(t.key)) { console.error(`✗ duplicate key across files: ${t.key}`); fatal++; continue; }
    const row = { ...t, id: id(t.key), group: g.group };
    topics.push(row); byKey.set(t.key, row);
  }
}
const ids = new Set();
for (const t of topics) { if (ids.has(t.id)) { console.error(`✗ id collision ${t.id}`); fatal++; } ids.add(t.id); }

// ---------- unknown standards across merged catalogue ----------
for (const t of topics) for (const s of t.standards) if (!allStdKeys.has(s)) { console.error(`✗ ${t.key}: standard ${s} not in any catalogue`); fatal++; }

// ---------- resolve external prerequisites ----------
// BM25 over German topics of the target subject; candidate must start no later than the dependent topic.
const bySubject = new Map();
for (const t of topics) {
  if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
  const nameToks = tokenize(`${t.name} ${t.nameDe}`);
  bySubject.get(t.subject).push({ t, toks: [...nameToks, ...nameToks, ...tokenize(t.description), ...tokenize(t.evidence.join(' '))] });
}
// A cited subject is searched together with its predecessors/successors (e.g. Biologie ↔ Naturwissenschaften Kl. 5–6 ↔ Sachunterricht).
const RESOLVE_IN = {
  Naturwissenschaften: ['Naturwissenschaften', 'Biologie', 'Chemie', 'Physik', 'Sachunterricht'],
  Biologie: ['Biologie', 'Naturwissenschaften', 'Sachunterricht'], Chemie: ['Chemie', 'Naturwissenschaften', 'Sachunterricht'],
  Physik: ['Physik', 'Naturwissenschaften', 'Sachunterricht'], Sachunterricht: ['Sachunterricht', 'Naturwissenschaften', 'Erdkunde', 'Geschichte', 'Politik und Wirtschaft'],
  Erdkunde: ['Erdkunde', 'Sachunterricht'], Geschichte: ['Geschichte', 'Sachunterricht'], 'Politik und Wirtschaft': ['Politik und Wirtschaft', 'Sachunterricht'],
};
const idxCache = new Map();
function indexFor(subjectList) {
  const ck = subjectList.join('|');
  if (idxCache.has(ck)) return idxCache.get(ck);
  const docs = subjectList.flatMap(s => bySubject.get(s) || []).map(d => ({ ...d }));
  const df = new Map();
  for (const d of docs) { d.tf = new Map(); for (const w of d.toks) d.tf.set(w, (d.tf.get(w) || 0) + 1); for (const w of new Set(d.toks)) df.set(w, (df.get(w) || 0) + 1); }
  const ix = docs.length ? { docs, df, N: docs.length, avgdl: docs.reduce((a, d) => a + d.toks.length, 0) / docs.length } : null;
  idxCache.set(ck, ix); return ix;
}
function bm25(subject, query, wide) {
  // Klasse 0–6 topics keep single-subject search (their reviewed resolutions stay stable).
  const ix = indexFor(wide && RESOLVE_IN[subject] ? RESOLVE_IN[subject] : [subject]); if (!ix) return [];
  const q = [...new Set(tokenize(query))];
  return ix.docs.map(d => {
    let s = 0;
    for (const w of q) { const f = d.tf.get(w); if (!f) continue; const n = ix.df.get(w); s += Math.log(1 + (ix.N - n + 0.5) / (n + 0.5)) * (f * 2.4) / (f + 1.4 * (0.25 + 0.75 * d.toks.length / ix.avgdl)); }
    return [s, d.t];
  }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
}
const SUBJECT_ALIASES = { 'Informatik': 'Informatik & Medienbildung', 'Medienbildung': 'Informatik & Medienbildung', 'Ethik': 'Religion & Ethik', 'Religion': 'Religion & Ethik', 'Philosophie': 'Religion & Ethik', 'Politik': 'Politik und Wirtschaft', 'Politik & Wirtschaft': 'Politik und Wirtschaft', 'Sozialkunde': 'Politik und Wirtschaft', 'Wirtschaft': 'Politik und Wirtschaft', 'Geographie': 'Erdkunde', 'Französisch (2. Fremdsprache)': 'Französisch' };
const extReport = [];
const edges = [];
for (const t of topics) {
  for (const p of t.prerequisites) edges.push({ topicId: t.id, prerequisiteId: byKey.get(p.key).id, strength: p.strength, reason: p.reason || null, reasonDe: p.reasonDe || null, reasonRo: p.reasonRo || null, origin: 'authored' });
  for (const x of t.externalPrerequisites || []) {
    const subject = SUBJECT_ALIASES[x.subject] || x.subject;
    const okey = `${t.key}|${x.concept}`;
    let chosen = null, how = 'unresolved', score = 0, alts = [];
    if (overrides[okey] !== undefined) {
      if (overrides[okey] === null) how = 'dropped-by-override';
      else { chosen = byKey.get(overrides[okey]); how = chosen ? 'override' : 'override-missing'; }
    } else {
      const cands = bm25(subject, x.concept, t.gradeStart >= 7).filter(([, c]) => c.gradeStart <= t.gradeStart && c.key !== t.key);
      alts = cands.slice(0, 3).map(([s, c]) => `${c.key} (${s.toFixed(1)})`);
      if (cands.length && cands[0][0] >= 4) { chosen = cands[0][1]; score = cands[0][0]; how = 'bm25'; }
    }
    extReport.push({ topic: t.key, subject, concept: x.concept, strength: x.strength, resolvedTo: chosen?.key || null, how, score: +score.toFixed(2), alternatives: alts });
    if (chosen) edges.push({ topicId: t.id, prerequisiteId: chosen.id, strength: x.strength, reason: x.reason || `Builds on ${chosen.name}`, reasonDe: x.reasonDe || null, reasonRo: x.reasonRo || null, origin: how === 'override' ? 'external-override' : 'external-bm25' });
  }
}
// dedupe edges (keep hard over soft)
const edgeMap = new Map();
for (const e of edges) {
  const k = `${e.topicId}>${e.prerequisiteId}`;
  const prev = edgeMap.get(k);
  if (!prev || (prev.strength === 'soft' && e.strength === 'hard')) edgeMap.set(k, e);
}
const byId = new Map(topics.map(t => [t.id, t]));
let finalEdges = [...edgeMap.values()].filter(e => e.topicId !== e.prerequisiteId);

// drop external edges that create cycles (authored edges are already acyclic per file)
function hasPath(from, to, adj) { // is `to` reachable from `from` following prerequisite direction
  const stack = [from], seen = new Set();
  while (stack.length) { const n = stack.pop(); if (n === to) return true; if (seen.has(n)) continue; seen.add(n); for (const m of adj.get(n) || []) stack.push(m); }
  return false;
}
const adj = new Map();
const keep = [];
const ordered = [...finalEdges.filter(e => e.origin === 'authored'), ...finalEdges.filter(e => e.origin !== 'authored')];
const droppedCycle = [];
for (const e of ordered) {
  if (hasPath(e.prerequisiteId, e.topicId, adj)) {
    if (e.origin === 'authored') { console.error(`✗ cycle through authored edge ${byId.get(e.topicId).key} <- ${byId.get(e.prerequisiteId).key}`); fatal++; }
    droppedCycle.push(e); continue;
  }
  if (!adj.has(e.topicId)) adj.set(e.topicId, []);
  adj.get(e.topicId).push(e.prerequisiteId);
  keep.push(e);
}
finalEdges = keep;
for (const e of finalEdges) {
  const a = byId.get(e.topicId), b = byId.get(e.prerequisiteId);
  if (b.gradeStart > a.gradeStart) { console.error(`✗ grade order: ${a.key} <- ${b.key}`); fatal++; }
}

// ---------- centrality: normalised count of transitive dependents ----------
const dependents = new Map();
for (const e of finalEdges) { if (!dependents.has(e.prerequisiteId)) dependents.set(e.prerequisiteId, []); dependents.get(e.prerequisiteId).push(e.topicId); }
const reach = new Map();
for (const t of topics) {
  const seen = new Set(), stack = [...(dependents.get(t.id) || [])];
  while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n); for (const m of dependents.get(n) || []) stack.push(m); }
  reach.set(t.id, seen.size);
}
const maxReach = Math.max(1, ...reach.values());

// ---------- outputs ----------
for (const s of subjects.keys()) if (!TIER[s]) { console.error(`✗ subject ${s} has no tier (add it to TIER in tools/build.mjs)`); fatal++; }
const outTopics = topics
  .map(t => {
    const d = domains.get(`${t.subject}|${t.domain}`);
    const subj = subjects.get(t.subject);
    return {
      id: t.id, key: t.key, type: t.type,
      subject: t.subject, subjectEn: subj?.nameEn || null,
      domain: t.domain, domainEn: d?.nameEn || null,
      name: t.name, nameDe: t.nameDe, nameRo: t.nameRo || null, description: t.description, descriptionDe: t.descriptionDe || null, descriptionRo: t.descriptionRo || null,
      gradeStart: t.gradeStart, gradeEnd: t.gradeEnd, stage: stageOf(t.gradeStart), courseLevel: t.gradeStart >= 11 ? t.courseLevel : null,
      ageRangeStart: t.gradeStart + 5, ageRangeEnd: t.gradeEnd + 6,
      centrality: +(reach.get(t.id) / maxReach).toFixed(4),
      evidence: t.evidence, evidenceDe: t.evidenceDe || null, evidenceRo: t.evidenceRo || null,
      assessmentPrompt: t.assessmentPrompt, assessmentPromptDe: t.assessmentPromptDe || null, assessmentPromptRo: t.assessmentPromptRo || null,
      standards: [...t.standards].sort(),
      germanSpecific: !!t.germanSpecific,
      laenderNotes: t.laenderNotes || null, laenderNotesDe: t.laenderNotesDe || null, laenderNotesRo: t.laenderNotesRo || null,
    };
  })
  .sort((a, b) => a.subject.localeCompare(b.subject) || a.gradeStart - b.gradeStart || a.key.localeCompare(b.key));

const stdUse = new Map();
for (const t of outTopics) for (const s of t.standards) stdUse.set(s, (stdUse.get(s) || 0) + 1);
const curricula = [...sources.values()].sort((a, b) => a.slug.localeCompare(b.slug)).map(s => ({
  slug: s.slug, country: s.country || 'DE', region: s.region ?? null, name: s.name, version: s.version,
  sourceUrl: s.sourceUrl || null, level: s.level || null, textIncluded: false,
  license: 'Codes constructed by this project; titles are short paraphrases (not official text). Upstream terms apply to the official documents.',
  notes: s.notes || null, notesDe: s.notesDe || null, notesRo: s.notesRo || null,
  topicCount: s.standards.length,
  topics: s.standards.map(st => ({ key: `${s.slug}:${st.code}`, code: st.code, data: { area: st.area || null, titleDe: st.titleDe || null, titleEn: st.titleEn || null, titleRo: st.titleRo || null, grades: st.grades ?? null } })),
}));

const crosswalk = [];
for (const t of topics) for (const m of t.osMatches) crosswalk.push({ deId: t.id, deKey: t.key, osId: m.id, relation: m.relation, note: m.note || null, noteDe: m.noteDe || null, noteRo: m.noteRo || null });

const outClusters = clusters.map(c => ({ subject: c.subject, domain: c.domain, gradeStart: c.gradeStart, ageRangeStart: c.gradeStart + 5, summary: c.summary, summaryDe: c.summaryDe, summaryRo: c.summaryRo || null }))
  .sort((a, b) => a.subject.localeCompare(b.subject) || a.domain.localeCompare(b.domain) || a.gradeStart - b.gradeStart);

const outSubjects = [...subjects.values()].map(s => ({
  name: s.name, nameEn: s.nameEn, nameRo: s.nameRo || null, tier: TIER[s.name] || null, grades: s.grades, description: s.description || null, descriptionDe: s.descriptionDe || null, descriptionRo: s.descriptionRo || null,
  domains: [...domains.values()].filter(d => d.subject === s.name).map(d => ({ name: d.name, nameEn: d.nameEn, nameRo: d.nameRo || null, basis: d.basis || null, basisDe: d.basisDe || null, basisRo: d.basisRo || null, topicCount: outTopics.filter(t => t.subject === s.name && t.domain === d.name).length })),
  topicCount: outTopics.filter(t => t.subject === s.name).length,
})).sort((a, b) => b.topicCount - a.topicCount);

const files_ = {
  'topics.json': { version: VERSION, topicCount: outTopics.length, topics: outTopics },
  'dependencies.json': { version: VERSION, note: '`topicId` depends on `prerequisiteId`. Directed acyclic graph.', edgeCount: finalEdges.length, dependencies: finalEdges.map(({ origin, ...e }) => ({ ...e, origin })).sort((a, b) => a.topicId.localeCompare(b.topicId) || a.prerequisiteId.localeCompare(b.prerequisiteId)) },
  'curriculum-standards.json': { note: 'German curriculum frameworks. Codes are constructed by this project in document order unless a source uses official numbering; titles are paraphrases. See PROVENANCE.md.', curriculumCount: curricula.length, curricula },
  'clusters.json': { version: VERSION, clusterCount: outClusters.length, clusters: outClusters },
  'subjects.json': { version: VERSION, subjects: outSubjects },
  'crosswalk-os-taxonomy.json': { version: VERSION, osTaxonomyVersion: 'v1', note: 'Relation is from the German topic\'s point of view: broader = the os topic is broader.', count: crosswalk.length, links: crosswalk.sort((a, b) => a.deId.localeCompare(b.deId) || a.osId.localeCompare(b.osId)) },
};
const sha = s => createHash('sha256').update(s).digest('hex');
const serialized = Object.fromEntries(Object.entries(files_).map(([k, v]) => [k, JSON.stringify(v, null, 1) + '\n']));
const bySubj = {}; for (const t of outTopics) bySubj[t.subject] = (bySubj[t.subject] || 0) + 1;
const manifest = {
  dataset: 'German Curriculum Taxonomy (Vorschule – Klasse 13)', taxonomyVersion: VERSION, generatedFrom: files,
  counts: {
    topics: outTopics.length, topicsBySubject: bySubj, dependencies: finalEdges.length,
    hardDependencies: finalEdges.filter(e => e.strength === 'hard').length,
    curricula: curricula.length, curriculumStandards: curricula.reduce((a, c) => a + c.topicCount, 0),
    topicStandardLinks: outTopics.reduce((a, t) => a + t.standards.length, 0),
    linkedStandards: stdUse.size, clusters: outClusters.length, crosswalkLinks: crosswalk.length,
    topicsWithOsMatch: topics.filter(t => t.osMatches.length).length,
    germanSpecificTopics: outTopics.filter(t => t.germanSpecific).length,
  },
  files: Object.fromEntries(Object.entries(serialized).map(([k, v]) => [k, { sha256: sha(v), bytes: Buffer.byteLength(v) }])),
};

const extSummary = extReport.reduce((a, r) => (a[r.how] = (a[r.how] || 0) + 1, a), {});
console.log(JSON.stringify({ topics: outTopics.length, edges: finalEdges.length, droppedCycleEdges: droppedCycle.length, external: extSummary, fatal }, null, 0));
if (!DRY) {
  mkdirSync(join(root, 'data'), { recursive: true });
  for (const [k, v] of Object.entries(serialized)) writeFileSync(join(root, 'data', k), v);
  writeFileSync(join(root, 'data', 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  mkdirSync(join(root, 'reports'), { recursive: true });
  writeFileSync(join(root, 'reports', 'external-prerequisites.json'), JSON.stringify({ summary: extSummary, droppedForCycles: droppedCycle.map(e => ({ topic: byId.get(e.topicId).key, prerequisite: byId.get(e.prerequisiteId).key })), rows: extReport }, null, 1) + '\n');
}
process.exit(fatal ? 1 : 0);
