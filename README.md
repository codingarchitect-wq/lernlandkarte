# Lernlandkarte

A graph of what children learn at school in **Germany** and **Romania**, from the first
school year to the Abitur and the Bacalaureat. Every topic says which school year it starts
in and which topics a child needs first. Both taxonomies use the data model of Marble's
[os-taxonomy](https://github.com/withmarbleapp/os-taxonomy). Two comparisons show where they
agree and differ: [German vs os-taxonomy](comparison/README.md) and
[Romanian vs German](comparison-ro-de/README.md).

*Lernlandkarte* is German for "learning map".

**Browse it online: [codingarchitect-wq.com/lernlandkarte](https://codingarchitect-wq.com/lernlandkarte/)**
- Germany: [3D map](https://codingarchitect-wq.com/lernlandkarte/de-taxonomy/graph.html),
  [taxonomy browser](https://codingarchitect-wq.com/lernlandkarte/de-taxonomy/index.html),
  [comparison with os-taxonomy](https://codingarchitect-wq.com/lernlandkarte/comparison/index.html)
- Romania: [3D map](https://codingarchitect-wq.com/lernlandkarte/de-taxonomy/graph.html#ro),
  [taxonomy browser](https://codingarchitect-wq.com/lernlandkarte/ro-taxonomy/index.html),
  [comparison with Germany](https://codingarchitect-wq.com/lernlandkarte/comparison-ro-de/index.html)

> **Research prototype.** Both taxonomies were written with AI assistance from the official
> standards and curricula. No teacher or education ministry has reviewed them. See the
> limitations of the [German](de-taxonomy/README.md#limitations) and the
> [Romanian](ro-taxonomy/README.md#limitations) taxonomy.

| | Germany | Romania |
|---|---|---|
| Topics | 2,225, Vorschule to Klasse 13 (Gymnasium from Klasse 7, G9 numbering) | 2,075, clasa pregătitoare to clasa a XII-a (theoretical liceu, four specialisations) |
| Prerequisite links | 4,513 | 3,847 |
| Subjects | 18 (12 core, 6 extended) | 20 (12 core, 8 extended) |
| Curriculum sources | 107 (KMK, EPA, GDSU, GI and the curricula of NRW, Bayern, Baden-Württemberg and Berlin-Brandenburg) | 88 national *programe școlare* (2013–2026) |
| Crosswalk | 2,133 links to os-taxonomy | 2,909 links to the German taxonomy |

## What's in the repo

| Folder | What it holds |
|---|---|
| [`de-taxonomy/`](de-taxonomy/README.md) | The German taxonomy (authoring files, built data, schemas) and the scripts that build, check and display it, including the 3D map of all three taxonomies |
| [`ro-taxonomy/`](ro-taxonomy/README.md) | The Romanian taxonomy, on the same model, with its own scripts |
| [`comparison/`](comparison/README.md) | German vs os-taxonomy: coverage, timing by age and school stage, structure |
| [`comparison-ro-de/`](comparison-ro-de/README.md) | Romanian vs German: coverage both ways, timing, prerequisite order, structure |
| [`reviews/`](reviews/os-taxonomy-review.md) | A review of os-taxonomy |
| `os-taxonomy/` | Marble's os-taxonomy as a git submodule, pinned to the version the crosswalk was built against |
| [`todo.md`](todo.md) | The brief the project started from |

## Getting started

Needs Node 20 or later; there is nothing to install.

```bash
git clone --recurse-submodules https://github.com/codingarchitect-wq/lernlandkarte.git
cd lernlandkarte/de-taxonomy && npm run all     # German taxonomy, browser, os comparison
cd ../ro-taxonomy && npm run all                # Romanian taxonomy, browser, comparison with Germany
cd ../de-taxonomy && npm run graph              # 3D map with all three taxonomies
```

If you cloned without `--recurse-submodules`, run `git submodule update --init` first.
The build checks the data and writes pages that work offline. The start page,
[`index.html`](index.html), links to all of them:

| Page | What it shows |
|---|---|
| `de-taxonomy/index.html` | The German taxonomy browser: a curriculum map per subject, all topics, learning paths, parent summaries, sources |
| `ro-taxonomy/index.html` | The same for the Romanian taxonomy, with each liceu topic's specialisations |
| `de-taxonomy/graph.html` | A rotating 3D map of every topic and prerequisite, German, Romanian and os-taxonomy on the same age scale |
| `comparison/index.html` | German vs os-taxonomy, including when German children meet an idea compared with England, the US and Australia |
| `comparison-ro-de/index.html` | Romanian vs German, including when Romanian children meet an idea compared with German children |

Every page can be read in English, German or Romanian (the language switch at the top, or
`?lang=en`, `?lang=de`, `?lang=ro`): the interface and all texts, including descriptions,
mastery signs, parent questions, notes, prerequisite reasons and parent summaries. The
German browser opens in German, the Romanian one in Romanian, the comparisons in English.
The texts were written in English; the German and Romanian versions are AI translations.
os-taxonomy's own topics stay in English.

The pages aren't committed: each build rewrites them in full. Instead, a GitHub Actions
workflow ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) runs the same
builds and checks on every push to `main` and publishes the pages online. If a check
fails, nothing is published. On every page, the **Core only** switch hides the second
foreign languages, Latin, the arts, sport, religion and, in Romania, technology and personal
development.

## Licence

The licences match os-taxonomy's, plus MIT for the code.

| Layer | Licence |
|---|---|
| **Code**: the build, check, validate and comparison scripts and the page templates (`de-taxonomy/scripts/`, `de-taxonomy/tools/`, `ro-taxonomy/scripts/`, `ro-taxonomy/tools/`) | [MIT](LICENSE-CODE) |
| **The databases**: the collection, structure, IDs, topic↔topic, topic↔standard, topic↔os-taxonomy and Romanian↔German relationships, the schemas, and the comparison results (`*/data/`, `*/authoring/`, `*/schema/`, `*/reports/`, `comparison*/*.json`, `comparison*/generated-tables.md`) | [ODbL 1.0](LICENSE) |
| **The text written for this project**: topic names, descriptions, evidence and assessment prompts, dependency reasons, cluster summaries, the paraphrased standard titles, the documentation, the review and the screenshots | [CC BY-SA 4.0](LICENSE-CONTENT) |
| **Curriculum documents** (KMK, Länder, GDSU, GI, the Romanian Ministry of Education and others) | Not included. The catalogues hold codes, short paraphrases and links; the documents stay under their publishers' terms. See the [German](de-taxonomy/PROVENANCE.md) and [Romanian](ro-taxonomy/PROVENANCE.md) provenance notes. |
| **os-taxonomy** (`os-taxonomy/`, a submodule) | Marble's own licences: ODbL 1.0 and CC BY-SA 4.0 |

ODbL and CC BY-SA are share-alike: if you change or extend the taxonomies and share the
result, it must stay under the same licences. Using them inside a product or a model
doesn't oblige you to open that product.

The German crosswalk and the German comparison are built from os-taxonomy data, and both
taxonomies use its data model. The built pages combine the code with the data, and
`graph.html` and the German comparison explorer also contain os-taxonomy topics. When you
share any of these, credit both:

> Lernlandkarte · German and Romanian curriculum taxonomies · © 2026 Alexandru Prian ·
> https://github.com/codingarchitect-wq/lernlandkarte · ODbL 1.0 (database) and CC BY-SA 4.0 (content)

> Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com ·
> licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).

Lernlandkarte is an independent project, not affiliated with or endorsed by Marble.
