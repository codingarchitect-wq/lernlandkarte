#!/usr/bin/env node
// Build the self-contained German taxonomy browser (de-taxonomy/index.html) from data/*.json.
// os-taxonomy topic names are added to the crosswalk links when ../os-taxonomy is present.
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

const index = new Map(topics.topics.map((t, i) => [t.id, i]));
const matches = new Map();
for (const l of links) {
  const o = osById.get(l.osId);
  if (!matches.has(l.deId)) matches.set(l.deId, []);
  matches.get(l.deId).push([l.osId, l.relation, l.note, o?.name ?? l.osId, o?.subject ?? '', o?.domain ?? '', o?.ageRangeStart ?? null]);
}

const payload = {
  version: topics.version,
  generatedAt: new Date().toISOString().slice(0, 10),
  subjects,
  topics: topics.topics.map(t => ({
    id: t.id, k: t.key, ty: t.type, s: t.subject, d: t.domain, n: t.name, nd: t.nameDe, ds: t.description,
    g: [t.gradeStart, t.gradeEnd], a: [t.ageRangeStart, t.ageRangeEnd], sg: t.stage, ev: t.evidence,
    ap: t.assessmentPrompt, std: t.standards, x: t.germanSpecific, ln: t.laenderNotes, cl: t.courseLevel || null, m: matches.get(t.id) || [],
  })),
  // [dependent index, prerequisite index, hard?1:0, reason, cross-subject?1:0]
  edges: deps.map(e => [index.get(e.topicId), index.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0, e.reason, e.origin === 'authored' ? 0 : 1]),
  clusters: clusters.map(c => [c.subject, c.domain, c.gradeStart, c.summary, c.summaryDe]),
  sources: curricula.map(c => ({
    slug: c.slug, name: c.name, region: c.region || '', version: c.version, level: c.level, url: c.sourceUrl, notes: c.notes,
    codes: c.topics.map(x => [x.code, x.data.titleDe, x.data.titleEn, x.data.area, x.data.grades]),
  })),
};

// Escape "<" so embedded JSON can never close the <script> element.
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
const html = readFileSync(join(root, 'scripts/browser-template.html'), 'utf8').replace('__DATA__', () => json);
writeFileSync(join(root, 'index.html'), html);
console.log(`browser written: ${join(root, 'index.html')} (${Math.round(html.length / 1024)} KB)`);
