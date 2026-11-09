#!/usr/bin/env node
// Compare the German taxonomy with os-taxonomy via the crosswalk.
// Writes ../comparison/comparison.json (data for the explorer) and ../comparison/generated-tables.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, '../comparison');
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const deAll = J(join(root, 'data/topics.json')).topics;
const deDepsAll = J(join(root, 'data/dependencies.json')).dependencies;
const cwAll = J(join(root, 'data/crosswalk-os-taxonomy.json')).links;
const TIER = Object.fromEntries(J(join(root, 'data/subjects.json')).subjects.map(s => [s.name, s.tier || 'core']));
const deStd = J(join(root, 'data/curriculum-standards.json')).curricula;
const osDir = resolve(root, '../os-taxonomy/data');
const os = J(join(osDir, 'topics.json')).topics;
const osDeps = J(join(osDir, 'dependencies.json')).dependencies;
const osAlign = J(join(osDir, 'curriculum-alignments.json')).alignments;
const osClusters = J(join(osDir, 'clusters.json')).clusters;
const STAGES = [['Grundschule (Vorschule–Kl. 4)', 0, 4], ['Sek I (Kl. 5–10)', 5, 10], ['Oberstufe (Kl. 11–13)', 11, 13]];

const STRONG = new Set(['exact', 'close']);
const COVER = new Set(['exact', 'close', 'broader', 'narrower']);
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = xs => xs.length ? Math.round(100 * xs.reduce((a, b) => a + b, 0) / xs.length) / 100 : null;
const count = (xs, f) => xs.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});

// ---------- graph stats ----------
function graphStats(nodes, edges) {
  const pre = new Map(), dependents = new Map();
  for (const e of edges) {
    (pre.get(e.topicId) || pre.set(e.topicId, []).get(e.topicId)).push(e.prerequisiteId);
    (dependents.get(e.prerequisiteId) || dependents.set(e.prerequisiteId, []).get(e.prerequisiteId)).push(e.topicId);
  }
  const depth = new Map();
  const d = id => { if (depth.has(id)) return depth.get(id); depth.set(id, 1); const v = 1 + Math.max(0, ...(pre.get(id) || []).map(d)); depth.set(id, v); return v; };
  const depths = nodes.map(n => d(n.id));
  return {
    nodes: nodes.length, edges: edges.length,
    hardShare: pct(edges.filter(e => e.strength === 'hard').length, edges.length),
    edgesPerTopic: Math.round(100 * edges.length / nodes.length) / 100,
    roots: nodes.filter(n => !(pre.get(n.id) || []).length).length,
    leaves: nodes.filter(n => !(dependents.get(n.id) || []).length).length,
    maxDepth: Math.max(...depths), meanDepth: mean(depths),
    pre,
  };
}
const crossShare = (nodes, edges) => { const m = new Map(nodes.map(n => [n.id, n.subject])); return pct(edges.filter(e => m.get(e.topicId) !== m.get(e.prerequisiteId)).length, edges.length); };

// ---------- per-jurisdiction ages for os topics ----------
const JUR = { GB: 'England (UK NC)', US: 'USA (CCSS/NGSS)', AU: 'Australia (ACARA v9)', CA: 'Ontario' };
const osJurAge = new Map(); // osId -> {GB: start, ...}
for (const a of osAlign) {
  if (a.scope !== 'jurisdiction' || !JUR[a.country]) continue;
  const m = osJurAge.get(a.topicId) || {};
  m[a.country] = Math.min(m[a.country] ?? 99, a.ageRangeStart);
  osJurAge.set(a.topicId, m);
}

