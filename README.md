# Lernlandkarte

A graph of what children learn at German schools, from Vorschule to the Abitur. Every
topic says which school year it starts in and which topics a child needs first. It uses
the data model of Marble's [os-taxonomy](https://github.com/withmarbleapp/os-taxonomy),
and the [comparison](comparison/README.md) shows where the two agree and differ.

*Lernlandkarte* is German for "learning map".

> **Research prototype.** It was written with AI assistance from the KMK educational
> standards and Länder curricula. No German teacher or Land has reviewed it. See the
> [limitations](de-taxonomy/README.md#limitations).

| | |
|---|---|
| Topics | 2,225, Vorschule to Klasse 13 (Gymnasium from Klasse 7, G9 numbering) |
| Prerequisite links | 4,513 |
| Subjects | 18 (12 core, 6 extended) |
| Curriculum sources | 107 (KMK, EPA, GDSU, GI and the curricula of NRW, Bayern, Baden-Württemberg and Berlin-Brandenburg) |
| Links to os-taxonomy | 2,133 |

## What's in the repo

| Folder | What it holds |
|---|---|
| [`de-taxonomy/`](de-taxonomy/README.md) | The German taxonomy (authoring files, built data, schemas) and the scripts that build, check and display it |
| [`comparison/`](comparison/README.md) | The comparison with os-taxonomy: coverage, timing by age and school stage, structure |
| [`reviews/`](reviews/os-taxonomy-review.md) | A review of os-taxonomy |
| `os-taxonomy/` | Marble's os-taxonomy as a git submodule, pinned to the version the crosswalk was built against |
| [`todo.md`](todo.md) | The brief the project started from |

## Getting started

Needs Node 20 or later; there is nothing to install.

```bash
git clone --recurse-submodules https://github.com/codingarchitect-wq/lernlandkarte.git
cd lernlandkarte/de-taxonomy
npm run all
```

If you cloned without `--recurse-submodules`, run `git submodule update --init` first.
The build checks the data and writes three pages that work offline:

| Page | What it shows |
|---|---|
| `de-taxonomy/index.html` | The taxonomy browser: a curriculum map per subject, all topics, learning paths, parent summaries, sources |
| `de-taxonomy/graph.html` | A rotating 3D map of every topic and prerequisite, German and os-taxonomy on the same age scale |
| `comparison/index.html` | The comparison explorer, including when German children meet an idea compared with England, the US and Australia |

The pages aren't committed: each build rewrites them in full. On every page, the
**Core only** switch hides Französisch, Latein, Musik, Kunst, Sport and Religion & Ethik.

## Licence

The licences match os-taxonomy's, plus MIT for the code.

| Layer | Licence |
|---|---|
| **Code**: the build, check, validate and comparison scripts and the page templates (`de-taxonomy/scripts/`, `de-taxonomy/tools/`) | [MIT](LICENSE-CODE) |
| **The database**: the collection, structure, IDs, topic↔topic, topic↔standard and topic↔os-taxonomy relationships, the schemas, and the comparison results (`de-taxonomy/data/`, `authoring/`, `schema/`, `reports/`, `comparison/*.json`, `comparison/generated-tables.md`) | [ODbL 1.0](LICENSE) |
| **The text written for this project**: topic names, descriptions, evidence and assessment prompts, dependency reasons, cluster summaries, the paraphrased standard titles, the documentation, the review and the screenshot | [CC BY-SA 4.0](LICENSE-CONTENT) |
| **Curriculum documents** (KMK, Länder, GDSU, GI and others) | Not included. The catalogue holds codes, short paraphrases and links; the documents stay under their publishers' terms. See [PROVENANCE.md](de-taxonomy/PROVENANCE.md). |
| **os-taxonomy** (`os-taxonomy/`, a submodule) | Marble's own licences: ODbL 1.0 and CC BY-SA 4.0 |

ODbL and CC BY-SA are share-alike: if you change or extend the taxonomy and share the
result, it must stay under the same licences. Using it inside a product or a model
doesn't oblige you to open that product.

The crosswalk and the comparison are built from os-taxonomy data. The built pages
combine the code with the data, and `graph.html` and the comparison explorer also contain
os-taxonomy topics. When you share any of these, credit both:

> Lernlandkarte · German curriculum taxonomy · © 2026 Alexandru Prian ·
> https://github.com/codingarchitect-wq/lernlandkarte · ODbL 1.0 (database) and CC BY-SA 4.0 (content)

> Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com ·
> licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).

Lernlandkarte is an independent project, not affiliated with or endorsed by Marble.
