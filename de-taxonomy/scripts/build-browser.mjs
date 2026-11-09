#!/usr/bin/env node
// Build the self-contained German taxonomy browser (de-taxonomy/index.html) from data/*.json.
// os-taxonomy topic names are added to the crosswalk links when ../os-taxonomy is present.
// The template is shared with the Romanian taxonomy (cfg.country) and shows every page in English, German or
// Romanian: names and texts are sent as maps { en, de, ro } (languages without a translation are left out).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
const links = data('crosswalk-os-taxonomy.json').links;
const osFile = resolve(root, '../os-taxonomy/data/topics.json');
const osById = new Map(existsSync(osFile) ? J(osFile).topics.map(t => [t.id, t]) : []);
const M = (en, de, ro) => Object.fromEntries(Object.entries({ en, de, ro }).filter(([, v]) => v != null && v !== ''));

const index = new Map(topics.topics.map((t, i) => [t.id, i]));
const matches = new Map();
for (const l of links) {
  const o = osById.get(l.osId);
  if (!matches.has(l.deId)) matches.set(l.deId, []);
  matches.get(l.deId).push([l.osId, l.relation, M(l.note, l.noteDe, l.noteRo), o?.name ?? l.osId, o?.subject ?? '', o?.domain ?? '', o?.ageRangeStart ?? null]);
}

const payload = {
  cfg: { country: 'de', native: 'de' },
  version: topics.version,
  generatedAt: new Date().toISOString().slice(0, 10),
  subjects: subjects.map(s => ({
    name: s.name, tier: s.tier, grades: s.grades, names: M(s.nameEn, s.name, s.nameRo), descs: M(s.description, s.descriptionDe, s.descriptionRo),
    domains: s.domains.map(d => ({ name: d.name, names: M(d.nameEn, d.name, d.nameRo), basis: M(d.basis, d.basisDe, d.basisRo) })),
  })),
  topics: topics.topics.map(t => ({
    id: t.id, k: t.key, ty: t.type, s: t.subject, d: t.domain, g: [t.gradeStart, t.gradeEnd], a: [t.ageRangeStart, t.ageRangeEnd], sg: t.stage,
    N: M(t.name, t.nameDe, t.nameRo), DS: M(t.description, t.descriptionDe, t.descriptionRo), EV: M(t.evidence, t.evidenceDe, t.evidenceRo),
    AP: M(t.assessmentPrompt, t.assessmentPromptDe, t.assessmentPromptRo), LN: t.laenderNotes ? M(t.laenderNotes, t.laenderNotesDe, t.laenderNotesRo) : null,
    std: t.standards, x: t.germanSpecific, cl: t.courseLevel || null, m: matches.get(t.id) || [],
  })),
  // [dependent index, prerequisite index, hard?1:0, reason { en, de, ro }, cross-subject?1:0]
  edges: deps.map(e => [index.get(e.topicId), index.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0, M(e.reason, e.reasonDe, e.reasonRo), e.origin === 'authored' ? 0 : 1]),
  clusters: clusters.map(c => [c.subject, c.domain, c.gradeStart, M(c.summary, c.summaryDe, c.summaryRo)]),
  sources: curricula.map(c => ({
    slug: c.slug, name: c.name, region: c.region || '', version: c.version, level: c.level, url: c.sourceUrl, notes: M(c.notes, c.notesDe, c.notesRo),
    codes: c.topics.map(x => [x.code, M(x.data.titleEn, x.data.titleDe, x.data.titleRo), x.data.area, x.data.grades]),
  })),
};

// Escape "<" so embedded JSON can never close the <script> element.
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
const html = readFileSync(join(root, 'scripts/browser-template.html'), 'utf8').replace('__DATA__', () => json);
writeFileSync(join(root, 'index.html'), html);
console.log(`browser written: ${join(root, 'index.html')} (${Math.round(html.length / 1024)} KB)`);