// Everything below runs once for all subjects and once for the core subjects only.
function analyze(de, deDeps, cw) {
const deById = new Map(de.map(t => [t.id, t]));
const deG = graphStats(de, deDeps), osG = graphStats(os, osDeps);

// ---------- crosswalk aggregation ----------
const linksByDe = new Map();
for (const l of cw) (linksByDe.get(l.deId) || linksByDe.set(l.deId, []).get(l.deId)).push(l);
const relRank = { exact: 0, close: 1, broader: 2, narrower: 3, related: 4 };
const bestRel = id => { const ls = linksByDe.get(id) || []; return ls.length ? ls.map(l => l.relation).sort((a, b) => relRank[a] - relRank[b])[0] : 'none'; };
const bucket = r => r === 'exact' || r === 'close' ? 'strong' : r === 'broader' || r === 'narrower' ? 'partial' : r === 'related' ? 'related' : 'none';

const deSubjects = [...new Set(de.map(t => t.subject))];
const osSubjects = [...new Set(os.map(t => t.subject))].sort();

// DE coverage by os
const deCoverage = deSubjects.map(s => {
  const ts = de.filter(t => t.subject === s);
  const b = count(ts, t => bucket(bestRel(t.id)));
  return { subject: s, topics: ts.length, strong: b.strong || 0, partial: b.partial || 0, related: b.related || 0, none: b.none || 0, germanSpecific: ts.filter(t => t.germanSpecific).length };
}).sort((a, b) => b.topics - a.topics);

// DE subject x os subject matrix (coverage links only)
const matrix = {};
for (const l of cw) {
  if (!COVER.has(l.relation)) continue;
  const ds = deById.get(l.deId)?.subject, osS = osById.get(l.osId)?.subject;
  if (!ds || !osS) continue;
  matrix[ds] ??= {}; matrix[ds][osS] = (matrix[ds][osS] || 0) + 1;
}

// os coverage by DE (per os subject + domain)
const osCovered = new Map(); // osId -> best relation
for (const l of cw) {
  const prev = osCovered.get(l.osId);
  if (!prev || relRank[l.relation] < relRank[prev]) osCovered.set(l.osId, l.relation);
}
const osCoverage = osSubjects.map(s => {
  const ts = os.filter(t => t.subject === s);
  const doms = [...new Set(ts.map(t => t.domain))].map(d => {
    const dt = ts.filter(t => t.domain === d);
    const cov = dt.filter(t => COVER.has(osCovered.get(t.id))).length;
    return { domain: d, topics: dt.length, covered: cov, pct: pct(cov, dt.length) };
  }).sort((a, b) => a.pct - b.pct || b.topics - a.topics);
  const cov = ts.filter(t => COVER.has(osCovered.get(t.id))).length;
  const rel = ts.filter(t => osCovered.get(t.id) === 'related').length;
  return { subject: s, topics: ts.length, covered: cov, relatedOnly: rel, pct: pct(cov, ts.length), domains: doms };
}).sort((a, b) => b.topics - a.topics);

// os age-band coverage (how much of os content per age is matched)
const osByAge = {};
for (const t of os) { const a = t.ageRangeStart; osByAge[a] ??= { topics: 0, covered: 0 }; osByAge[a].topics++; if (COVER.has(osCovered.get(t.id))) osByAge[a].covered++; }

// ---------- age offsets ----------
const offsets = []; // per strong DE↔os pair
for (const l of cw) {
  if (!STRONG.has(l.relation)) continue;
  const d = deById.get(l.deId), o = osById.get(l.osId);
  if (!d || !o) continue;
  const jur = osJurAge.get(o.id) || {};
  offsets.push({
    deKey: d.key, deName: d.name, deSubject: d.subject, deDomain: d.domain, deAge: d.ageRangeStart, grade: d.gradeStart,
    osId: o.id, osName: o.name, osSubject: o.subject, osAge: o.ageRangeStart, relation: l.relation,
    diff: d.ageRangeStart - o.ageRangeStart,
    jur: Object.fromEntries(Object.keys(JUR).filter(k => jur[k] !== undefined).map(k => [k, d.ageRangeStart - jur[k]])),
  });
}
// one record per DE topic (closest os counterpart by best relation, then min |diff|)
const perTopic = new Map();
for (const o of offsets) { const p = perTopic.get(o.deKey); if (!p || relRank[o.relation] < relRank[p.relation] || (o.relation === p.relation && Math.abs(o.diff) < Math.abs(p.diff))) perTopic.set(o.deKey, o); }
const topicOffsets = [...perTopic.values()];
const offsetBySubject = deSubjects.map(s => {
  const xs = topicOffsets.filter(o => o.deSubject === s);
  const jurMed = Object.fromEntries(Object.keys(JUR).map(k => [k, median(xs.map(o => o.jur[k]).filter(v => v !== undefined))]));
  return { subject: s, n: xs.length, medianDiff: median(xs.map(o => o.diff)), meanDiff: mean(xs.map(o => o.diff)), later: xs.filter(o => o.diff > 0).length, same: xs.filter(o => o.diff === 0).length, earlier: xs.filter(o => o.diff < 0).length, byJurisdiction: jurMed };
}).filter(r => r.n).sort((a, b) => b.n - a.n);
const offsetByDomain = [];
for (const s of deSubjects) for (const d of new Set(de.filter(t => t.subject === s).map(t => t.domain))) {
  const xs = topicOffsets.filter(o => o.deSubject === s && o.deDomain === d);
  if (xs.length >= 3) offsetByDomain.push({ subject: s, domain: d, n: xs.length, medianDiff: median(xs.map(o => o.diff)), byJurisdiction: Object.fromEntries(Object.keys(JUR).map(k => [k, median(xs.map(o => o.jur[k]).filter(v => v !== undefined))])) });
}
offsetByDomain.sort((a, b) => b.medianDiff - a.medianDiff);
const jurOverall = Object.fromEntries(Object.keys(JUR).map(k => { const v = topicOffsets.map(o => o.jur[k]).filter(x => x !== undefined); return [k, { n: v.length, median: median(v), mean: mean(v) }]; }));
const diffHist = count(topicOffsets, o => Math.max(-4, Math.min(4, o.diff)));
const OFFSET_STAGES = [['Grundschule (Vorschule–Kl. 4)', 0, 4], ['Kl. 5–6', 5, 6], ['Kl. 7–10', 7, 10], ['Oberstufe (Kl. 11–13)', 11, 13]];
const offsetByStage = OFFSET_STAGES.map(([stage, g0, g1]) => {
  const xs = topicOffsets.filter(o => o.grade >= g0 && o.grade <= g1);
  return { stage, range: `${g0}-${g1}`, n: xs.length, medianDiff: median(xs.map(o => o.diff)), byJurisdiction: Object.fromEntries(Object.keys(JUR).map(k => { const v = xs.map(o => o.jur[k]).filter(x => x !== undefined); return [k, { n: v.length, median: median(v) }]; })) };
}).filter(r => r.n);
// robustness: exact matches only (avoids pairing an early simple version with a later deeper one)
const exactOnly = topicOffsets.filter(o => o.relation === 'exact');
const exactSummary = { n: exactOnly.length, median: median(exactOnly.map(o => o.diff)), byJurisdiction: Object.fromEntries(Object.keys(JUR).map(k => { const v = exactOnly.map(o => o.jur[k]).filter(x => x !== undefined); return [k, { n: v.length, median: median(v) }]; })), bySubject: Object.fromEntries(deSubjects.map(s => { const v = exactOnly.filter(o => o.deSubject === s).map(o => o.diff); return [s, { n: v.length, median: median(v) }]; }).filter(([, x]) => x.n)) };

// ---------- prerequisite agreement ----------
// For a German edge a <- b where a,b map (strong/partial) onto os topics A,B (A != B), is B an ancestor of A in os?
const osAnc = new Map();
function ancestors(id) {
  if (osAnc.has(id)) return osAnc.get(id);
  const seen = new Set(), stack = [...(osG.pre.get(id) || [])];
  while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n); for (const m of osG.pre.get(n) || []) stack.push(m); }
  osAnc.set(id, seen); return seen;
}
const covMap = new Map(); for (const [id, ls] of linksByDe) covMap.set(id, ls.filter(l => COVER.has(l.relation)).map(l => l.osId));
const agree = { pairs: 0, same: 0, agree: 0, reversed: 0, unrelated: 0, examplesReversed: [] };
for (const e of deDeps) {
  const A = covMap.get(e.topicId) || [], B = covMap.get(e.prerequisiteId) || [];
  if (!A.length || !B.length) continue;
  agree.pairs++;
  let best = 'unrelated';
  outer: for (const a of A) for (const b of B) {
    if (a === b) { best = best === 'unrelated' ? 'same' : best; continue; }
    if (ancestors(a).has(b)) { best = 'agree'; break outer; }
    if (ancestors(b).has(a)) best = 'reversed';
  }
  agree[best]++;
  if (best === 'reversed' && agree.examplesReversed.length < 12) agree.examplesReversed.push({ topic: deById.get(e.topicId).name, prerequisite: deById.get(e.prerequisiteId).name, strength: e.strength });
}

