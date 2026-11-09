#!/usr/bin/env node
// Build the self-contained Romanian taxonomy browser (ro-taxonomy/index.html) from data/*.json.
// German counterparts are named from ../de-taxonomy/data. The page uses the German taxonomy's browser template
// (../de-taxonomy/scripts/browser-template.html), which serves both countries (cfg.country) and shows every page in
// English, German or Romanian: names and texts are sent as maps { en, de, ro }.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const data = f => J(join(root, 'data', f));
const topics = data('topics.json');
const deps = data('dependencies.json').dependencies;
const subjects = data('subjects.json').subjects;
const clusters = data('clusters.json').clusters;
const curricula = data('curriculum-standards.json').curricula;
const links = data('crosswalk-de-taxonomy.json').links;
const deData = resolve(root, '../de-taxonomy/data');
const deByKey = new Map(J(join(deData, 'topics.json')).topics.map(t => [t.key, t]));
const deSubj = new Map(J(join(deData, 'subjects.json')).subjects.map(s => [s.name, s]));
const M = (en, de, ro) => Object.fromEntries(Object.entries({ en, de, ro }).filter(([, v]) => v != null && v !== ''));

const index = new Map(topics.topics.map((t, i) => [t.id, i]));
const matches = new Map();
for (const l of links) {
  const d = deByKey.get(l.deKey), ds = deSubj.get(d?.subject), dd = ds?.domains.find(x => x.name === d?.domain);
  if (!matches.has(l.roId)) matches.set(l.roId, []);
  matches.get(l.roId).push([l.deKey, l.relation, M(l.note, l.noteDe, l.noteRo), M(d?.name ?? l.deKey, d?.nameDe, d?.nameRo), M(ds?.nameEn, d?.subject, ds?.nameRo), M(dd?.nameEn, d?.domain, dd?.nameRo), d?.ageRangeStart ?? null, d?.gradeStart ?? null]);
}
// first grade a source is used in, to order the sources table by school stage
const firstGrade = new Map();
for (const t of topics.topics) for (const s of t.standards) { const slug = s.split(':')[0]; firstGrade.set(slug, Math.min(firstGrade.get(slug) ?? 99, t.gradeStart)); }

const payload = {
  cfg: { country: 'ro', native: 'ro' },
  version: topics.version,
  generatedAt: new Date().toISOString().slice(0, 10),
  subjects: subjects.map(s => ({
    name: s.name, tier: s.tier, grades: s.grades, names: M(s.nameEn, s.nameDe, s.name), descs: M(s.description, s.descriptionDe, s.descriptionRo),
    domains: s.domains.map(d => ({ name: d.name, names: M(d.nameEn, d.nameDe, d.name), basis: M(d.basis, d.basisDe, d.basisRo) })),
  })),
  topics: topics.topics.map(t => ({
    id: t.id, k: t.key, ty: t.type, s: t.subject, d: t.domain, g: [t.gradeStart, t.gradeEnd], a: [t.ageRangeStart, t.ageRangeEnd], sg: t.stage,
    N: M(t.name, t.nameDe, t.nameRo), DS: M(t.description, t.descriptionDe, t.descriptionRo), EV: M(t.evidence, t.evidenceDe, t.evidenceRo),
    AP: M(t.assessmentPrompt, t.assessmentPromptDe, t.assessmentPromptRo), LN: t.notes ? M(t.notes, t.notesDe, t.notesRo) : null,
    std: t.standards, x: t.romaniaSpecific, cl: t.profiles || null, m: matches.get(t.id) || [],
  })),
  // [dependent index, prerequisite index, hard?1:0, reason { en, de, ro }, cross-subject?1:0]
  edges: deps.map(e => [index.get(e.topicId), index.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0, M(e.reason, e.reasonDe, e.reasonRo), e.origin === 'authored' ? 0 : 1]),
  clusters: clusters.map(c => [c.subject, c.domain, c.gradeStart, M(c.summary, c.summaryDe, c.summaryRo)]),
  sources: curricula.map(c => ({
    slug: c.slug, name: c.name, region: '', version: c.version, level: c.level, url: c.sourceUrl, notes: M(c.notes, c.notesDe, c.notesRo), first: firstGrade.get(c.slug) ?? 99,
    codes: c.topics.map(x => [x.code, M(x.data.titleEn, x.data.titleDe, x.data.titleRo), x.data.area, x.data.grades]),
  })),
};

// Escape "<" so embedded JSON can never close the <script> element.
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
const html = readFileSync(resolve(root, '../de-taxonomy/scripts/browser-template.html'), 'utf8').replace('__DATA__', () => json);
writeFileSync(join(root, 'index.html'), html);
console.log(`browser written: ${join(root, 'index.html')} (${Math.round(html.length / 1024)} KB)`);
