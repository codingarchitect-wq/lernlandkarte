#!/usr/bin/env node
// Compare the Romanian taxonomy with the German taxonomy via the crosswalk (deMatches).
// Writes ../comparison-ro-de/comparison.json, explorer-data.json and generated-tables.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deRoot = resolve(root, '../de-taxonomy');
const outDir = resolve(root, '../comparison-ro-de');
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const roAll = J(join(root, 'data/topics.json')).topics;
const roDepsAll = J(join(root, 'data/dependencies.json')).dependencies;
const cwAll = J(join(root, 'data/crosswalk-de-taxonomy.json')).links;
const roStd = J(join(root, 'data/curriculum-standards.json')).curricula;
const RO_TIER = Object.fromEntries(J(join(root, 'data/subjects.json')).subjects.map(s => [s.name, s.tier || 'core']));
const deAll = J(join(deRoot, 'data/topics.json')).topics;
const deDepsAll = J(join(deRoot, 'data/dependencies.json')).dependencies;
const deStd = J(join(deRoot, 'data/curriculum-standards.json')).curricula;
const DE_TIER = Object.fromEntries(J(join(deRoot, 'data/subjects.json')).subjects.map(s => [s.name, s.tier || 'core']));

// Ages: Romanian clasa N starts at N+6 (clasa pregătitoare = 0 at age 6); German Klasse N at N+5.
// G8 Länder run the Gymnasium a year ahead from Klasse 7, so their start age is one lower there.
const BASES = { de: 'German taxonomy (G9 numbering)', G8: 'German G8 Länder (Gymnasium a year ahead from Klasse 7)' };
const deAgeIn = (t, b) => b === 'G8' && t.gradeStart >= 7 ? t.ageRangeStart - 1 : t.ageRangeStart;
const RO_STAGES = [['Primar (CP–IV)', 0, 4], ['Gimnaziu (V–VIII)', 5, 8], ['Liceu (IX–XII)', 9, 12]];
const OFFSET_STAGES = [['CP–II', 0, 2], ['Clasele III–IV', 3, 4], ['Clasele V–VI', 5, 6], ['Clasele VII–VIII', 7, 8], ['Liceu (IX–XII)', 9, 12]];
const DE_STAGES = [['Grundschule (Vorschule–Kl. 4)', 0, 4], ['Sek I (Kl. 5–10)', 5, 10], ['Oberstufe (Kl. 11–13)', 11, 13]];

const STRONG = new Set(['exact', 'close']);
const COVER = new Set(['exact', 'close', 'broader', 'narrower']);
const relRank = { exact: 0, close: 1, broader: 2, narrower: 3, related: 4 };
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = xs => xs.length ? Math.round(100 * xs.reduce((a, b) => a + b, 0) / xs.length) / 100 : null;
const count = (xs, f) => xs.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const bucket = r => r === 'exact' || r === 'close' ? 'strong' : r === 'broader' || r === 'narrower' ? 'partial' : r === 'related' ? 'related' : 'none';

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
    nodes: nodes.length, edges: edges.length, hardShare: pct(edges.filter(e => e.strength === 'hard').length, edges.length),
    edgesPerTopic: Math.round(100 * edges.length / nodes.length) / 100,
    roots: nodes.filter(n => !(pre.get(n.id) || []).length).length, maxDepth: Math.max(...depths), meanDepth: mean(depths), pre,
  };
}
const crossShare = (nodes, edges) => { const m = new Map(nodes.map(n => [n.id, n.subject])); return pct(edges.filter(e => m.get(e.topicId) !== m.get(e.prerequisiteId)).length, edges.length); };