// ---------- notable lists ----------
const germanOnly = de.filter(t => bestRel(t.id) === 'none').map(t => ({ key: t.key, name: t.name, nameDe: t.nameDe, subject: t.subject, domain: t.domain, grade: t.gradeStart, germanSpecific: t.germanSpecific }));
const laterExamples = topicOffsets.filter(o => o.diff >= 2).sort((a, b) => b.diff - a.diff).slice(0, 25);
const earlierExamples = topicOffsets.filter(o => o.diff <= -1).sort((a, b) => a.diff - b.diff).slice(0, 25);
const osUnmatchedDomains = osCoverage.flatMap(s => s.domains.filter(d => d.covered === 0).map(d => ({ subject: s.subject, ...d })));

// ---------- structure ----------
const structure = {
  de: { topics: de.length, subjects: deSubjects.length, domains: new Set(de.map(t => `${t.subject}|${t.domain}`)).size, edges: deDeps.length, hardShare: deG.hardShare, edgesPerTopic: deG.edgesPerTopic, roots: deG.roots, maxDepth: deG.maxDepth, meanDepth: deG.meanDepth, crossSubjectEdgeShare: crossShare(de, deDeps), curricula: deStd.length, standards: deStd.reduce((a, c) => a + c.topicCount, 0), topicsWithStandards: pct(de.filter(t => t.standards.length).length, de.length), ageMin: Math.min(...de.map(t => t.ageRangeStart)), ageMax: Math.max(...de.map(t => t.ageRangeEnd)), meanAgeSpan: mean(de.map(t => t.ageRangeEnd - t.ageRangeStart)), types: count(de, t => t.type), germanSpecific: de.filter(t => t.germanSpecific).length },
  os: { topics: os.length, subjects: osSubjects.length, domains: new Set(os.map(t => `${t.subject}|${t.domain}`)).size, edges: osDeps.length, hardShare: osG.hardShare, edgesPerTopic: osG.edgesPerTopic, roots: osG.roots, maxDepth: osG.maxDepth, meanDepth: osG.meanDepth, crossSubjectEdgeShare: crossShare(os, osDeps), curricula: 17, standards: 7743, topicsWithStandards: pct(os.filter(t => t.standards.length).length, os.length), ageMin: Math.min(...os.map(t => t.ageRangeStart)), ageMax: Math.max(...os.map(t => t.ageRangeEnd)), meanAgeSpan: mean(os.map(t => t.ageRangeEnd - t.ageRangeStart)), types: count(os, t => t.type) },
};
const relationCounts = count(cw, l => l.relation);

