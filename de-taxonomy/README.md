# German Curriculum Taxonomy (Vorschule – Klasse 13)

A graph of **what children learn in German schools**, from Vorschule to the Abitur,
built on the same data model as the [Marble os-taxonomy](https://github.com/withmarbleapp/os-taxonomy).
Each entry is a fine-grained, teachable micro-topic, connected to others in a
prerequisite DAG and linked to German curriculum standards. The taxonomy is
tailored to the German system:

- national KMK standards plus Länder curricula;
- school years (Jahrgangsstufen) instead of ages; the Gymnasium from Klasse 7, in G9
  numbering, with each Oberstufe topic marked as taught in all courses (gA) or only in
  the Leistungskurs (eA);
- German subject structure (Sachunterricht, then separate subjects from Klasse 5);
- core and extended subjects, so the second foreign languages, arts, sport and
  religion/ethics can be hidden;
- bilingual names and summaries;
- a crosswalk to os-taxonomy.

> **Version** `de-v2` · **Topics** 2,225 · **Prerequisite edges** 4,513 (2,500 hard) ·
> **Subjects** 18 (12 core, 6 extended) · **Curriculum sources** 107 / 4,619 codes ·
> **Crosswalk links to os-taxonomy** 2,133

**Browse it:** run `npm run all` (see [Build and check](#build-and-check)), then open
`index.html` in a browser (works offline). The built pages aren't committed. It has five views:
- a curriculum map per subject (domains × Klasse), with a stage filter for
  Vorschule–4, 5–10 and the Oberstufe;
- a filterable list of all topics, including the Oberstufe course level;
- learning-path graphs that show everything a child needs before a topic;
- the parent summaries;
- the curriculum sources with their codes.

The **Core only** switch in the header hides Französisch, Latein, Musik, Kunst, Sport
and Religion & Ethik. It is kept in the link (`?subjects=core`) and carried to the
other pages. Every topic opens a details panel. Deep links look like
`index.html#t/de-rs-verlaengern` or `index.html#path/ph-qu-weltbild`.

**3D map:** `graph.html` shows every topic as a dot and every prerequisite as
a thread. Height is the age a topic starts, from Vorschule to Klasse 13. Click a dot to trace
everything that comes before it, and switch to os-taxonomy to compare the two shapes on the
same age scale. It uses the technique of os-taxonomy's preview (`media/curriculum-viz.*`):
positions are computed at build time, then drawn on a canvas.

How it compares with os-taxonomy: **[../comparison/README.md](../comparison/README.md)**
(interactive explorer: `../comparison/index.html`, also built by `npm run all`).
Review of os-taxonomy: [../reviews/os-taxonomy-review.md](../reviews/os-taxonomy-review.md).

## Scope and subjects

Klasse 7–13 describe the **Gymnasium** track. Topic counts by the Klasse a topic
starts in (eA = Oberstufe topics for the Leistungskurs only):

| Subject | Tier | Klassen | Total | Vorschule–4 | 5–6 | 7–10 | 11–13 (eA) |
|---|---|---|---:|---:|---:|---:|---:|
| Mathematik | core | 0–13 | 363 | 135 | 50 | 107 | 71 (17) |
| Deutsch | core | 0–13 | 328 | 155 | 45 | 67 | 61 (11) |
| Sachunterricht | core | 1–4 | 164 | 164 | – | – | – |
| Englisch (first foreign language) | core | 3–13 | 154 | 30 | 31 | 50 | 43 (7) |
| Informatik & Medienbildung | core | 1–13 | 128 | 46 | 12 | 35 | 35 (7) |
| Naturwissenschaften | core | 5–6 | 61 | – | 61 | – | – |
| Biologie | core | 7–13 | 97 | – | – | 49 | 48 (11) |
| Chemie | core | 7–13 | 92 | – | – | 50 | 42 (15) |
| Physik | core | 7–13 | 112 | – | – | 68 | 44 (10) |
| Geschichte | core | 6–13 | 104 | – | 29 | 60 | 15 (3) |
| Erdkunde | core | 5–13 | 83 | – | 28 | 39 | 16 (2) |
| Politik und Wirtschaft | core | 5–13 | 86 | – | 23 | 38 | 25 (4) |
| Französisch (second foreign language) | extended | 6–13 | 73 | – | 24 | 31 | 18 (4) |
| Latein | extended | 6–13 | 64 | – | 19 | 35 | 10 (2) |
| Musik | extended | 1–13 | 75 | 27 | 3 | 32 | 13 (3) |
| Kunst | extended | 1–13 | 74 | 21 | 8 | 30 | 15 (3) |
| Sport | extended | 1–13 | 85 | 30 | 5 | 37 | 13 (3) |
| Religion & Ethik (incl. Philosophie) | extended | 1–13 | 82 | 24 | 3 | 25 | 30 (4) |
| **All** | | | **2,225** | **632** | **341** | **753** | **499 (106)** |

Domains follow the official structures: KMK Leitideen and Kompetenzbereiche, the GDSU
perspectives in Sachunterricht, the KMK Basiskonzepte in the sciences, the Abitur
Sachgebiete in Mathematik (Analysis, Lineare Algebra/Analytische Geometrie,
Stochastik), literary Epochen in Deutsch, and Bewegungsfelder in Sport. Every
Gymnasium topic links back to Klasse 0–6 topics, so the prerequisite chains run
from Vorschule to the Abitur (up to 50 steps).

278 topics are flagged `germanSpecific`. Examples include:
- **language:** grammatical case and gender, writing nouns with a capital letter, Konjunktiv I in reported speech, the Feldermodell of German sentences;
- **road safety and sport:** the cycling test, the Seepferdchen swimming badge;
- **history and geography:** the Limes, Germany's main landscapes, Weimar, the NS dictatorship and the GDR, the Energiewende;
- **literature and Latin:** the literary Epochen from Sturm und Drang to Gruppe 47, the Latinum;
- **institutions:** the Grundgesetz and the federal constitutional bodies.

## Files

| File | What it holds |
|---|---|
| `index.html` | Self-contained browser for the taxonomy (generated by `npm run browser`, not committed) |
| `graph.html` | Rotating 3D map of topics and prerequisites, German and os-taxonomy (generated by `npm run graph`, not committed) |
| [`data/topics.json`](data/topics.json) | Micro-topics (nodes) |
| [`data/dependencies.json`](data/dependencies.json) | Prerequisite edges; `topicId` depends on `prerequisiteId`; `origin` = authored or cross-subject |
| [`data/curriculum-standards.json`](data/curriculum-standards.json) | 107 German sources (KMK, EPA, GDSU, GI, Länder) with codes and paraphrased titles |
| [`data/clusters.json`](data/clusters.json) | 589 parent-facing summaries, in English and German, per subject × domain × band (Kl. 1–2, 3–4, 5–6, 7–8, 9–10, Oberstufe) |
| [`data/subjects.json`](data/subjects.json) | Subjects (with `tier`: core or extended) and domains with descriptions and their basis in the official frameworks |
| [`data/crosswalk-os-taxonomy.json`](data/crosswalk-os-taxonomy.json) | German topic → os-taxonomy topic links (`exact`/`close`/`broader`/`narrower`/`related`) |
| [`data/manifest.json`](data/manifest.json) | Counts and SHA-256 checksums |
| [`schema/`](schema/) | JSON Schemas |
| [`authoring/`](authoring/) | Source of truth: six Klasse 0–6 files, eight `gym-*` files for Klasse 5–13, and `_external-resolutions.json` (reviewed cross-subject prerequisite mappings) |
| [`docs/authoring-format.md`](docs/authoring-format.md) | Authoring spec and code schemes, including the Gymnasium rules |
| [`reports/external-prerequisites.json`](reports/external-prerequisites.json) | How each cross-subject prerequisite was resolved |

### A topic

```json
{
  "id": "de_3tAlXx3jWW",
  "key": "de-rs-verlaengern",
  "type": "PROCEDURAL",
  "subject": "Deutsch", "subjectEn": "German (language and literature)",
  "domain": "Rechtschreibung und Zeichensetzung", "domainEn": "Spelling and Punctuation",
  "name": "Lengthening Words to Hear Final Consonants",
  "nameDe": "Verlängern bei Auslautverhärtung (d/t, g/k, b/p)",
  "description": "Find the right letter at the end of a word where German final-obstruent devoicing … by lengthening the word (Hund – Hunde, Berg – Berge, gelb – gelber, er lebt – leben).",
  "gradeStart": 2, "gradeEnd": 3, "stage": "Primarstufe", "courseLevel": null,
  "ageRangeStart": 7, "ageRangeEnd": 9,
  "evidence": ["Lengthen nouns with the plural to check the final letter", "…", "…"],
  "assessmentPrompt": "If {{name}} isn't sure whether 'Hund' ends in d or t, do they say 'Hunde' to hear the answer?",
  "standards": ["kmk-bista-primar-deutsch-2022:SC.2.1", "nrw-lp-gs-2021-deutsch:SC.3.2"],
  "germanSpecific": true,
  "laenderNotes": null
}
```

**Differences from the os-taxonomy topic shape:**

| Field | What changed |
|---|---|
| `key` | New. A stable, readable slug; `id` is derived from it (`de_` + hash). |
| `nameDe`, `subjectEn`, `domainEn` | New. Bilingual labels. |
| `gradeStart`/`gradeEnd`, `stage` | New. School-year placement (0 = Vorschule … 13), stage = Elementarbereich, Primarstufe, Sekundarstufe I or II. Ages are derived: `age = Klasse + 5`, matching os-taxonomy's convention for US grades and Australian years. |
| `courseLevel` | New. Oberstufe topics only: `gA` (grundlegendes Anforderungsniveau, all courses) or `eA` (erhöhtes Anforderungsniveau, Leistungskurs only). |
| `germanSpecific`, `laenderNotes` | New. Mark German-only content and record variation across the Länder. |
| `standards` | Same as os-taxonomy: namespaced keys. The catalogue ships codes plus paraphrases (`textIncluded: false`); see [PROVENANCE.md](PROVENANCE.md). |
| `centrality` | Recomputed: the normalised number of topics that transitively depend on this one. |

## Build and check

Requires Node ≥ 20, no dependencies. The checks read os-taxonomy from `../os-taxonomy`, a
git submodule: clone with `--recurse-submodules` or run `git submodule update --init`.

```bash
npm run check      # validate every authoring file (fields, keys, DAG, grade order, course levels, codes, os IDs)
npm run build      # merge authoring/*.json → data/*.json (IDs, ages, cross-subject edges, centrality, manifest)
npm run validate   # schemas + references + acyclicity + grade order + crosswalk IDs + checksums
npm run browser    # → index.html (the taxonomy browser)
npm run graph      # → graph.html (3D map; lays out both graphs, ~5 s)
npm run compare    # → ../comparison/{comparison.json, generated-tables.md, explorer-data.json, index.html}
npm run all        # build + validate + browser + graph + compare
```

To find os-taxonomy counterparts when authoring:
`node tools/os-candidates.mjs --query "written subtraction" --subjects Mathematics`.

## How it was built

1. **Sources.** The official KMK documents were downloaded and catalogued:
   - Bildungsstandards Primarbereich Deutsch and Mathematik 2022;
   - ESA/MSA Deutsch and Mathematik 2022, erste Fremdsprache 2023, Biologie/Chemie/Physik 2024;
   - Allgemeine Hochschulreife Deutsch, Mathematik and fortgeführte Fremdsprache 2012, Biologie/Chemie/Physik 2020;
   - the EPA for the other Abitur subjects.

   The KMK digital-world framework, the GI recommendations (primary 2019, Sek I 2008/2025, Sek II 2016) and the GDSU Perspektivrahmen were added. Then the Länder curricula of NRW (including the new G9 Oberstufe plans in force from 2027), Bayern (LehrplanPLUS Gymnasium), Baden-Württemberg, Berlin/Brandenburg and, in places, Niedersachsen.
2. **Authoring, Klasse 0–6 (`de-v1`).** Six parallel authoring passes, one per subject group,
   followed one [spec](docs/authoring-format.md). Each researched grade placement
   online, wrote topics with 3 evidence items and an assessment prompt, added
   prerequisites, and judged os-taxonomy counterparts from candidate lists ranked by
   text search (BM25).
3. **Authoring, Gymnasium Klasse 7–13 (`de-v2`).** Eight more passes followed the same spec
   plus its Gymnasium rules: G9 numbering, gA/eA course levels, and links to the
   Klasse 0–6 topics. The Deutsch pass also filled out Klasse 5–6.
4. **Merging.** `tools/build.mjs` merges all files and checks the whole graph for cycles and grade order. It resolves 314 cross-subject prerequisites:
   - **automatic:** 215 matched by text search;
   - **corrected by hand:** 88;
   - **dropped as spurious or unfillable:** 11.

   For the Gymnasium topics, all 195 automatic matches were reviewed: 131 kept, 58 corrected, 6 dropped.

## Limitations

- This is an **AI-assisted research prototype**. Placement and content follow the
  official documents, but German teachers have not reviewed them.
- **Germany has 16 curricula.** A topic's grade is the typical or majority
  placement; check `laenderNotes` and your own Land's plan. Klasse 5–13 follow
  Gymnasium plans; other school types (Realschule, Gesamtschule) differ from
  Klasse 7 on.
- **G9 numbering.** In G8 Länder (e.g. Berlin, Brandenburg, Sachsen, Thüringen, Hamburg)
  everything from Klasse 7 happens about a year earlier, and the Einführungsphase is
  Klasse 10.
- **The Oberstufe varies most.** Course choices, Zentralabitur set texts and
  Leistungskurs content differ by Land. gA/eA follows the KMK Abitur standards or the
  EPA, with deviations noted per topic.
- **Unverified sources.** Some Länder sources could not be opened or verified:
  - Baden-Württemberg's new G9 plans are not yet published for Klasse 7 onwards.
  - Niedersachsen's portal could not be read.
  - Some Bayern Oberstufe pages were missing.

  The authoring passes recorded what they could not check in the source `notes`.
- **Constructed codes.** Except where a source has official numbering (e.g. the KMK
  digital world, the Bayern Lernbereiche, the 2024 MSA science competences), codes
  such as `ZO.2.3` were constructed in document order. The GDSU history theme order
  (HIS-TB2/TB3) is inferred.
- **Crosswalk relations are judgements.** "close" can pair an early simple version
  of an idea with a later, deeper treatment. os-taxonomy runs to about age 15, so
  the Oberstufe has almost no counterparts by construction.

## Licence and attribution

The licences match os-taxonomy's: the database is under [ODbL 1.0](../LICENSE) and the
text written for this project under [CC BY-SA 4.0](../LICENSE-CONTENT). The scripts in
`scripts/` and `tools/` are under [MIT](../LICENSE-CODE). When you share the data,
credit both this project and *Marble Skill Taxonomy (v1) · © Generative Spark, Inc.
(Marble)*; the full attribution lines are in the [top-level README](../README.md#licence).
Curriculum documents remain under their publishers' terms; see
[PROVENANCE.md](PROVENANCE.md).
