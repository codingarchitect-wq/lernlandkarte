#!/usr/bin/env node
// Build de-taxonomy/graph.html: a rotating 3D map of every topic and prerequisite link.
// Same technique as the os-taxonomy preview (media/curriculum-viz.*): height is the age a
// topic starts, the cloud widens with age into a funnel, prerequisites are threads.
// Positions are computed here (deterministic force layout); the page only projects and draws.
// If ../os-taxonomy is present, its graph is laid out the same way so the two can be compared.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const J = p => JSON.parse(readFileSync(p, 'utf8'));

// Eight colour families shared by both datasets (validated dark categorical palette).
const FAMILIES = [
  { key: 'math', color: '#3987e5', de: 'Mathematik', os: 'Mathematics' },
  { key: 'lang', color: '#d95926', de: 'Deutsch', os: 'English' },
  { key: 'su', color: '#199e70', de: 'Sachunterricht', os: '' },
  { key: 'soc', color: '#c98500', de: 'Geschichte · Erdkunde · Politik und Wirtschaft', os: 'History · Geography' },
  { key: 'arts', color: '#d55181', de: 'Musik · Kunst · Sport · Religion & Ethik', os: 'Personal & Social Development · Life Skills · Learning to Learn' },
  { key: 'sci', color: '#008300', de: 'Naturwissenschaften · Biologie · Chemie · Physik', os: 'Science' },
  { key: 'comp', color: '#9085e9', de: 'Informatik & Medienbildung', os: 'Computing' },
  { key: 'en', color: '#e66767', de: 'Englisch · Französisch · Latein', os: '' },
];
const FAM_OF = {
  Mathematik: 'math', Deutsch: 'lang', Sachunterricht: 'su', Geschichte: 'soc', Erdkunde: 'soc', 'Politik und Wirtschaft': 'soc',
  Musik: 'arts', Kunst: 'arts', Sport: 'arts', 'Religion & Ethik': 'arts', Naturwissenschaften: 'sci', Biologie: 'sci', Chemie: 'sci', Physik: 'sci',
  'Informatik & Medienbildung': 'comp', Englisch: 'en', Französisch: 'en', Latein: 'en',
  Mathematics: 'math', English: 'lang', History: 'soc', Geography: 'soc', 'Personal & Social Development': 'arts', 'Life Skills': 'arts',
  'Learning to Learn': 'arts', Science: 'sci', Computing: 'comp',
};
const famIndex = s => { const k = FAM_OF[s]; const i = FAMILIES.findIndex(f => f.key === k); if (i < 0) throw new Error('No colour family for subject ' + s); return i; };