// coverage by school stage
const deByStage = STAGES.map(([label, g0, g1]) => {
  const ts = de.filter(t => t.gradeStart >= g0 && t.gradeStart <= g1);
  const b = count(ts, t => bucket(bestRel(t.id)));
  return { stage: label, range: `${g0}-${g1}`, topics: ts.length, strong: b.strong || 0, partial: b.partial || 0, related: b.related || 0, none: b.none || 0 };
}).filter(r => r.topics);

return { result: { structure, relationCounts, deCoverage, deByStage, matrix, osCoverage, osByAge, offsets: { exactOnly: exactSummary, byStage: offsetByStage, bySubject: offsetBySubject, byDomain: offsetByDomain, overallByJurisdiction: jurOverall, histogram: diffHist, pairs: topicOffsets.map(o => [o.deKey, o.osId]), n: topicOffsets.length, median: median(topicOffsets.map(o => o.diff)), laterExamples, earlierExamples }, prerequisiteAgreement: agree, germanOnly, osUnmatchedDomains },
  linksByDe, osCovered, topicOffsets, exactSummary, jurOverall, offsetBySubject, offsetByDomain, laterExamples, earlierExamples, agree, germanOnly, osUnmatchedDomains, deCoverage, matrix, osCoverage, structure, relationCounts, deSubjects, tot: deCoverage.reduce((a, r) => ({ t: a.t + r.topics, s: a.s + r.strong, p: a.p + r.partial, r: a.r + r.related, n: a.n + r.none, g: a.g + r.germanSpecific }), { t: 0, s: 0, p: 0, r: 0, n: 0, g: 0 }), deByStage };
}