// Everything below runs once for all subjects and once for the core subjects of both taxonomies.
function analyze(ro, roDeps, de, deDeps, cw) {
  const roById = new Map(ro.map(t => [t.id, t])), deByKey = new Map(de.map(t => [t.key, t])), deById = new Map(de.map(t => [t.id, t]));
  cw = cw.filter(l => roById.has(l.roId) && deByKey.has(l.deKey));
  const roG = graphStats(ro, roDeps), deG = graphStats(de, deDeps);
  const linksByRo = new Map();
  for (const l of cw) (linksByRo.get(l.roId) || linksByRo.set(l.roId, []).get(l.roId)).push(l);
  const bestRel = id => { const ls = linksByRo.get(id) || []; return ls.length ? ls.map(l => l.relation).sort((a, b) => relRank[a] - relRank[b])[0] : 'none'; };
  const roSubjects = [...new Set(ro.map(t => t.subject))];
  const deSubjects = [...new Set(de.map(t => t.subject))];

  // Romanian coverage by the German taxonomy
  const roCoverage = roSubjects.map(s => {
    const ts = ro.filter(t => t.subject === s), b = count(ts, t => bucket(bestRel(t.id)));
    return { subject: s, topics: ts.length, strong: b.strong || 0, partial: b.partial || 0, related: b.related || 0, none: b.none || 0, romaniaSpecific: ts.filter(t => t.romaniaSpecific).length };
  }).sort((a, b) => b.topics - a.topics);
  const roByStage = RO_STAGES.map(([stage, g0, g1]) => {
    const ts = ro.filter(t => t.gradeStart >= g0 && t.gradeStart <= g1), b = count(ts, t => bucket(bestRel(t.id)));
    return { stage, range: `${g0}-${g1}`, topics: ts.length, strong: b.strong || 0, partial: b.partial || 0, related: b.related || 0, none: b.none || 0 };
  }).filter(r => r.topics);
  const matrix = {};
  for (const l of cw) {
    if (!COVER.has(l.relation)) continue;
    const rs = roById.get(l.roId).subject, ds = deByKey.get(l.deKey).subject;
    matrix[rs] ??= {}; matrix[rs][ds] = (matrix[rs][ds] || 0) + 1;
  }
  // German coverage by the Romanian taxonomy
  const deCovered = new Map();
  for (const l of cw) { const prev = deCovered.get(l.deKey); if (!prev || relRank[l.relation] < relRank[prev]) deCovered.set(l.deKey, l.relation); }
  const deCoverage = deSubjects.map(s => {
    const ts = de.filter(t => t.subject === s);
    const doms = [...new Set(ts.map(t => t.domain))].map(d => {
      const dt = ts.filter(t => t.domain === d), cov = dt.filter(t => COVER.has(deCovered.get(t.key))).length;
      return { domain: d, topics: dt.length, covered: cov, pct: pct(cov, dt.length) };
    }).sort((a, b) => a.pct - b.pct || b.topics - a.topics);
    const cov = ts.filter(t => COVER.has(deCovered.get(t.key))).length;
    return { subject: s, topics: ts.length, covered: cov, relatedOnly: ts.filter(t => deCovered.get(t.key) === 'related').length, pct: pct(cov, ts.length), domains: doms };
  }).sort((a, b) => b.topics - a.topics);
  const deByStage = DE_STAGES.map(([stage, g0, g1]) => {
    const ts = de.filter(t => t.gradeStart >= g0 && t.gradeStart <= g1), cov = ts.filter(t => COVER.has(deCovered.get(t.key))).length;
    return { stage, topics: ts.length, covered: cov, pct: pct(cov, ts.length) };
  });

  // age offsets: Romanian start age minus German start age, per strong pair
  const offsets = [];
  for (const l of cw) {
    if (!STRONG.has(l.relation)) continue;
    const r = roById.get(l.roId), d = deByKey.get(l.deKey);
    offsets.push({ roKey: r.key, roName: r.name, roNameRo: r.nameRo, roSubject: r.subject, roDomain: r.domain, roAge: r.ageRangeStart, grade: r.gradeStart,
      deKey: d.key, deName: d.name, deNameDe: d.nameDe, deSubject: d.subject, deAge: d.ageRangeStart, deGrade: d.gradeStart, relation: l.relation,
      diff: r.ageRangeStart - d.ageRangeStart, byBase: { de: r.ageRangeStart - deAgeIn(d, 'de'), G8: r.ageRangeStart - deAgeIn(d, 'G8') } });
  }
  const perTopic = new Map();
  for (const o of offsets) { const p = perTopic.get(o.roKey); if (!p || relRank[o.relation] < relRank[p.relation] || (o.relation === p.relation && Math.abs(o.diff) < Math.abs(p.diff))) perTopic.set(o.roKey, o); }
  const topicOffsets = [...perTopic.values()];
  const byBase = xs => Object.fromEntries(Object.keys(BASES).map(k => [k, median(xs.map(o => o.byBase[k]))]));
  const offsetBySubject = roSubjects.map(s => {
    const xs = topicOffsets.filter(o => o.roSubject === s);
    return { subject: s, n: xs.length, medianDiff: median(xs.map(o => o.diff)), meanDiff: mean(xs.map(o => o.diff)), later: xs.filter(o => o.diff > 0).length, same: xs.filter(o => o.diff === 0).length, earlier: xs.filter(o => o.diff < 0).length, byBase: byBase(xs) };
  }).filter(r => r.n).sort((a, b) => b.n - a.n);
  const offsetByDomain = [];
  for (const s of roSubjects) for (const d of new Set(ro.filter(t => t.subject === s).map(t => t.domain))) {
    const xs = topicOffsets.filter(o => o.roSubject === s && o.roDomain === d);
    if (xs.length >= 3) offsetByDomain.push({ subject: s, domain: d, n: xs.length, medianDiff: median(xs.map(o => o.diff)), byBase: byBase(xs) });
  }
  offsetByDomain.sort((a, b) => b.medianDiff - a.medianDiff);
  const overall = Object.fromEntries(Object.keys(BASES).map(k => { const v = topicOffsets.map(o => o.byBase[k]); return [k, { n: v.length, median: median(v), mean: mean(v) }]; }));
  const offsetByStage = OFFSET_STAGES.map(([stage, g0, g1]) => {
    const xs = topicOffsets.filter(o => o.grade >= g0 && o.grade <= g1);
    return { stage, range: `${g0}-${g1}`, n: xs.length, medianDiff: median(xs.map(o => o.diff)), byBase: Object.fromEntries(Object.keys(BASES).map(k => [k, { n: xs.length, median: median(xs.map(o => o.byBase[k])) }])) };
  }).filter(r => r.n);
  const exactOnly = topicOffsets.filter(o => o.relation === 'exact');
  const exactSummary = { n: exactOnly.length, median: median(exactOnly.map(o => o.diff)), bySubject: Object.fromEntries(roSubjects.map(s => { const v = exactOnly.filter(o => o.roSubject === s).map(o => o.diff); return [s, { n: v.length, median: median(v) }]; }).filter(([, x]) => x.n)) };

  // prerequisite agreement: Romanian edge a <- b with a, b mapped onto German topics A, B (A != B): is B an ancestor of A in the German graph?
  const deAnc = new Map();
  const ancestors = id => {
    if (deAnc.has(id)) return deAnc.get(id);
    const seen = new Set(), stack = [...(deG.pre.get(id) || [])];
    while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n); for (const m of deG.pre.get(n) || []) stack.push(m); }
    deAnc.set(id, seen); return seen;
  };
  const covMap = new Map(); for (const [id, ls] of linksByRo) covMap.set(id, ls.filter(l => COVER.has(l.relation)).map(l => deByKey.get(l.deKey).id));
  const agree = { pairs: 0, same: 0, agree: 0, reversed: 0, unrelated: 0, examplesReversed: [] };
  for (const e of roDeps) {
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
    if (best === 'reversed' && agree.examplesReversed.length < 12) agree.examplesReversed.push({ topic: roById.get(e.topicId).name, prerequisite: roById.get(e.prerequisiteId).name, strength: e.strength });
  }

  const romanianOnly = ro.filter(t => bestRel(t.id) === 'none').map(t => ({ key: t.key, name: t.name, nameRo: t.nameRo, subject: t.subject, domain: t.domain, grade: t.gradeStart, romaniaSpecific: t.romaniaSpecific }));
  const laterExamples = topicOffsets.filter(o => o.diff >= 2).sort((a, b) => b.diff - a.diff).slice(0, 25);
  const earlierExamples = topicOffsets.filter(o => o.diff <= -2).sort((a, b) => a.diff - b.diff).slice(0, 25);
  const deUnmatchedDomains = deCoverage.flatMap(s => s.domains.filter(d => d.covered === 0).map(d => ({ subject: s.subject, ...d })));
  const stdCount = cs => cs.reduce((a, c) => a + c.topicCount, 0);
  const side = (ts, deps, g, std, specific) => ({ topics: ts.length, subjects: new Set(ts.map(t => t.subject)).size, domains: new Set(ts.map(t => `${t.subject}|${t.domain}`)).size, edges: deps.length, hardShare: g.hardShare, edgesPerTopic: g.edgesPerTopic, roots: g.roots, maxDepth: g.maxDepth, meanDepth: g.meanDepth, crossSubjectEdgeShare: crossShare(ts, deps), curricula: std.length, standards: stdCount(std), topicsWithStandards: pct(ts.filter(t => t.standards.length).length, ts.length), ageMin: Math.min(...ts.map(t => t.ageRangeStart)), ageMax: Math.max(...ts.map(t => t.ageRangeEnd)), meanAgeSpan: mean(ts.map(t => t.ageRangeEnd - t.ageRangeStart)), types: count(ts, t => t.type), countrySpecific: ts.filter(specific).length });
  const structure = { ro: side(ro, roDeps, roG, roStd, t => t.romaniaSpecific), de: side(de, deDeps, deG, deStd, t => t.germanSpecific) };
  const tot = roCoverage.reduce((a, r) => ({ t: a.t + r.topics, s: a.s + r.strong, p: a.p + r.partial, r: a.r + r.related, n: a.n + r.none, x: a.x + r.romaniaSpecific }), { t: 0, s: 0, p: 0, r: 0, n: 0, x: 0 });
  return {
    result: { structure, relationCounts: count(cw, l => l.relation), roCoverage, roByStage, matrix, deCoverage, deByStage, offsets: { exactOnly: exactSummary, byStage: offsetByStage, bySubject: offsetBySubject, byDomain: offsetByDomain, overall, pairs: topicOffsets.map(o => [o.roKey, o.deKey]), n: topicOffsets.length, median: median(topicOffsets.map(o => o.diff)), laterExamples, earlierExamples }, prerequisiteAgreement: agree, romanianOnly, deUnmatchedDomains },
    linksByRo, deCovered, topicOffsets, tot,
  };
}