// ---------- layout ----------
const AGE0 = 4, STEP = 150;                 // height: one school year = 150 units, age 4 at the bottom
const coneR = y => 95 + 0.27 * y;           // funnel radius at height y
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function layout(nodes, edges, seed) {
  const N = nodes.length, rnd = mulberry32(seed);
  const pre = Array.from({ length: N }, () => []);
  for (const [c, p] of edges) pre[c].push(p);
  // depth of the prerequisite chain within the same start age, used to spread a band vertically
  const ld = new Array(N).fill(-1);
  const local = i => { if (ld[i] >= 0) return ld[i]; ld[i] = 0; let m = 0; for (const p of pre[i]) if (nodes[p].age === nodes[i].age) m = Math.max(m, local(p) + 1); return (ld[i] = m); };
  for (let i = 0; i < N; i++) local(i);
  const maxLd = {}; nodes.forEach((n, i) => { maxLd[n.age] = Math.max(maxLd[n.age] || 0, ld[i]); });
  const ty = nodes.map((n, i) => (n.age - AGE0) * STEP + (maxLd[n.age] ? ld[i] / maxLd[n.age] : rnd()) * STEP * 0.8 + (rnd() - 0.5) * STEP * 0.55);
  // start each domain around its own angle so related topics begin close together
  const domAngle = new Map();
  const x = new Float64Array(N), y = new Float64Array(N), z = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), vz = new Float64Array(N);
  nodes.forEach((n, i) => {
    if (!domAngle.has(n.dom)) domAngle.set(n.dom, rnd() * Math.PI * 2);
    const a = domAngle.get(n.dom) + (rnd() - 0.5) * 1.2, r = coneR(ty[i]) * (0.55 + 0.4 * rnd());
    x[i] = r * Math.cos(a); z[i] = r * Math.sin(a); y[i] = ty[i];
  });
  const rad = nodes.map(n => 2.3 + 7 * Math.sqrt(n.c));
  const ITER = 340, CELL = 40;
  for (let it = 0; it < ITER; it++) {
    const alpha = Math.max(0.04, 1 - it / ITER);
    // short-range repulsion and collision via a 3D grid
    const grid = new Map();
    for (let i = 0; i < N; i++) { const k = `${Math.floor(x[i] / CELL)},${Math.floor(y[i] / CELL)},${Math.floor(z[i] / CELL)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
    for (let i = 0; i < N; i++) {
      const gx = Math.floor(x[i] / CELL), gy = Math.floor(y[i] / CELL), gz = Math.floor(z[i] / CELL);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const cell = grid.get(`${gx + a},${gy + b},${gz + c}`); if (!cell) continue;
        for (const j of cell) {
          if (j <= i) continue;
          const dx = x[j] - x[i], dy = y[j] - y[i], dz = z[j] - z[i], d = Math.hypot(dx, dy, dz) || 0.01;
          const D = 30 + rad[i] + rad[j];
          if (d >= D) continue;
          const f = (D - d) / d * (d < rad[i] + rad[j] + 3 ? 0.35 : 0.06 * alpha + 0.02);
          vx[i] -= dx * f; vz[i] -= dz * f; vy[i] -= dy * f * 0.3;
          vx[j] += dx * f; vz[j] += dz * f; vy[j] += dy * f * 0.3;
        }
      }
    }
    // prerequisite links pull topics together around the funnel (mostly sideways; height stays tied to age)
    for (const [c, p] of edges) {
      const dx = x[p] - x[c], dz = z[p] - z[c], d = Math.hypot(dx, dz) || 0.01, f = (d - 25) / d * 0.012 * alpha;
      vx[c] += dx * f; vz[c] += dz * f; vx[p] -= dx * f; vz[p] -= dz * f;
    }
    for (let i = 0; i < N; i++) {
      const r = Math.hypot(x[i], z[i]) || 0.01, target = coneR(y[i]) * 0.84, f = (target - r) / r * 0.05;
      vx[i] += x[i] * f; vz[i] += z[i] * f;
      vy[i] += (ty[i] - y[i]) * 0.06;
      vx[i] *= 0.6; vy[i] *= 0.6; vz[i] *= 0.6;
      x[i] += vx[i]; y[i] += vy[i]; z[i] += vz[i];
    }
  }
  return nodes.map((_, i) => [Math.round(x[i] * 10) / 10, Math.round(y[i] * 10) / 10, Math.round(z[i] * 10) / 10]);
}

// ---------- German taxonomy ----------
const deTopics = J(join(root, 'data/topics.json')).topics;
const TIER = Object.fromEntries(J(join(root, 'data/subjects.json')).subjects.map(s => [s.name, s.tier || 'core']));
const deDeps = J(join(root, 'data/dependencies.json')).dependencies;
const cw = J(join(root, 'data/crosswalk-os-taxonomy.json')).links;
const deIdx = new Map(deTopics.map((t, i) => [t.id, i]));
const deEdges = deDeps.map(e => [deIdx.get(e.topicId), deIdx.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0]);
const dePos = layout(deTopics.map(t => ({ age: t.ageRangeStart, dom: t.subject + '|' + t.domain, c: t.centrality })), deEdges, 20261106);
const de = {
  nodes: deTopics.map((t, i) => ({
    p: dePos[i], f: famIndex(t.subject), c: t.centrality, a: [t.ageRangeStart, t.ageRangeEnd], g: [t.gradeStart, t.gradeEnd],
    k: t.key, n: t.nameDe, ne: t.name, s: t.subject, d: t.domain, ds: t.description, q: t.assessmentPrompt,
    x: TIER[t.subject] === 'extended' ? 1 : 0, cl: t.courseLevel || null,
  })),
  edges: deEdges,
};

// ---------- os-taxonomy (optional) ----------
let os = null, cross = [];
const osDir = resolve(root, '../os-taxonomy/data');
if (existsSync(join(osDir, 'topics.json'))) {
  const osTopics = J(join(osDir, 'topics.json')).topics;
  const osDeps = J(join(osDir, 'dependencies.json')).dependencies;
  const osIdx = new Map(osTopics.map((t, i) => [t.id, i]));
  const osEdges = osDeps.filter(e => osIdx.has(e.topicId) && osIdx.has(e.prerequisiteId)).map(e => [osIdx.get(e.topicId), osIdx.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0]);
  const osPos = layout(osTopics.map(t => ({ age: t.ageRangeStart, dom: t.subject + '|' + t.domain, c: t.centrality ?? 0 })), osEdges, 4003);
  os = {
    nodes: osTopics.map((t, i) => ({ p: osPos[i], f: famIndex(t.subject), c: t.centrality ?? 0, a: [t.ageRangeStart, t.ageRangeEnd], k: t.id, n: t.name, s: t.subject, d: t.domain, q: t.assessmentPrompt })),
    edges: osEdges,
  };
  const REL = { exact: 0, close: 1, broader: 2, narrower: 3 };
  cross = cw.filter(l => l.relation in REL && deIdx.has(l.deId) && osIdx.has(l.osId)).map(l => [deIdx.get(l.deId), osIdx.get(l.osId), REL[l.relation]]);
}

const payload = { generatedAt: new Date().toISOString().slice(0, 10), AGE0, STEP, families: FAMILIES, de, os, cross };
const json = JSON.stringify(payload).replace(/</g, '\\u003c');
const html = readFileSync(join(root, 'scripts/graph-template.html'), 'utf8').replace('__DATA__', () => json);
writeFileSync(join(root, 'graph.html'), html);
console.log(`graph written: ${join(root, 'graph.html')} (${Math.round(html.length / 1024)} KB; ${de.nodes.length} German topics${os ? `, ${os.nodes.length} os-taxonomy topics` : ''})`);