const osById = new Map(os.map(t => [t.id, t]));
const coreIds = new Set(deAll.filter(t => TIER[t.subject] === 'core').map(t => t.id));
const A = analyze(deAll, deDepsAll, cwAll);
const CORE = analyze(deAll.filter(t => coreIds.has(t.id)), deDepsAll.filter(e => coreIds.has(e.topicId) && coreIds.has(e.prerequisiteId)), cwAll.filter(l => coreIds.has(l.deId)));
const { linksByDe, osCovered, topicOffsets, exactSummary, jurOverall, offsetBySubject, offsetByDomain, laterExamples, earlierExamples, agree, germanOnly, osUnmatchedDomains, deCoverage, matrix, osCoverage, structure, relationCounts, deSubjects } = A;
const de = deAll;
const osSubjects = [...new Set(os.map(t => t.subject))].sort();
const bucket = r => r === 'exact' || r === 'close' ? 'strong' : r === 'broader' || r === 'narrower' ? 'partial' : r === 'related' ? 'related' : 'none';

// ---------- explorer payload ----------
// names and texts as maps { en, de, ro } so the page can switch language; os-taxonomy texts exist in English only
const M = (en, de, ro) => Object.fromEntries(Object.entries({ en, de, ro }).filter(([, v]) => v != null && v !== ''));
const deSubjData = J(join(root, 'data/subjects.json')).subjects;
const explorer = {
  de: de.map(t => ({ id: t.id, k: t.key, s: t.subject, tr: TIER[t.subject], d: t.domain, N: M(t.name, t.nameDe, t.nameRo), DS: M(t.description, t.descriptionDe, t.descriptionRo), EV: M(t.evidence, t.evidenceDe, t.evidenceRo), LN: t.laenderNotes ? M(t.laenderNotes, t.laenderNotesDe, t.laenderNotesRo) : null, g: [t.gradeStart, t.gradeEnd], a: [t.ageRangeStart, t.ageRangeEnd], cl: t.courseLevel || null, ty: t.type, gs: t.germanSpecific, st: t.standards, m: (linksByDe.get(t.id) || []).map(l => [l.osId, l.relation, l.note ? M(l.note, l.noteDe, l.noteRo) : null]) })),
  os: os.map(t => ({ id: t.id, s: t.subject, d: t.domain, n: t.name, ds: t.description, a: [t.ageRangeStart, t.ageRangeEnd], j: osJurAge.get(t.id) || {}, c: osCovered.get(t.id) || null, cc: CORE.osCovered.get(t.id) || null })),
  deEdges: deDepsAll.map(e => [e.topicId, e.prerequisiteId, e.strength === 'hard' ? 1 : 0]),
  names: {
    deSubj: Object.fromEntries(deSubjData.map(s => [s.name, M(s.nameEn, s.name, s.nameRo)])),
    deDom: Object.fromEntries(deSubjData.flatMap(s => s.domains.map(d => [s.name + '|' + d.name, M(d.nameEn, d.name, d.nameRo)]))),
  },
};

const result = { generatedAt: new Date().toISOString().slice(0, 10), jurisdictions: JUR, ...A.result, variants: { all: A.result, core: CORE.result } };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'comparison.json'), JSON.stringify(result, null, 1) + '\n');
writeFileSync(join(outDir, 'explorer-data.json'), JSON.stringify(explorer) + '\n');

// ---------- markdown tables ----------
const L = [];
const row = cells => L.push(`| ${cells.join(' | ')} |`);
L.push('# Generated comparison tables', '', `_Generated ${result.generatedAt} by \`de-taxonomy/scripts/compare.mjs\`. Do not edit by hand._`, '');
L.push('## Structure', ''); row(['Metric', 'German taxonomy', 'os-taxonomy']); row(['---', '---:', '---:']);
for (const [k, label] of [['topics', 'Topics'], ['subjects', 'Subjects'], ['domains', 'Domains'], ['edges', 'Prerequisite edges'], ['hardShare', 'Hard edges %'], ['edgesPerTopic', 'Edges per topic'], ['roots', 'Root topics (no prerequisites)'], ['maxDepth', 'Max prerequisite depth'], ['meanDepth', 'Mean depth'], ['crossSubjectEdgeShare', 'Cross-subject edges %'], ['curricula', 'Curriculum sources'], ['standards', 'Standards in catalogue'], ['topicsWithStandards', 'Topics linked to ≥1 standard %'], ['ageMin', 'Youngest age'], ['ageMax', 'Oldest age'], ['meanAgeSpan', 'Mean age span (years)']])
  row([label, structure.de[k], structure.os[k]]);
