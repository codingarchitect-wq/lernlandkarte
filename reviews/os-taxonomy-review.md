# Review: Marble Skill Taxonomy (`os-taxonomy`)

*Reviewed 2026-11-06 against the local checkout (HEAD `04962c7`, "Publish scoped alignment
baseline"). All numbers below were computed from `data/*.json`. The repo's own checks
pass: `npm run validate` ✓, `npm test` 93/93 ✓, `npm run alignments:generated-check` ✓.*

## 1. Verdict in one paragraph

`os-taxonomy` is a well-engineered, honestly documented **graph of primary-school
learning**: 1,861 English-language micro-topics, a 4,003-edge prerequisite DAG, and
7,062 links to 17 curriculum sources (England, US Common Core/NGSS/C3, Australia v9,
Ontario, IB PYP). Its strongest qualities are the data model (small, strict, stable
IDs), the integrity tooling (schemas, DAG checks, checksums, reproducible generation),
and an unusually careful stance on rights and on what a "link to a standard" does
and doesn't prove. Its weaknesses are mostly about **content coverage and
consistency**. It covers maths, English and science well and everything else thinly
(no arts, music, PE, languages or religion). It carries about 180 near-duplicate
"(age N+)" topics left over from per-curriculum ingestion. Its history content is
built around British and Australian narratives. And it has no way to store
non-English names, which matters directly for a German curriculum.

## 2. What it is

| Layer | File | Size | Notes |
|---|---|---:|---|
| Nodes | `data/topics.json` | 1,861 topics | id `mt_…`, type, subject, domain, name, description, 3 evidence items, ages, centrality, assessmentPrompt, flat `standards` |
| Edges | `data/dependencies.json` | 4,003 (2,330 hard / 1,673 soft) | `topicId` depends on `prerequisiteId`, with a one-line reason |
| Standards | `data/curriculum-standards.json` | 17 sources / 7,743 codes | full text for UK NC (OGL), ACARA (CC BY), CCSS; codes-only for NGSS, C3, IB, Ontario |
| Alignment contexts | `data/curriculum-alignments.json` (schema v2) | 3,733 contexts | per-jurisdiction age bands (`global` / `framework` / `jurisdiction` scopes); flat topic fields are derived from this |
| Summaries | `data/clusters.json` | 176 | parent-facing paragraph per (subject, domain, age band) |
| Pedagogy | `data/teaching-research.json` | 1,049 records, 22 MB | Maths + Science only |
| Tooling | `scripts/*.mjs` (~1,170 lines), CI | | validate, schema check, DAG cycles, alignment codec, artifact generation |
| Extras | `.agents/skills/marble-builder` | | agent skill for building offline HTML learning experiences from topics |

Licensing is layered: ODbL for the database, CC BY-SA for authored text, and
upstream terms for the standards text (PROVENANCE.md explains each source's
terms). This is one of the most carefully handled parts of the project.

## 3. Strengths

1. **Clean, minimal node/edge model.** Every topic has the same shape, with exactly
   three observable evidence criteria for 1,727 of the 1,861 topics, and a
   natural-language assessment prompt (`{{name}}` placeholder present on all
   1,861). This makes the taxonomy directly usable for diagnosis and for
   generating learning activities.
2. **A real prerequisite graph.** The DAG is acyclic and deep: mean depth 9, max
   29 (*Relative Motion*). Only 97 topics have no prerequisites, there is 1
   isolated node, and every edge has a written reason. Cross-subject edges exist
   (Science→Maths 20, History→English 19, English→Learning-to-Learn 21), so the
   graph isn't just a set of separate subject trees.
3. **One shared taxonomy, many curricula.** Curricula map onto shared topics
   rather than creating parallel country trees. The README's authoring rules
   ("reuse a topic when it assesses the same concept…", "add country-specific
   topics only where the knowledge genuinely differs") are the right principles,
   and schema v2 alignments keep jurisdiction-specific ages without splitting
   topics.
4. **Epistemic honesty.** Coverage reports repeatedly separate "linked" from
   "Full coverage" and from "learner mastery", and record which earlier Full
   claims were *not* recertified (572 ACARA claims). Teaching research is labelled
   as agent-authored, not empirically validated.
5. **Engineering hygiene.** Strict JSON Schemas (`additionalProperties: false`),
   checksummed manifest, deterministic generation, regression tests, CI on every
   PR, and an explicit authority/publication design for downstream consumers.

## 4. Findings

### 4.1 Subject coverage is narrow and uneven

| Subject | Topics | Domains | Observation |
|---|---:|---:|---|
| Mathematics | 581 | 12 | Comprehensive |
| Science | 576 | 20 | Comprehensive, but see 4.3 |
| English | 339 | 9 | First-language literacy only |
| Personal & Social Dev. | 118 | 6 | Good SEL coverage |
| History | 109 | 6 | Theme-driven (Egypt 29, Greece & Rome 29, Medieval 25) |
| Computing | 52 | 7 | 18 of 52 are "Artificial Intelligence" |
| Life Skills | 46 | 3 | Money, entrepreneurship, cooking |
| Geography | 22 | 2 | Very thin |
| Learning to Learn | 18 | 1 | |

There are no topics at all for Art, Music, PE, foreign languages, Religious
Education or citizenship. Design & Technology has only 9 topics, filed under
Science. The standards catalogue does include these areas, but nothing links to
them: UK NC Art, Music, PE, Languages, D&T, Geography, History and Computing codes
are 0% linked (0 of 110). The Ontario Science, Social Studies, Arts, FSL and HPE
documents (2,513 codes) and C3 Social Studies (338 codes) are also unlinked. A
family-facing "map of what children learn" that leaves out the arts and physical
education is missing a large part of the school week in every system.

### 4.2 Near-duplicate topics from per-curriculum ingestion

- **102 topic names carry an "(age N+)" suffix**, e.g. *Expanded noun phrases (age 8+)*,
  *Expanded noun phrases (age 9+)*, *Times tables (age 7+)*.
- **66 base names cover 183 topics**. For example, *Adding and subtracting* exists 5
  times (ages 5–7, 7–9, 8–10, 9–11, 10–12), and *Revising and editing* 3 times.
- Some of these are legitimate progressions (numbers to 100 → 1,000). But many are
  the same skill re-imported from another curriculum at a different age. This
  works against the "topics do not track multiple difficulty levels" rule, makes
  crosswalks ambiguous (which of the five should a German topic match?), and
  dilutes learner-state tracking.

**Recommendation:** merge the copies into one topic each, give them distinct names
where they really are progressions, and express the age differences through the
v2 jurisdiction contexts that already exist for this.

### 4.3 Domain design mixes disciplines with themes

Science domains include disciplinary areas (*Forces & Motion*, *Matter & Materials*)
alongside interest themes (*Dinosaurs & Paleontology* 29, *Volcanoes & Earthquakes*
28, *Polar Regions* 25, *Rainforests* 25, *Ocean Life* 27, *Animals of the World*
27). The themes are engaging, but they overlap with the disciplinary domains:
rainforest and polar topics are really ecology and geography, and many have no
standards (Science has 260 topics without any standard link). History is built
around Egypt, Greece and Rome, Medieval Britain (Vikings, Anglo-Saxons) and
Australian colonisation (*Why Britain colonised in 1788*). There is no
continental-European or German content, and 86 of 109 History topics have no
standard link at all.

### 4.4 Data-quality items

| Check | Result | Comment |
|---|---:|---|
| Topics with **0 evidence items** | 35 | All are ages 11–14 Science/PSD "advanced" topics (*Systemic Inequality and Allyship*, *The Red Queen Hypothesis*, *Supervolcanoes & Volcanic Winter*), none linked to standards. Looks like an unfinished extension tier, and it breaks the "3 evidence items" contract. |
| Prerequisite starts **later** than the dependent topic | 145 edges (12 hard) | e.g. *Asking Questions* (4) ⇐ hard *Question Words* (5); *Offspring resemble parents* (6) ⇐ hard *Inherited characteristics* (8); *Compound Units* (11) ⇐ hard *Proportion* (12). Hard edges like these are age contradictions. |
| Wide age bands (≥ 6 years) | 158 topics | A side effect of taking the union of ages across jurisdictions. v2 contexts keep per-jurisdiction ages, but consumers of the flat fields only see the union. |
| Jurisdiction ages don't consistently mean "grade placement" | Ontario | Ontario Grade 4–6 expectations often sit in contexts whose start age is 6 (e.g. Grade 5: 250 of 496 links at age 6). Those contexts carry the linked topic's own age (component/prerequisite links), not the age at which Ontario teaches the expectation. UK NC (Year N = age N+4) and CCSS (Grade N = age N+5) are consistent. Consumers comparing countries by age can be misled. |
| Topics without any standard | 421 (23%) | Science 260, History 86, PSD 30 |
| Domains without a cluster summary | 25 of 66 | Every Computing, Geography, Life Skills and Learning-to-Learn domain; 5 of 6 History domains; plus Probability, Self-Awareness, English Thinking and 4 Science domains |
| Teaching-research coverage | 1,049 / 1,861 | Maths and Science only; English, History, PSD etc. have 0 |
| Locale leakage in the "shared" layer | 39 UK spellings, 34 GBP mentions, 15 imperial-unit mentions | e.g. money topics framed in pounds/pence. This conflicts with the stated goal of one shared, cross-country taxonomy. |

### 4.5 Internationalisation limits (directly relevant to Germany)

- The schema has **no fields for language or translations** (`additionalProperties:
  false`). Names, descriptions, evidence and prompts are English only.
- **"English" is a subject name**, not "first-language literacy". German phonics,
  spelling (capitalising nouns, final-consonant devoicing, ß), grammar (cases,
  grammatical gender, verb-second word order) and literature can't be expressed as
  "local examples" of English topics; they would need new topics in a subject
  called English. A language-neutral subject ("Language & Literacy", with the
  language as a facet) would scale better.
- There is no concept of **grade/school stage**, only ages. Countries assign the
  same content to different ages: German Klasse 1 is age 6–7, while England's Year
  1 is age 5–6. An age-only model can't separate "this skill is taught later here"
  from "this skill is harder".
- There is no place for **regional (state/Land) variation** inside one country
  beyond a free-text `region`. That suits Ontario, but Germany has 16 Länder
  curricula under a common KMK framework.

### 4.6 Process and documentation

The README and CHANGELOG are thorough but dense. The README is about 300 lines of
policy prose, much of it PR-specific (e.g. Grade 5 Language link counts), and
would read better as a short overview plus separate docs. The `reports/` folder (35
files) is a good audit trail, but there is no single coverage dashboard across
curricula.

## 5. What to carry over to a German taxonomy, and what to change

**Keep:** the node shape (type, domain, description, 3 evidence items, assessment
prompt), hard/soft edges with reasons, DAG and age-order validation, namespaced
standard keys, codes-only plus paraphrase for encumbered sources, parent-facing
clusters, and the rule "don't claim Full coverage from a link".

**Change or add:**
1. Bilingual fields (`nameDe`, plus German cluster summaries) so the taxonomy is
   usable by German parents and teachers.
2. **Grade (Jahrgangsstufe)** as the primary placement, with ages derived from it.
3. German subject structure: Deutsch, Mathematik, **Sachunterricht** (integrated in
   Klassen 1–4), then separate subjects from Klasse 5; Englisch as a *foreign*
   language; Musik, Kunst, Sport, Religion/Ethik.
4. Domains named after the binding national framework (KMK Bildungsstandards
   Leitideen and Kompetenzbereiche; GDSU perspectives for Sachunterricht).
5. A `laenderNotes` field to record real federal variation without splitting
   topics.
6. An explicit **crosswalk** to os-taxonomy (`exact`/`close`/`broader`/`narrower`/
   `related`), so the two can be compared and later merged.

The German build and comparison that follow from this review are in
[`../de-taxonomy`](../de-taxonomy/README.md) and [`../comparison`](../comparison/README.md).

## 6. Prioritised recommendations for os-taxonomy

1. **Fix the 12 hard age-inverted edges** (soften them, or correct the ages), and
   add a validator check for hard edges where the prerequisite starts later.
2. **Finish or drop the 35 zero-evidence topics**, and enforce `evidence.length ≥ 2`
   in the schema.
3. **Consolidate the "(age N+)" duplicates**, using v2 contexts for jurisdiction
   ages.
4. **Add cluster summaries** for the 25 uncovered domains.
5. **Make the shared layer locale-neutral** (currency, units, spelling), and move
   local examples into jurisdiction contexts.
6. **Add i18n fields** (`names: {en, de, fr…}`), or a sidecar translations file
   keyed by topic ID that the schema allows.
7. **Plan subject expansion** (Arts, Music, PE, Languages, RE/Ethics), since the
   catalogue already contains codes nobody links to.
8. **Re-anchor History and Geography** on transferable historical and geographical
   thinking, with country-specific content topics added per jurisdiction.