const roCore = new Set(roAll.filter(t => RO_TIER[t.subject] === 'core').map(t => t.id)), deCore = new Set(deAll.filter(t => DE_TIER[t.subject] === 'core').map(t => t.id));
const deCoreKeys = new Set(deAll.filter(t => deCore.has(t.id)).map(t => t.key));
const A = analyze(roAll, roDepsAll, deAll, deDepsAll, cwAll);
const CORE = analyze(roAll.filter(t => roCore.has(t.id)), roDepsAll.filter(e => roCore.has(e.topicId) && roCore.has(e.prerequisiteId)),
  deAll.filter(t => deCore.has(t.id)), deDepsAll.filter(e => deCore.has(e.topicId) && deCore.has(e.prerequisiteId)), cwAll.filter(l => roCore.has(l.roId) && deCoreKeys.has(l.deKey)));
const R = A.result;
const result = { generatedAt: new Date().toISOString().slice(0, 10), bases: BASES, ...R, variants: { all: R, core: CORE.result } };

// explorer payload: Romanian topics (with their German links) and German topics (with their coverage); names and
// texts as maps { en, de, ro } so the page can switch language
const M = (en, de, ro) => Object.fromEntries(Object.entries({ en, de, ro }).filter(([, v]) => v != null && v !== ''));
const roSubjects = J(join(root, 'data/subjects.json')).subjects, deSubjects = J(join(deRoot, 'data/subjects.json')).subjects;
const explorer = {
  ro: roAll.map(t => ({ id: t.id, k: t.key, s: t.subject, tr: RO_TIER[t.subject], d: t.domain, N: M(t.name, t.nameDe, t.nameRo), DS: M(t.description, t.descriptionDe, t.descriptionRo), EV: M(t.evidence, t.evidenceDe, t.evidenceRo), LN: t.notes ? M(t.notes, t.notesDe, t.notesRo) : null, g: [t.gradeStart, t.gradeEnd], a: [t.ageRangeStart, t.ageRangeEnd], cl: t.profiles || null, ty: t.type, gs: t.romaniaSpecific, st: t.standards, m: (A.linksByRo.get(t.id) || []).map(l => [l.deKey, l.relation, l.note ? M(l.note, l.noteDe, l.noteRo) : null]) })),
  de: deAll.map(t => ({ k: t.key, s: t.subject, tr: DE_TIER[t.subject], d: t.domain, N: M(t.name, t.nameDe, t.nameRo), DS: M(t.description, t.descriptionDe, t.descriptionRo), g: [t.gradeStart, t.gradeEnd], a: [t.ageRangeStart, t.ageRangeEnd], g8: t.gradeStart >= 7 ? deAgeIn(t, 'G8') : null, c: A.deCovered.get(t.key) || null, cc: CORE.deCovered.get(t.key) || null })),
  roEdges: roDepsAll.map(e => [e.topicId, e.prerequisiteId, e.strength === 'hard' ? 1 : 0]),
  names: {
    roSubj: Object.fromEntries(roSubjects.map(s => [s.name, M(s.nameEn, s.nameDe, s.name)])),
    roDom: Object.fromEntries(roSubjects.flatMap(s => s.domains.map(d => [s.name + '|' + d.name, M(d.nameEn, d.nameDe, d.name)]))),
    deSubj: Object.fromEntries(deSubjects.map(s => [s.name, M(s.nameEn, s.name, s.nameRo)])),
    deDom: Object.fromEntries(deSubjects.flatMap(s => s.domains.map(d => [s.name + '|' + d.name, M(d.nameEn, d.name, d.nameRo)]))),
  },
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'comparison.json'), JSON.stringify(result, null, 1) + '\n');
writeFileSync(join(outDir, 'explorer-data.json'), JSON.stringify(explorer) + '\n');