L.push('', '## German topics: how well does os-taxonomy cover them?', '', 'strong = exact/close match; partial = os topic broader/narrower; related = adjacent only; none = no counterpart.', '');
row(['German subject', 'Topics', 'Strong', 'Partial', 'Related only', 'None', 'Strong+partial %', 'German-specific']); row(['---', '---:', '---:', '---:', '---:', '---:', '---:', '---:']);
for (const r of deCoverage) row([r.subject, r.topics, r.strong, r.partial, r.related, r.none, pct(r.strong + r.partial, r.topics), r.germanSpecific]);
const tot = A.tot;
row(['**All**', tot.t, tot.s, tot.p, tot.r, tot.n, pct(tot.s + tot.p, tot.t), tot.g]);
row(['**Core subjects only**', CORE.tot.t, CORE.tot.s, CORE.tot.p, CORE.tot.r, CORE.tot.n, pct(CORE.tot.s + CORE.tot.p, CORE.tot.t), CORE.tot.g]);
L.push('', '### By school stage', '', 'os-taxonomy runs to about age 14–15 (≈ Klasse 9), so the Oberstufe has almost no counterparts by construction.', '');
row(['Stage', 'Topics', 'Strong', 'Partial', 'Related only', 'None', 'Strong+partial %']); row(['---', '---:', '---:', '---:', '---:', '---:', '---:']);
for (const r of A.deByStage) row([r.stage, r.topics, r.strong, r.partial, r.related, r.none, pct(r.strong + r.partial, r.topics)]);
L.push('', '## Where German subjects land in os-taxonomy (coverage links)', '');
const usedOs = osSubjects.filter(s => deSubjects.some(d => matrix[d]?.[s]));
row(['German subject ↓ / os subject →', ...usedOs]); row(['---', ...usedOs.map(() => '---:')]);
for (const d of deCoverage.map(r => r.subject)) row([d, ...usedOs.map(s => matrix[d]?.[s] || '·')]);
L.push('', '## os-taxonomy topics: how many have a German counterpart?', '');
row(['os subject', 'Topics', 'Covered (strong/partial)', '%', 'Related only', 'Least-covered domains']); row(['---', '---:', '---:', '---:', '---:', '---']);
for (const r of osCoverage) row([r.subject, r.topics, r.covered, r.pct, r.relatedOnly, r.domains.slice(0, 4).map(d => `${d.domain} ${d.covered}/${d.topics}`).join('; ')]);
L.push('', '## Age offset: when German children meet the same idea (strong matches)', '', `Positive = later in Germany. German age = Klasse + 5 (start of school year). os ages are os-taxonomy's global start age; jurisdiction columns use os-taxonomy's scoped alignment contexts. n = ${topicOffsets.length} German topics with a strong match; overall median ${result.offsets.median} years.`, '');
row(['German subject', 'n', 'Median Δ (vs os global)', 'Later', 'Same', 'Earlier', ...Object.values(JUR).map(j => `Δ vs ${j}`)]); row(['---', '---:', '---:', '---:', '---:', '---:', ...Object.keys(JUR).map(() => '---:')]);
for (const r of offsetBySubject) row([r.subject, r.n, r.medianDiff, r.later, r.same, r.earlier, ...Object.keys(JUR).map(k => r.byJurisdiction[k] ?? '–')]);
row(['**All**', topicOffsets.length, result.offsets.median, topicOffsets.filter(o => o.diff > 0).length, topicOffsets.filter(o => o.diff === 0).length, topicOffsets.filter(o => o.diff < 0).length, ...Object.keys(JUR).map(k => `${jurOverall[k].median ?? '–'} (n=${jurOverall[k].n})`)]);
L.push('', `**Robustness — exact matches only** (n = ${exactSummary.n}): median Δ ${exactSummary.median}; ` + Object.keys(JUR).map(k => `${JUR[k]} ${exactSummary.byJurisdiction[k].median ?? '–'} (n=${exactSummary.byJurisdiction[k].n})`).join(', ') + '. By subject: ' + Object.entries(exactSummary.bySubject).map(([k, v]) => `${k} ${v.median} (n=${v.n})`).join(', ') + '.');
L.push('', '### By school stage', '');
row(['Stage', 'n', 'Median Δ (vs os global)', ...Object.values(JUR).map(j => `Δ vs ${j}`)]); row(['---', '---:', '---:', ...Object.keys(JUR).map(() => '---:')]);
for (const r of A.result.offsets.byStage) row([r.stage, r.n, r.medianDiff, ...Object.keys(JUR).map(k => r.byJurisdiction[k].n ? `${r.byJurisdiction[k].median} (n=${r.byJurisdiction[k].n})` : '–')]);
L.push('', '_Caveat: os-taxonomy Ontario contexts often carry the linked topic\'s own age (e.g. age 6 on Grade 4–6 expectations), so the Ontario column understates Ontario grade placement._');
L.push('', '### Domains with the largest offsets (≥3 strong matches)', '');
row(['Subject › domain', 'n', 'Median Δ', ...Object.values(JUR)]); row(['---', '---:', '---:', ...Object.keys(JUR).map(() => '---:')]);
for (const r of [...offsetByDomain.slice(0, 10), ...offsetByDomain.slice(-5)]) row([`${r.subject} › ${r.domain}`, r.n, r.medianDiff, ...Object.keys(JUR).map(k => r.byJurisdiction[k] ?? '–')]);
L.push('', '### Examples: taught ≥2 years later in Germany', '');
row(['German topic', 'Kl.', 'os topic', 'os age', 'Δ']); row(['---', '---:', '---', '---:', '---:']);
for (const o of laterExamples.slice(0, 15)) row([`${o.deName} (${o.deSubject})`, o.grade, o.osName, o.osAge, `+${o.diff}`]);
L.push('', '### Examples: taught earlier in Germany', '');
row(['German topic', 'Kl.', 'os topic', 'os age', 'Δ']); row(['---', '---:', '---', '---:', '---:']);
for (const o of earlierExamples.slice(0, 15)) row([`${o.deName} (${o.deSubject})`, o.grade, o.osName, o.osAge, o.diff]);
L.push('', '## Do the two graphs agree on prerequisite order?', '', `German prerequisite edges whose two ends both map onto os topics: **${agree.pairs}**. os path prerequisite → topic exists (agree): **${agree.agree}** (${pct(agree.agree, agree.pairs)}%); reversed: **${agree.reversed}**; both ends map to the same os topic: ${agree.same}; no path either way: ${agree.unrelated}.`, '');
if (agree.examplesReversed.length) { L.push('Reversed examples (German order is opposite to os-taxonomy):', ''); for (const x of agree.examplesReversed) L.push(`- *${x.topic}* ⇐ ${x.strength} *${x.prerequisite}*`); }
L.push('', '## os-taxonomy domains with no German counterpart', '');
for (const d of osUnmatchedDomains) L.push(`- ${d.subject} › ${d.domain} (${d.topics} topics)`);
L.push('', '## German topics with no os counterpart, by subject', '');
for (const s of deSubjects) { const xs = germanOnly.filter(t => t.subject === s); if (xs.length) L.push(`- **${s}** (${xs.length}): ${xs.slice(0, 18).map(t => t.nameDe).join(', ')}${xs.length > 18 ? ', …' : ''}`); }
L.push('', '## Crosswalk relation counts', '', Object.entries(relationCounts).map(([k, v]) => `${k}: ${v}`).join(' · '), '');
L.push('## Topic types', ''); row(['Type', 'German %', 'os %']); row(['---', '---:', '---:']);
for (const ty of ['CONCEPTUAL', 'PROCEDURAL', 'REPRESENTATIONAL', 'LANGUAGE', 'META']) row([ty, pct(structure.de.types[ty] || 0, de.length), pct(structure.os.types[ty] || 0, os.length)]);
writeFileSync(join(outDir, 'generated-tables.md'), L.join('\n') + '\n');
console.log(`comparison written: ${topicOffsets.length} age-offset topics, ${agree.pairs} edge pairs, de coverage strong+partial ${pct(tot.s + tot.p, tot.t)}%`);
