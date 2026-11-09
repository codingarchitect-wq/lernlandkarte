# Provenance & source policy

## What is original here

Topics (names, German names, descriptions, evidence, assessment prompts),
prerequisite edges and their reasons, cluster summaries, the crosswalk to
os-taxonomy and the analysis were authored for this project, with AI assistance,
from the sources below. The texts were written in English (names and parent summaries also in
German); their German and Romanian versions, and the Romanian names, are AI translations of
the English. They are a **research prototype** and have not been
reviewed by German teachers or Länder authorities.

## Curriculum sources (`data/curriculum-standards.json`)

Every catalogue entry has `textIncluded: false`. Codes were **constructed by this
project in document order** (for example `ZO.2.3` is the third bullet in the
second section of the KMK Leitidee *Zahl und Operation*). The exceptions use the
document's official numbering, for example the KMK digital-world framework, the
competence codes of the 2024 KMK science standards and the Bayern Lernbereiche. `titleDe` and
`titleEn` are short **paraphrases**, not official wording. Follow `sourceUrl` for
the authoritative text and its terms of use.

| Source | Publisher | Binding? | Used for |
|---|---|---|---|
| Bildungsstandards Mathematik / Deutsch, Primarbereich (Beschluss 15.10.2004 i.d.F. 23.06.2022) | Kultusministerkonferenz (KMK), developed with IQB | Yes: normative reference for all 16 Länder (end of Klasse 4) | Mathematik, Deutsch domains and standards |
| Bildungsstandards Mathematik / Deutsch, ESA/MSA (2022) | KMK | Yes: end of Klasse 9/10 | Klasse 5–6 orientation |
| Bildungsstandards erste Fremdsprache (Englisch/Französisch), ESA/MSA (2023) | KMK | Yes: end of Klasse 9/10 | Englisch, Klasse 5–6 orientation |
| Strategie „Bildung in der digitalen Welt" (2016, i.d.F. 2017) | KMK | Agreed framework of competences | Informatik & Medienbildung (cross-curricular) |
| Kompetenzen für informatische Bildung im Primarbereich (2019) | Gesellschaft für Informatik (GI) | Recommendation | Informatik, Klassen 1–4 |
| Perspektivrahmen Sachunterricht (2013) | Gesellschaft für Didaktik des Sachunterrichts (GDSU), Klinkhardt | Professional framework that Länder curricula build on | Sachunterricht perspectives and themes |
| Empfehlung zur Mobilitäts- und Verkehrserziehung in der Schule (1972 i.d.F. 2012) | KMK | Recommendation | Road safety and the cycling test (Sachunterricht) |
| Deutsche Prüfungsordnung Schwimmen (2020) | DLRG/DSV and partners | Badge rules | Seepferdchen and Bronze swimming badges (Sport) |
| Länder curricula (e.g. NRW Lehrpläne Grundschule 2021, Bayern LehrplanPLUS, Berlin-Brandenburg Rahmenlehrplan 1–10, Baden-Württemberg Bildungsplan 2016) | Ministries of the Länder | Yes, within each Land | Grade placement; subjects without KMK standards (Sachunterricht, Englisch in the Grundschule, Musik, Kunst, Sport, Religion/Ethik, Klasse 5–6 science and social subjects) |

### Added for the Gymnasium extension (`de-v2`, Klasse 7–13)

| Source | Publisher | Binding? | Used for |
|---|---|---|---|
| Bildungsstandards Biologie, Chemie, Physik für den MSA (weiterentwickelte Bildungsstandards "WeBiS", i.d.F. 13.06.2024) | KMK | Yes: end of Klasse 10 | Biologie, Chemie, Physik Klasse 7–10 |
| Bildungsstandards für die Allgemeine Hochschulreife: Deutsch, Mathematik, fortgeführte Fremdsprache Englisch/Französisch (18.10.2012); Biologie, Chemie, Physik (18.06.2020) | KMK | Yes: Abitur | Oberstufe content and the gA/eA course levels |
| Einheitliche Prüfungsanforderungen in der Abiturprüfung (EPA): Geschichte, Geographie, Sozialkunde/Politik, Wirtschaft, Informatik, Latein, Musik, Kunst, Sport, Ethik, Philosophie, ev. and kath. Religionslehre (2004–2017 versions) | KMK | Yes: Abitur examinations | Oberstufe content and course levels for subjects without Abitur Bildungsstandards |
| Vereinbarung über das Latinum und das Graecum (2005) | KMK | Yes | Latein |
| Bildungsstandards Informatik Sek I (2008, replaced by 2025) and Sek II (2016) | Gesellschaft für Informatik (GI) | Recommendation | Informatik Klasse 7–13 |
| NRW Kernlehrpläne Gymnasium G9 Sek I (2019) and Sek II (2022–2026, the newest in force from 01.08.2027) | Ministerium für Schule und Bildung NRW | Yes, in NRW | Grade placement; Grund-/Leistungskurs content |
| Bayern LehrplanPLUS Gymnasium (G9, Jahrgangsstufen 5–13) | ISB / Bayerisches Staatsministerium | Yes, in Bayern | Grade placement; gA/eA in Jgst. 12–13 |
| Baden-Württemberg Bildungsplan 2016 Gymnasium (G8) and the G9 versions V3.0 (2026) where published | Kultusministerium BW | Yes, in BW | Grade placement (noted as G8 where it applies) |
| Berlin-Brandenburg Rahmenlehrplan 1–10, Teil C (Biologie, Chemie, Geografie, Geschichte, Politische Bildung) | LISUM | Yes, in Berlin/Brandenburg | Grade placement (G8 Gymnasium) |

The new sources are 23 KMK documents, 3 GI recommendations, 22 NRW, 16 Bayern, 8
Baden-Württemberg and 5 Berlin-Brandenburg curricula. Niedersachsen's Kerncurricula
were consulted in places but are not cited as sources: the official portal could not
be read. Where the authoring passes could not open or verify a document, they said so
in the source's `notes`.

See each catalogue entry's `notes` for its exact URL, version and code scheme.

## Relationship to os-taxonomy

The data model mirrors the [Marble Skill Taxonomy](https://github.com/withmarbleapp/os-taxonomy)
(ODbL 1.0 database / CC BY-SA 4.0 content, © Generative Spark, Inc.). The
crosswalk file references os-taxonomy topic IDs, and the comparison is built from
os-taxonomy data. This dataset is therefore published under the same licences, ODbL 1.0
for the database and CC BY-SA 4.0 for the content (see the
[top-level README](../README.md#licence)), and carries the os-taxonomy attribution:

> Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).
