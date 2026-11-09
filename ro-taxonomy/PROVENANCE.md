# Provenance & source policy

## What is original here

Topics (English and Romanian names, descriptions, evidence, assessment prompts; the Romanian
and German versions of the descriptions, evidence, prompts, notes and prerequisite reasons, the
German names, and the German versions of the parent summaries, standard titles and crosswalk
notes are translations of the English made with AI assistance),
prerequisite edges and their reasons, cluster summaries, the crosswalk to the German
taxonomy and the comparison were authored for this project, with AI assistance, from the
sources below. They are a **research prototype** and have not been reviewed by Romanian
teachers or by the Ministry of Education.

## Curriculum sources (`data/curriculum-standards.json`)

Romania has one national curriculum: the *programe școlare* for each subject, approved by
order of the Minister of Education, and the *planuri-cadru* that set the weekly hours.
Every catalogue entry has `textIncluded: false`. Codes follow the **official numbering of
each programme's competențe specifice**, prefixed with the grade (`V.1.2` is competence 1.2
of clasa a V-a; `CP` = clasa pregătitoare). Where a programme lists one set of competences
for several grades, the code uses the first grade and `grades` names the span. `titleRo`
and `titleEn` are short **paraphrases**, not official wording. Each entry's `notes` record
the order, the copy that was read and its status (approved text or consultation draft).

| School years | Programmes | Approved by | Status in 2026 |
|---|---|---|---|
| Clasa pregătitoare – II | Comunicare în limba română, Matematică și explorarea mediului, Limba modernă, Dezvoltare personală, Muzică și mișcare, Arte vizuale și abilități practice, Educație fizică, Religie (ortodoxă) | OMEN 3418/19.03.2013 | In force |
| III–IV | Limba și literatura română, Matematică, Științe ale naturii, Educație civică, Limba modernă, Muzică și mișcare, Arte vizuale și abilități practice, Educație fizică; Istorie and Geografie (IV); Religie ortodoxă | OMEN 5003/02.12.2014; Religie OMEN 5001/2014 | In force |
| V–VIII | All gimnaziu subjects, including Limba latină și cultura romanică (VII), Informatică și TIC, Educație socială, Consiliere și dezvoltare personală | OMEN 3393/28.02.2017 | In force; a review is announced for after the liceu reform |
| VIII (exam) | Evaluarea Națională, Matematică | OME 4.730/2022 | In force for EN 2026 |
| IX–XII | New liceu programmes for the four theoretical specialisations | OM 6.930/2025 (first set, mainly clasa a IX-a), OMEC 3.716/2026, and the X–XII sets of 2026 named in the source notes | Phased in: IX from 2026–2027, X 2027–28, XI 2028–29, XII 2029–30 |
| XI, XII | Istoria evreilor. Holocaustul; Istoria comunismului din România | OME 5.344/2023; OME 7.734/2024 | In force |
| XII (exam) | Bacalaureat 2030 subject programmes (used where a liceu programme text could not be obtained; they list the approved competences and contents) | Order named in the source notes | Approved |
| Weekly hours | Planuri-cadru: primar, gimnaziu, liceu (filiera teoretică, Anexele 2–5) | OMEN 3371/2013, OMENCS 3590/2016, OMEC 4.350/2025 | In force |

**Where the texts came from.** The official host of the programmes, rocnee.eu, blocks
automated downloads, and its predecessor programe.ise.ro is offline. The authoring passes
did not try to get around that. They read the same annexes from other public copies and
checked each copy's first page ("Anexa nr. … la ordinul ministrului … nr. …"):

| Copies | Used for |
|---|---|
| County school inspectorates (ISJ Suceava, Vaslui, Bacău, Vrancea) and edums.ro | Most primary and gimnaziu programmes |
| web.archive.org captures of programe.ise.ro | Modern languages, Latin, Informatică și TIC (V–VIII) |
| edu.ro (Ministry of Education) | Liceu framework plans; liceu programmes in public consultation (November 2025, May 2026) |
| edupedu.ro copies of the Monitorul Oficial annexes, alba24.ro | Approved liceu programmes and the Bacalaureat 2030 programmes |
| Teacher-resource sites: academiaabc.ro, e-religie.ro, lego.rdsor.ro, media.hotnews.ro | A few primary and gimnaziu programmes (arts, PE, music, religion, biology, chemistry) where no ISJ copy was found |

**Liceu caveat.** The liceu programmes were being approved while this taxonomy was written.
For some subjects and grades only the consultation draft or the Bacalaureat programme could
be read, not the approved programme itself; the source `notes` say so. Wording and grade
placement may differ in detail from the approved texts, and for X–XII it describes
programmes that schools will only start using between 2027 and 2029.

## Relationship to the German taxonomy and os-taxonomy

The data model is the German taxonomy's (`../de-taxonomy`), which mirrors the
[Marble Skill Taxonomy](https://github.com/withmarbleapp/os-taxonomy). The crosswalk
(`data/crosswalk-de-taxonomy.json`) links Romanian topics to German topic keys. The Romanian
taxonomy contains no os-taxonomy data. Licences and attribution are in the
[top-level README](../README.md#licence):

> Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).