// ---------- markdown tables ----------
const L = [];
const row = cells => L.push(`| ${cells.join(' | ')} |`);
const sg = v => v == null ? '–' : v > 0 ? `+${v}` : `${v}`;
const S = R.structure, O = R.offsets, tot = A.tot;
L.push('# Generated comparison tables: Romanian vs German taxonomy', '', `_Generated ${result.generatedAt} by \`ro-taxonomy/scripts/compare.mjs\`. Do not edit by hand._`, '');
L.push('## Structure', ''); row(['Metric', 'Romanian taxonomy', 'German taxonomy']); row(['---', '---:', '---:']);
for (const [k, label] of [['topics', 'Topics'], ['subjects', 'Subjects'], ['domains', 'Domains'], ['edges', 'Prerequisite edges'], ['hardShare', 'Hard edges %'], ['edgesPerTopic', 'Edges per topic'], ['roots', 'Root topics (no prerequisites)'], ['maxDepth', 'Max prerequisite depth'], ['meanDepth', 'Mean depth'], ['crossSubjectEdgeShare', 'Cross-subject edges %'], ['curricula', 'Curriculum sources'], ['standards', 'Standards in catalogue'], ['topicsWithStandards', 'Topics linked to ≥1 standard %'], ['ageMin', 'Youngest age'], ['ageMax', 'Oldest age'], ['meanAgeSpan', 'Mean age span (years)'], ['countrySpecific', 'Country-specific topics']])
  row([label, S.ro[k], S.de[k]]);
