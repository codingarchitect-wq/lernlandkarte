#!/usr/bin/env node
// Validate the built Romanian taxonomy in data/: schemas, references, DAG, grade order, crosswalk to the German taxonomy, checksums.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const errors = [];
const E = m => errors.push(m);

// --- minimal JSON-Schema subset validator (the keywords our schemas use) ---
function check(schema, v, path) {
  if (schema.enum && !schema.enum.includes(v)) return E(`${path}: ${JSON.stringify(v)} not in enum`);
  if (schema.type) {
    const types = [].concat(schema.type);
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
    if (!types.includes(t) && !(t === 'integer' && types.includes('number'))) return E(`${path}: expected ${types} got ${t}`);
  }
  if (typeof v === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(v)) E(`${path}: "${v.slice(0, 40)}" !~ ${schema.pattern}`);
    if (schema.minLength && v.length < schema.minLength) E(`${path}: shorter than ${schema.minLength}`);
  }
  if (typeof v === 'number') {
    if (schema.minimum !== undefined && v < schema.minimum) E(`${path}: < ${schema.minimum}`);
    if (schema.maximum !== undefined && v > schema.maximum) E(`${path}: > ${schema.maximum}`);
  }
  if (Array.isArray(v)) {
    if (schema.minItems !== undefined && v.length < schema.minItems) E(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && v.length > schema.maxItems) E(`${path}: more than ${schema.maxItems} items`);
    if (schema.items) v.forEach((x, i) => check(schema.items, x, `${path}[${i}]`));
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const r of schema.required || []) if (!(r in v)) E(`${path}: missing ${r}`);
    if (schema.additionalProperties === false && schema.properties) for (const k of Object.keys(v)) if (!(k in schema.properties)) E(`${path}: unexpected property ${k}`);
    for (const [k, s] of Object.entries(schema.properties || {})) if (k in v) check(s, v[k], `${path}.${k}`);
  }
}
const pairs = [['topics.json', 'topics'], ['dependencies.json', 'dependencies'], ['curriculum-standards.json', 'curriculum-standards'], ['clusters.json', 'clusters'], ['crosswalk-de-taxonomy.json', 'crosswalk']];
const data = {};
for (const [file, schema] of pairs) {
  data[file] = JSON.parse(read(`data/${file}`));
  check(JSON.parse(read(`schema/${schema}.schema.json`)), data[file], file);
}
const topics = data['topics.json'].topics;
const deps = data['dependencies.json'].dependencies;
const byId = new Map(topics.map(t => [t.id, t]));

// --- integrity ---
if (byId.size !== topics.length) E('duplicate topic ids');
if (new Set(topics.map(t => t.key)).size !== topics.length) E('duplicate topic keys');
if (data['topics.json'].topicCount !== topics.length) E('topicCount mismatch');
if (data['dependencies.json'].edgeCount !== deps.length) E('edgeCount mismatch');
const stdKeys = new Set(data['curriculum-standards.json'].curricula.flatMap(c => c.topics.map(s => s.key)));
for (const t of topics) {
  if (t.ageRangeStart !== t.gradeStart + 6 || t.ageRangeEnd !== t.gradeEnd + 7) E(`${t.key}: ages not derived from grades`);
  if (t.gradeStart > t.gradeEnd) E(`${t.key}: gradeStart > gradeEnd`);
  if ((t.gradeStart >= 9) !== (Array.isArray(t.profiles) && t.profiles.length > 0)) E(`${t.key}: profiles must be set exactly for topics starting in clasa IX–XII`);
  for (const s of t.standards) if (!stdKeys.has(s)) E(`${t.key}: unknown standard ${s}`);
}
const seenEdge = new Set();
for (const d of deps) {
  const a = byId.get(d.topicId), b = byId.get(d.prerequisiteId);
  if (!a || !b) { E(`dangling edge ${d.topicId} <- ${d.prerequisiteId}`); continue; }
  if (a === b) E(`self edge ${a.key}`);
  const k = `${d.topicId}>${d.prerequisiteId}`; if (seenEdge.has(k)) E(`duplicate edge ${a.key} <- ${b.key}`); seenEdge.add(k);
  if (b.gradeStart > a.gradeStart) E(`grade order: ${a.key} (clasa ${a.gradeStart}) <- ${b.key} (clasa ${b.gradeStart})`);
}
// cycle check (iterative DFS)
const pre = new Map(); for (const d of deps) { if (!pre.has(d.topicId)) pre.set(d.topicId, []); pre.get(d.topicId).push(d.prerequisiteId); }
const color = new Map();
for (const t of topics) {
  if (color.get(t.id)) continue;
  const stack = [[t.id, 0]];
  while (stack.length) {
    const top = stack[stack.length - 1]; const [n, i] = top;
    if (i === 0) color.set(n, 1);
    const ps = pre.get(n) || [];
    if (i < ps.length) { top[1]++; const m = ps[i]; if (color.get(m) === 1) { E(`cycle through ${byId.get(m).key}`); } else if (!color.get(m)) stack.push([m, 0]); }
    else { color.set(n, 2); stack.pop(); }
  }
}
// clusters refer to existing subject/domain
const sd = new Set(topics.map(t => `${t.subject}|${t.domain}`));
for (const c of data['clusters.json'].clusters) if (!sd.has(`${c.subject}|${c.domain}`)) E(`cluster for unknown ${c.subject}|${c.domain}`);
// crosswalk refers to existing topics in both taxonomies
const deByKey = new Map(JSON.parse(readFileSync(resolve(root, '../de-taxonomy/data/topics.json'), 'utf8')).topics.map(t => [t.key, t.id]));
for (const l of data['crosswalk-de-taxonomy.json'].links) {
  if (!byId.has(l.roId)) E(`crosswalk: unknown ro id ${l.roId}`);
  if (deByKey.get(l.deKey) !== l.deId) E(`crosswalk: German key ${l.deKey} / id ${l.deId} not found`);
}
// checksums
const manifest = JSON.parse(read('data/manifest.json'));
for (const [f, m] of Object.entries(manifest.files)) {
  const buf = readFileSync(join(root, 'data', f));
  if (createHash('sha256').update(buf).digest('hex') !== m.sha256 || buf.length !== m.bytes) E(`checksum mismatch: ${f}`);
}
if (manifest.counts.topics !== topics.length || manifest.counts.dependencies !== deps.length) E('manifest counts stale');

if (errors.length) {
  console.error(`✗ ${errors.length} errors`); for (const e of errors.slice(0, 50)) console.error('  ' + e); process.exit(1);
}
console.log(`✓ valid — ${topics.length} topics, ${deps.length} dependencies, ${stdKeys.size} standards, ${data['clusters.json'].clusterCount} clusters, ${data['crosswalk-de-taxonomy.json'].count} links to the German taxonomy. Schemas + referential integrity + DAG + grade order + checksums OK.`);
