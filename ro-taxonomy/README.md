# Romanian Curriculum Taxonomy (clasa pregătitoare – clasa a XII-a)

A graph of **what children learn in Romanian schools**, from clasa pregătitoare to the
Bacalaureat, built on the same data model as the [German taxonomy](../de-taxonomy/README.md)
(which mirrors Marble's [os-taxonomy](https://github.com/withmarbleapp/os-taxonomy)). Each
entry is a small, teachable topic, linked to the topics a child needs first and to the
official *programe școlare*. It is tailored to the Romanian system:

- one national curriculum: the programmes approved by ministerial order, with the
  competențe specifice cited by their official numbers;
- grades instead of ages: clasa pregătitoare (0) to clasa a XII-a (12); ages are derived;
- liceu on the theoretical track, with each topic marked for the specialisations that
  teach it: matematică-informatică (MI), științe ale naturii (SN), științe sociale (SS),
  filologie (FIL);
- core and extended subjects, so French, Latin, the arts, sport, religion, technology and
  personal development can be hidden;
- the whole page in Romanian, English or German: interface, names, descriptions, mastery signs,
  parent checks, prerequisite reasons and parent summaries;
- a crosswalk to the German taxonomy.

> **Version** `ro-v1` · **Topics** 2,075 · **Prerequisite edges** 3,847 (2,248 required) ·
> **Subjects** 20 (12 core, 8 extended) · **Programmes** 88 / 2,731 competence codes ·
> **Links to the German taxonomy** 2,909

How it compares with the German curriculum: **[../comparison-ro-de/README.md](../comparison-ro-de/README.md)**.

**Browse it** [online](https://codingarchitect-wq.com/lernlandkarte/ro-taxonomy/index.html) once
published, or run `npm run all` (see [Build and check](#build-and-check)) and open `index.html`
(works offline; the built page isn't committed). It opens in Romanian; the **Limba** switch
(or `index.html?lang=en` / `?lang=de`) changes everything to English or German. It has the same views as the German browser:
a curriculum map per subject (domains × grade, with a filter for primar, gimnaziu and liceu),
all topics (filter by liceu specialisation), learning paths, parent summaries, and the
programmes with their codes. Every topic opens a details panel with its German counterparts.
Deep links look like `index.html#t/ma-no-fractii-concept` or `index.html#path/ma-an-derivata-tangenta`.

**3D map:** the German taxonomy's `graph.html` has a **Romanian** switch (`graph.html#ro`, or
`graph.html#ro/<key>` for one topic). The two curricula sit on the same age scale, and a
topic's card lists its counterparts in the other country.

## Scope and subjects

| Subject | Tier | Grades | CP–IV | V–VIII | IX–XII | Liceu: all four specialisations | Liceu: some | Total |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Matematică | core | CP–XII | 82 | 118 | 150 | 43 | 107 | 350 |
| Limba și literatura română | core | CP–XII | 84 | 115 | 128 | 105 | 23 | 327 |
| Istorie | core | IV–XII | 18 | 63 | 83 | 69 | 14 | 164 |
| Limba engleză | core | CP–XII | 38 | 50 | 41 | 36 | 5 | 129 |
| Fizică | core | VI–XII | – | 50 | 67 | 25 | 42 | 117 |
| Biologie | core | V–XII | – | 51 | 64 | 34 | 30 | 115 |
| Geografie | core | IV–XII | 17 | 50 | 46 | 41 | 5 | 113 |
| Informatică și TIC | core | V–XII | – | 39 | 67 | 28 | 39 | 106 |
| Chimie | core | VII–XII | – | 34 | 63 | 27 | 36 | 97 |
| Științe ale naturii | core | CP–IV | 60 | – | – | – | – | 60 |
| Științe socio-umane | core | IX–XII | – | – | 51 | 40 | 11 | 51 |
| Educație civică și socială | core | III–VIII | 16 | 25 | – | – | – | 41 |
| Educație fizică și sport | extended | CP–XII | 32 | 12 | 25 | 25 | – | 69 |
| Religie | extended | CP–XII | 14 | 17 | 27 | 27 | – | 58 |
| Limba franceză | extended | V–XII | – | 33 | 21 | 19 | 2 | 54 |
| Educație muzicală | extended | CP–X | 20 | 17 | 15 | 15 | – | 52 |
| Dezvoltare personală și consiliere | extended | CP–XII | 10 | 19 | 23 | 23 | – | 52 |
| Arte vizuale | extended | CP–X | 15 | 18 | 17 | 17 | – | 50 |
| Limba latină | extended | VII–XII | – | 16 | 30 | – | 30 | 46 |
| Educație tehnologică | extended | CP–VIII | 7 | 17 | – | – | – | 24 |
| **All** | | | **413** | **744** | **918** | **574** | **344** | **2,075** |

Columns count topics by the grade they start in. One subject runs across cycles when the
programme's title changes: Matematică includes the maths half of *Matematică și explorarea
mediului* (CP–II), Științe ale naturii its science half; Limba și literatura română starts
as *Comunicare în limba română*; Educație civică și socială joins Educație civică (III–IV) and
Educație socială (V–VIII); Științe socio-umane holds the liceu subjects Logică (IX),
Psihologie and Sociologie (X), Filosofie (XI) and Economie și educație antreprenorială (XII);
Arte vizuale covers Arte vizuale și abilități practice, Educație plastică and Educație
vizuală; the arts end in clasa a X-a under the new liceu framework. Religion follows the
Orthodox programme, the majority denomination; the programmes of other denominations are
noted but not modelled.

**Liceu specialisations.** 574 liceu topics belong to the common trunk of all four
specialisations; 344 come from a specialisation's own curriculum (e.g. 31 maths topics are
matematică-informatică only, Latin continues only in filologie, and the humanities stop the
sciences after clasa a X-a). The German taxonomy marks the Oberstufe by course level
(gA/eA) instead; the comparison uses both.

## Files

| File | What it holds |
|---|---|
| `index.html` | Self-contained browser (generated by `npm run browser`, not committed) |
| [`data/topics.json`](data/topics.json) | Topics (nodes) |
| [`data/dependencies.json`](data/dependencies.json) | Prerequisite edges; `topicId` depends on `prerequisiteId`; `origin` = authored or cross-subject |
| [`data/curriculum-standards.json`](data/curriculum-standards.json) | 88 programmes with their competence codes and paraphrased titles |
| [`data/clusters.json`](data/clusters.json) | 475 parent-facing summaries in Romanian and English, per subject × domain × band (CP–II, III–IV, V–VI, VII–VIII, IX–X, XI–XII) |
| [`data/subjects.json`](data/subjects.json) | Subjects (with `tier`) and domains with their basis in the programmes |
| [`data/crosswalk-de-taxonomy.json`](data/crosswalk-de-taxonomy.json) | Romanian topic → German topic links (`exact`/`close`/`broader`/`narrower`/`related`) |
| [`data/manifest.json`](data/manifest.json) | Counts and SHA-256 checksums |
| [`schema/`](schema/) | JSON Schemas |
| [`authoring/`](authoring/) | The source: one file per subject group and cycle (`pg-*` = CP–VIII, `liceu-*` = IX–XII), plus `_external-resolutions.json` (reviewed cross-subject links) |
| [`reports/external-prerequisites.json`](reports/external-prerequisites.json) | How every cross-subject prerequisite was resolved |
| [`docs/authoring-format.md`](docs/authoring-format.md) | The authoring specification |
| [`PROVENANCE.md`](PROVENANCE.md) | Sources and copies used |

### A topic

```json
{
  "key": "ma-an-derivata-tangenta",
  "type": "CONCEPTUAL",
  "subject": "Matematică", "domain": "Analiză matematică",
  "name": "Derivative at a point and the tangent line",
  "nameRo": "Derivata unei funcții într-un punct; tangenta (și normala) la grafic",
  "gradeStart": 11, "gradeEnd": 11, "stage": "Învățământ liceal",
  "profiles": ["MI", "SN"],
  "ageRangeStart": 17, "ageRangeEnd": 18,
  "standards": ["ro-matematica-mi-ix-xii-2025:XI.1.6", "ro-matematica-sn-ix-xii-2025:XI.1.3", "…"],
  "romaniaSpecific": false
}
```

Differences from the German topic shape: `nameRo` instead of `nameDe`; grades 0–12 with
`age = clasa + 6` (clasa pregătitoare and German Klasse 1 both start at 6); `profiles`
(liceu only) instead of `courseLevel`; `romaniaSpecific` and `notes` instead of
`germanSpecific` and `laenderNotes`; standards use the programmes' official competence
numbers rather than constructed codes.

## Build and check

Requires Node ≥ 20, no dependencies. Needs the built German taxonomy next to it
(`../de-taxonomy/data/`), because the checks and the comparison read it.

```bash
npm run check      # validate every authoring file (fields, subjects, keys, DAG, grade order, profiles, codes, German keys)
npm run build      # merge authoring/*.json → data/*.json (IDs, ages, cross-subject edges, centrality, manifest)
npm run validate   # schemas + references + acyclicity + grade order + crosswalk + checksums
npm run browser    # → index.html
npm run compare    # → ../comparison-ro-de/{comparison.json, generated-tables.md, explorer-data.json, index.html}
npm run all        # build + validate + browser + compare
```

The 3D map is built from `../de-taxonomy` (`npm run graph` there), which picks up this
taxonomy when its data exists. To find German counterparts while authoring:
`node tools/de-candidates.mjs --query "column subtraction" --subjects Mathematik`.

The browser uses the German taxonomy's template (`../de-taxonomy/scripts/browser-template.html`),
which serves both countries and holds the interface strings in English, German and Romanian.
The comparison page (`scripts/explorer-template.html`) has the same layout as the German one
and the same English/German/Romanian switch. `tools/merge-translations.mjs` merges a German or
Romanian version of the topic texts into an authoring file; `tools/i18n-meta.mjs` exports and
merges the texts around the topics (subject and domain names and descriptions, domain bases,
parent summaries, source notes, standard titles and crosswalk notes). Both tools are shared
with `../de-taxonomy/tools/`.

## How it was built

1. **Format and tools first.** The German format was adapted (fixed subject names and key
   prefixes, grades 0–12, specialisations, official competence codes, German crosswalk), with
   a checker and a search tool over the German taxonomy.
2. **Wave 1, clasa pregătitoare – VIII.** Six parallel AI authoring passes, one per subject
   group, each working from the programmes it downloaded: language, maths, sciences, history
   and geography with civic education, languages with IT, and arts, sport, religion,
   technology and personal development. Each pass judged German counterparts from candidate
   lists. Both maths and science used the integrated MEM programme; their catalogue entries
   were merged.
3. **Wave 2, liceu.** Six more passes for clasa a IX-a – a XII-a, linking their first topics
   directly to the gimnaziu topics and marking each topic's specialisations from the
   framework plans.
4. **Merge and review.** All files pass the checker with 0 errors and 0 warnings. 205
   cross-subject prerequisites were resolved by search and then reviewed: 146 kept, 51
   re-pointed, 3 found, 3 dropped, 2 left unresolved. One edge is dropped to keep the graph
   acyclic. Every liceu topic reaches gimnaziu topics through its prerequisites.
5. **Romanian and German texts.** The topics were authored with Romanian names and parent
   summaries and English descriptions. Twelve translation passes, one per authoring file, then
   wrote the Romanian descriptions, mastery evidence, parent questions, notes and all 3,847
   prerequisite reasons; twelve more wrote the same in German, with German names. Smaller passes
   translated the subject descriptions, domain names and bases, parent summaries, source notes,
   competence titles and crosswalk notes. Each translation was checked (completeness, `{{name}}`
   placement, diacritics) before it was merged. The translators flagged factual slips in the
   English (among them where the Mureș flows, the dates of the 1918 unions and the origin of the
   Hurrian hymn); the clear ones were corrected in all three languages.

## Limitations

- **Not reviewed by teachers.** Written with AI assistance from the programmes; placements,
  granularity and crosswalk relations are judgements.
- **Liceu in transition.** The new liceu programmes are phased in from 2026–2027 (clasa a
  XII-a only from 2029–2030), and some approved texts could not be downloaded: for those
  grades the taxonomy follows the consultation drafts or the Bacalaureat 2030 programmes (see
  each source's `notes`). Pupils now in clasele X–XII still follow the old programmes.
- **Theoretical liceu only.** The technological and vocational tracks, minority-language
  schools and optional subjects (CDȘ/CDEOȘ) are not modelled; ȘTIAM and "Discursuri multiple"
  have no programme yet.
- **Programme versus classroom.** Some programmes list competences without content (e.g.
  literary species in Romanian V–VIII); there, placement follows common textbook practice and
  the topic says so.
- **Copies, not the official host.** rocnee.eu blocks automated downloads, so annexes were
  read from inspectorate, archive and press copies of the Monitorul Oficial; a few come only
  from teacher-resource sites. See [PROVENANCE.md](PROVENANCE.md).
- **Three languages, one source.** The English texts are the source; the Romanian and German
  versions are AI translations, reviewed by automated checks but not by native-speaking editors.
- **Crosswalk relations are judgements.** A "close" link can pair an early simple version of
  an idea with a later, deeper one, which inflates some age differences.

## Licence and attribution

Same licences as the rest of the repository: the database under [ODbL 1.0](../LICENSE), the
text written for this project under [CC BY-SA 4.0](../LICENSE-CONTENT), the scripts in
`scripts/` and `tools/` under [MIT](../LICENSE-CODE). Credit this project and, for the data
model, *Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble)*; the attribution
lines are in the [top-level README](../README.md#licence). The programmes themselves remain
under the Ministry's terms; see [PROVENANCE.md](PROVENANCE.md).