L.push('', '## Romanian topics: how well does the German taxonomy cover them?', '', 'strong = exact/close match; partial = German topic broader/narrower; related = adjacent only; none = no counterpart.', '');
row(['Romanian subject', 'Topics', 'Strong', 'Partial', 'Related only', 'None', 'Strong+partial %', 'Romania-specific']); row(['---', '---:', '---:', '---:', '---:', '---:', '---:', '---:']);
for (const r of R.roCoverage) row([r.subject, r.topics, r.strong, r.partial, r.related, r.none, pct(r.strong + r.partial, r.topics), r.romaniaSpecific]);
row(['**All**', tot.t, tot.s, tot.p, tot.r, tot.n, pct(tot.s + tot.p, tot.t), tot.x]);
row(['**Core subjects only**', CORE.tot.t, CORE.tot.s, CORE.tot.p, CORE.tot.r, CORE.tot.n, pct(CORE.tot.s + CORE.tot.p, CORE.tot.t), CORE.tot.x]);
L.push('', '### By school stage', '');
row(['Stage', 'Topics', 'Strong', 'Partial', 'Related only', 'None', 'Strong+partial %']); row(['---', '---:', '---:', '---:', '---:', '---:', '---:']);
for (const r of R.roByStage) row([r.stage, r.topics, r.strong, r.partial, r.related, r.none, pct(r.strong + r.partial, r.topics)]);
L.push('', '## Where Romanian subjects land in the German taxonomy (coverage links)', '');
const usedDe = [...new Set(Object.values(R.matrix).flatMap(m => Object.keys(m)))].sort();
row(['Romanian subject ↓ / German subject →', ...usedDe]); row(['---', ...usedDe.map(() => '---:')]);
for (const r of R.roCoverage.map(x => x.subject)) row([r, ...usedDe.map(s => R.matrix[r]?.[s] || '·')]);
L.push('', '## German topics: how many have a Romanian counterpart?', '');
row(['German subject', 'Topics', 'Covered (strong/partial)', '%', 'Related only', 'Least-covered domains']); row(['---', '---:', '---:', '---:', '---:', '---']);
for (const r of R.deCoverage) row([r.subject, r.topics, r.covered, r.pct, r.relatedOnly, r.domains.slice(0, 4).map(d => `${d.domain} ${d.covered}/${d.topics}`).join('; ')]);
L.push('', '### By German school stage', ''); row(['Stage', 'Topics', 'Covered', '%']); row(['---', '---:', '---:', '---:']);
for (const r of R.deByStage) row([r.stage, r.topics, r.covered, r.pct]);
L.push('', '## Age offset: when Romanian children meet the same idea (strong matches)', '', `Positive = later in Romania. Romanian age = grade + 6 (clasa pregătitoare = 0 at age 6); German age = Klasse + 5 (G9 numbering). The G8 column moves German topics from Klasse 7 one year earlier. n = ${O.n} Romanian topics with a strong match; overall median ${sg(O.median)} years.`, '');
row(['Romanian subject', 'n', 'Median Δ', 'Later', 'Same', 'Earlier', 'Median Δ vs G8 Länder']); row(['---', '---:', '---:', '---:', '---:', '---:', '---:']);
for (const r of O.bySubject) row([r.subject, r.n, sg(r.medianDiff), r.later, r.same, r.earlier, sg(r.byBase.G8)]);
row(['**All**', O.n, sg(O.median), A.topicOffsets.filter(o => o.diff > 0).length, A.topicOffsets.filter(o => o.diff === 0).length, A.topicOffsets.filter(o => o.diff < 0).length, sg(O.overall.G8.median)]);
L.push('', `**Robustness — exact matches only** (n = ${O.exactOnly.n}): median Δ ${sg(O.exactOnly.median)}. By subject: ` + Object.entries(O.exactOnly.bySubject).map(([k, v]) => `${k} ${sg(v.median)} (n=${v.n})`).join(', ') + '.');
L.push('', '### By Romanian school stage', ''); row(['Stage', 'n', 'Median Δ', 'Median Δ vs G8 Länder']); row(['---', '---:', '---:', '---:']);
for (const r of O.byStage) row([r.stage, r.n, sg(r.medianDiff), sg(r.byBase.G8.median)]);
L.push('', '### Domains with the largest offsets (≥3 strong matches)', ''); row(['Subject › domain', 'n', 'Median Δ']); row(['---', '---:', '---:']);
for (const r of [...O.byDomain.slice(0, 12), ...O.byDomain.slice(-8)]) row([`${r.subject} › ${r.domain}`, r.n, sg(r.medianDiff)]);
L.push('', '### Examples: taught ≥2 years later in Romania', ''); row(['Romanian topic', 'Clasa', 'German topic', 'Klasse', 'Δ']); row(['---', '---:', '---', '---:', '---:']);
for (const o of O.laterExamples.slice(0, 15)) row([`${o.roNameRo} (${o.roSubject})`, o.grade, o.deNameDe, o.deGrade, sg(o.diff)]);
L.push('', '### Examples: taught ≥2 years earlier in Romania', ''); row(['Romanian topic', 'Clasa', 'German topic', 'Klasse', 'Δ']); row(['---', '---:', '---', '---:', '---:']);
for (const o of O.earlierExamples.slice(0, 15)) row([`${o.roNameRo} (${o.roSubject})`, o.grade, o.deNameDe, o.deGrade, sg(o.diff)]);
const ag = R.prerequisiteAgreement;
L.push('', '## Do the two graphs agree on prerequisite order?', '', `Romanian prerequisite edges whose two ends both map onto German topics: **${ag.pairs}**. A German path prerequisite → topic exists (agree): **${ag.agree}** (${pct(ag.agree, ag.pairs)}%); reversed: **${ag.reversed}**; both ends map to the same German topic: ${ag.same}; no path either way: ${ag.unrelated}.`, '');
if (ag.examplesReversed.length) { L.push('Reversed examples (Romanian order is opposite to the German graph):', ''); for (const x of ag.examplesReversed) L.push(`- *${x.topic}* ⇐ ${x.strength} *${x.prerequisite}*`); }
L.push('', '## German domains with no Romanian counterpart', '');
for (const d of R.deUnmatchedDomains) L.push(`- ${d.subject} › ${d.domain} (${d.topics} topics)`);
L.push('', '## Romanian topics with no German counterpart, by subject', '');
for (const s of R.roCoverage.map(r => r.subject)) { const xs = R.romanianOnly.filter(t => t.subject === s); if (xs.length) L.push(`- **${s}** (${xs.length}): ${xs.slice(0, 18).map(t => t.nameRo).join(', ')}${xs.length > 18 ? ', …' : ''}`); }
L.push('', '## Crosswalk relation counts', '', Object.entries(R.relationCounts).map(([k, v]) => `${k}: ${v}`).join(' · '), '');
L.push('## Topic types', ''); row(['Type', 'Romanian %', 'German %']); row(['---', '---:', '---:']);
for (const ty of ['CONCEPTUAL', 'PROCEDURAL', 'REPRESENTATIONAL', 'LANGUAGE', 'META']) row([ty, pct(S.ro.types[ty] || 0, S.ro.topics), pct(S.de.types[ty] || 0, S.de.topics)]);
writeFileSync(join(outDir, 'generated-tables.md'), L.join('\n') + '\n');
console.log(`comparison written: ${O.n} age-offset topics (median ${sg(O.median)}), ${ag.pairs} edge pairs, ro coverage strong+partial ${pct(tot.s + tot.p, tot.t)}%, German topics covered ${pct(R.deCoverage.reduce((a, r) => a + r.covered, 0), deAll.length)}%`);
