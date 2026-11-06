# German Curriculum Taxonomy — authoring format

This taxonomy mirrors the data model of the Marble `os-taxonomy` (sibling folder
`../os-taxonomy`): fine-grained **micro-topics** (graph nodes) with plain-language
descriptions, 3 mastery **evidence** items, a topic **type**, subject + domain, an
age range, an **assessmentPrompt**, links to **curriculum standards**, and a
**prerequisite DAG** (hard/soft edges with a one-line reason). It is tailored to the
German school system and adds German-specific fields.

Authors write one file per subject group in `authoring/<group>.json`. A build step
(`node tools/build.mjs`) merges all files, assigns stable IDs (`de_` + hash of key),
derives ages from grades and writes `data/*.json`.

## Scope

* **Klassen 1–6** (Primarstufe Klasse 1–4 + Orientierungsstufe / Sek I Klasse 5–6),
  plus a few **Vorschule/Kita precursor** topics (grade `0`).
* **Gymnasium Klasse 7–13** (Sek I Klasse 7–10 + Gymnasiale Oberstufe 11–13), added in
  `de-v2` in files named `authoring/gym-<group>.json`. See *Gymnasium extension* below.
* Ages are derived: `ageRangeStart = gradeStart + 5`, `ageRangeEnd = gradeEnd + 6`.
  (Klasse 1 ≈ age 6–7; Klasse 4 ≈ 9–10; Klasse 6 ≈ 11–12; Klasse 10 ≈ 15–16; Klasse 13 ≈ 18–19; grade 0 ≈ 5–6.)
* Germany has 16 Länder curricula. Grade placement should reflect the **typical /
  majority placement**, anchored on the KMK Bildungsstandards (binding for all
  Länder; end of Klasse 4, ESA Kl. 9, MSA Kl. 10) and checked against the large
  Länder: NRW (Lehrpläne Grundschule 2021, Kernlehrpläne Sek I), Bayern
  (LehrplanPLUS), Baden-Württemberg (Bildungsplan 2016), Berlin-Brandenburg
  (Rahmenlehrplan 1–10), Niedersachsen (Kerncurricula). Record notable variation
  in `laenderNotes` (e.g. "Englisch starts Kl. 1 in some Länder, Kl. 3 in most").

## File shape

```jsonc
{
  "group": "mathematik",                 // file slug
  "subjects": [                          // subjects authored in this file
    { "name": "Mathematik", "nameEn": "Mathematics", "grades": [1, 6],
      "description": "1–2 sentences on the subject's place in the German system" }
  ],
  "domains": [                           // German domain names (KMK/Lehrplan terms)
    { "subject": "Mathematik", "name": "Zahl und Operation", "nameEn": "Number and Operations",
      "basis": "KMK Leitidee 'Zahl und Operation' (2022)" }
  ],
  "sources": [ /* curriculum catalogue entries you created — see below */ ],
  "topics":  [ /* see below */ ],
  "clusters": [ /* parent-friendly summaries — see below */ ]
}
```

### Topic

```jsonc
{
  "key": "ma-zo-zahlraum-20",            // REQUIRED unique, lowercase kebab, subject prefix
  "type": "CONCEPTUAL",                  // CONCEPTUAL | PROCEDURAL | REPRESENTATIONAL | LANGUAGE | META
  "subject": "Mathematik",
  "domain": "Zahl und Operation",        // must be one of this file's domains for that subject
  "name": "Numbers up to 20",            // English, short (2–6 words), Title-ish case
  "nameDe": "Zahlenraum bis 20",         // German term a German teacher/parent would use
  "description": "English, 1–3 sentences: the single teachable idea, with German context where relevant.",
  "evidence": [                          // EXACTLY 3 observable mastery criteria (English)
    "Count forwards and backwards within 20 from any starting number",
    "...", "..."
  ],
  "assessmentPrompt": "If {{name}} ... , can they ...?",   // English, contains {{name}}
  "gradeStart": 1, "gradeEnd": 1,        // Jahrgangsstufe 0–13 (0 = Vorschule/Kita precursor; G9 numbering)
  "courseLevel": "gA",                   // ONLY for gradeStart 11–13: "gA" (all courses) or "eA" (Leistungskurs only)
  "standards": ["kmk-bista-primar-mathematik-2022:ZO.1.3"],  // catalogue keys "<slug>:<code>"
  "prerequisites": [                     // keys from YOUR file or from the Klasse 0–6 base files (see below)
    { "key": "ma-zo-zaehlen-10", "strength": "hard", "reason": "One line why" }
  ],
  "externalPrerequisites": [             // prerequisites from OTHER subjects (resolved later)
    { "subject": "Deutsch", "concept": "reading simple sentences", "strength": "soft", "reason": "..." }
  ],
  "osMatches": [                         // closest os-taxonomy topics (0–4); [] = no counterpart
    { "id": "mt_xxxxxxxxxx", "relation": "close", "note": "optional: what differs" }
  ],
  "germanSpecific": false,               // true if the knowledge/skill is specific to Germany / German language
  "laenderNotes": "optional: notable Länder variation"
}
```

**Granularity.** One topic = one teachable, assessable idea (like os-taxonomy:
"Building sentences", "Apparent brightness of stars"). Don't bundle a whole
Lernbereich into one topic; don't create difficulty tiers of the same idea
(os-taxonomy has many "(age 8+)" duplicates — avoid that). If the same idea is
revisited in a later grade with genuinely new mastery (e.g. Zahlenraum bis 100 vs
bis 1000), that is a separate topic.

**Types.** CONCEPTUAL = understanding; PROCEDURAL = executable skill/strategy;
REPRESENTATIONAL = using/reading a representation (Rechenstrich, Karte, Diagramm,
Notenschrift); LANGUAGE = subject vocabulary/terminology; META = learning,
reflection, process competences (e.g. KMK prozessbezogene Kompetenzen).

**Prerequisites.** `hard` = cannot meaningfully learn the topic without it;
`soft` = supports/helps. Keep the graph acyclic; a prerequisite must not start in a
later grade than the dependent topic (equal grade is fine). Aim for 1–4
prerequisites per topic; only a handful of root topics should have none.

### osMatches — the crosswalk to os-taxonomy

Find candidates with the search tool (BM25 over os-taxonomy name/description/evidence):

```bash
node tools/os-candidates.mjs --query "count objects to 20 one-to-one" --subjects Mathematics --k 8
node tools/os-candidates.mjs --file authoring/mathematik.json --subjects Mathematics,"Life Skills" --k 6 > /tmp/cands.txt
```

Then judge each candidate. Relations (from the German topic's point of view):

| relation | meaning |
|---|---|
| `exact`   | Same concept and essentially the same mastery claim |
| `close`   | Same core concept; scope, context or examples differ (e.g. Euro vs £, German vs English spelling of the same principle) |
| `broader` | The os topic is broader; the German topic is one part of it |
| `narrower`| The os topic covers only a part of the German topic |
| `related` | Adjacent idea worth linking, but not coverage of the same skill |

Use `[]` when os-taxonomy has nothing comparable (e.g. Groß-/Kleinschreibung of
nouns, Kasus, Radfahrausbildung, Musik, Sport). Don't force matches — honest gaps
are a key result of the comparison. Prefer 1–3 high-quality matches.

### Sources / curriculum catalogue

Use these **pre-agreed code schemes** so that codes are consistent across files
(write the catalogue entries for the sources your file owns):

| slug | owner file | code scheme |
|---|---|---|
| `kmk-bista-primar-mathematik-2022` | mathematik | `P.<n>` process competence bullet: `ARG.1` (argumentieren), `KOM.n`, `PRO.n` (Probleme lösen), `MOD.n`, `DAR.n`, `OBJ.n` (mit Objekten & Werkzeugen); content: `ZO.<section>.<bullet>` (Zahl und Operation: 1 Zahldarstellungen…, 2 Rechenoperationen…, 3 …in Kontexten), `GM.<s>.<b>` (Größen und Messen), `MS.<s>.<b>` (Muster, Strukturen, funktionaler Zusammenhang), `RF.<s>.<b>` (Raum und Form), `DZ.<s>.<b>` (Daten und Zufall). Sections and bullets numbered in document order from 1. |
| `kmk-bista-msa-mathematik-2022` | mathematik | same Leitidee prefixes (`ZO`, `GM`, `MS`/`FZ` as in document, `RF`, `DZ`) + `.<s>.<b>`; only include codes you actually use or that are relevant to Kl. 5–6 |
| `kmk-bista-primar-deutsch-2022` | deutsch | `SZ.<s>.<b>` Sprechen und Zuhören (1 Zu anderen sprechen, 2 Verstehend zuhören, 3 Mit anderen sprechen, 4 Vor anderen sprechen); `SC.<s>.<b>` Schreiben (1 Schreibfertigkeiten, 2 Orthografisch schreiben, 3 Texte planen, 4 Texte formulieren, 5 Texte überarbeiten); `LE.<s>.<b>` Lesen (1 Flüssig lesen, 2 Lesetechniken, 3 Leseverstehen, 4 Strategien); `TM.<s>.<b>` Sich mit Texten und anderen Medien auseinandersetzen (1 Textwissen, 2 Medienangebot, 3 Texte erschließen, 4 Digitale Formate, 5 Texte präsentieren); `SP.<s>.<b>` Sprache und Sprachgebrauch untersuchen (1 Verständigung als Handeln, 2 Mündlich/schriftlich, 3 Variation und Vielfalt, 4 Wörter und Sätze, 5 Texte und Gespräche, 6 Rechtschreibung, 7 Aussprache, 8 Ressourcen) |
| `kmk-bista-msa-deutsch-2022` | deutsch | analogous prefixes as in the ESA/MSA document; only codes relevant to Kl. 5–6 |
| `kmk-bista-fremdsprache-2023` | englisch-informatik | analogous scheme for the ESA/MSA first foreign language document; only codes relevant to Kl. 5–6 |
| `kmk-digitale-welt-2016` | englisch-informatik | official numbering of the KMK competence framework at sub-area level: `1.1` … `6.2` (e.g. `5.5` Algorithmen erkennen und formulieren). Any file may cite these. |
| `gi-informatik-primar-2019` | englisch-informatik | GI "Kompetenzen für informatische Bildung im Primarbereich" — define a clear scheme (content areas × process areas) |
| `gdsu-perspektivrahmen-2013` | sachunterricht | `<PERSP>-DAH<n>` / `<PERSP>-TB<n>` with PERSP ∈ `SOWI`, `NAWI`, `GEO`, `HIS`, `TECH`, `VN` (perspektivenvernetzende Themenbereiche), `PU` (perspektivenübergreifende DAH) — verify numbering against the framework or reliable secondary sources |
| Länder curricula | the file that cites them | slug like `rlp-bb-2017-musik`, `lehrplanplus-by-gs-2014-sport`, `nrw-lp-gs-2021-sachunterricht`; define a transparent code scheme, document it in the source `notes` |

Catalogue entry:

```jsonc
{
  "slug": "kmk-bista-primar-mathematik-2022",
  "country": "DE",
  "region": null,                          // or "Berlin/Brandenburg", "Bayern", "Nordrhein-Westfalen" ...
  "name": "KMK Bildungsstandards für das Fach Mathematik – Primarbereich",
  "version": "Beschluss 15.10.2004 i.d.F. vom 23.06.2022",
  "sourceUrl": "https://www.kmk.org/...pdf",
  "level": "Ende Jahrgangsstufe 4",
  "textIncluded": false,
  "notes": "Codes are constructed by this project in document order; titles are short paraphrases, not official text.",
  "standards": [
    { "code": "ZO.1.1", "area": "Zahl und Operation › Zahldarstellungen und Zahlbeziehungen verstehen",
      "titleDe": "Dezimales Stellenwertsystem verstehen und nutzen (Bündelung, Stellenwert)",
      "titleEn": "Understand and use the decimal place-value system", "grades": "4" }
  ]
}
```

**Text policy.** Do not copy long verbatim passages from KMK/Länder/GDSU
documents. `titleDe`/`titleEn` are short paraphrases (≤ ~15 words). Topic
descriptions are your own words.

### Clusters (parent-friendly summaries)

One per (subject, domain, grade band) where the band is `1` (Kl. 1–2), `3` (Kl. 3–4),
`5` (Kl. 5–6), `7` (Kl. 7–8), `9` (Kl. 9–10) or `11` (Oberstufe Kl. 11–13), `0` for
precursor material. Never add a cluster that another file already has (the checker
rejects it); for the Oberstufe band address the student's parents as well
("Your teenager…" / "Ihr Kind…" are both fine):

```json
{ "subject": "Mathematik", "domain": "Zahl und Operation", "gradeStart": 1,
  "summary": "English, 1–2 sentences addressed to a parent: 'Your child is learning…'",
  "summaryDe": "German version: 'Ihr Kind lernt…'" }
```

## Gymnasium extension (Klasse 7–13)

**Track and numbering.** Klasse 7–13 topics describe the **Gymnasium** track. Use
**G9 numbering** (Abitur after Klasse 13), which most Länder use again (Bayern, NRW,
Niedersachsen, Hessen, Schleswig-Holstein, Baden-Württemberg from 2025/26, …): Sek I
Klasse 5–10, Oberstufe Klasse 11 = Einführungsphase (E-Phase/11), 12–13 =
Qualifikationsphase (Q1/Q2). In G8 Länder (e.g. Berlin, Brandenburg, Sachsen,
Thüringen, Hamburg) everything from Klasse 7 on happens about a year earlier and the
E-Phase is Klasse 10. Say so in `laenderNotes` only where it matters for a topic.
Verify the current G8/G9 status of a Land before citing it.

**Oberstufe course level.** Every topic with `gradeStart` 11–13 carries `courseLevel`:
`"gA"` (grundlegendes Anforderungsniveau: part of every course, Grundkurs) or `"eA"`
(erhöhtes Anforderungsniveau: Leistungskurs only), following the KMK Abitur standards
or EPA. Topics starting earlier have no `courseLevel`.

**Prerequisites across files.** `prerequisites[].key` may name a key from your own
file **or from one of the Klasse 0–6 base files** (`deutsch`, `englisch-informatik`,
`mathematik`, `musik-kunst-sport-ethik`, `sachunterricht`, `sek1-gesellschaft-natur`).
Look keys up in those files (e.g. the Kl. 5–6 Mathematik or Naturwissenschaften topics
your Kl. 7 topics build on); connect your earliest topics to them so the graph flows
from primary school to the Abitur. For topics that live in **other new `gym-*` files**
(being written in parallel), use `externalPrerequisites` with a precise `concept`
phrase (e.g. `{ "subject": "Mathematik", "concept": "linear functions and their graphs" }`);
they are resolved after merging. Never edit the base files.

**Subjects and key prefixes.** Keep existing subject and domain names where content
continues (copy the domain declaration verbatim from the base file, then add new
domains). Existing: Mathematik `ma-`, Deutsch `de-`, Englisch `en-`, Informatik &
Medienbildung `in-`, Geschichte `ge-`, Erdkunde `ek-`, Politik und Wirtschaft `po-`,
Musik `mu-`, Kunst `ku-`, Sport `sp-`, Religion & Ethik `re-` (Philosophie in the
Oberstufe belongs here). New from Klasse 7 (Klasse 6 for second foreign languages):
Biologie `bi-`, Chemie `ch-`, Physik `ph-`, Französisch `fr-`, Latein `la-`. The
Kl. 5–6 subject "Naturwissenschaften" stays as it is; Biologie/Chemie/Physik build on
it. For a continuing subject, give the `subjects[]` entry a description covering the
subject from its first Klasse to the Abitur (the merged dataset uses the entry that
reaches the highest Klasse).

**Sources.** National references: KMK Bildungsstandards for the MSA (Deutsch,
Mathematik 2022; erste Fremdsprache 2023; Biologie/Chemie/Physik 2024 "WeBiS"), KMK
Bildungsstandards Allgemeine Hochschulreife (Deutsch, Mathematik, fortgeführte
Fremdsprache 2012; Biologie/Chemie/Physik 2020), and for other Abitur subjects the KMK
EPA (Einheitliche Prüfungsanforderungen). Grade placement: Länder Gymnasium curricula
(NRW Kernlehrpläne G9 Sek I and Sek II, Bayern LehrplanPLUS Gymnasium, Baden-Württemberg
Bildungsplan Gymnasium, Berlin-Brandenburg Rahmenlehrplan 1–10 and Sek II,
Niedersachsen Kerncurricula). Extending an existing slug (e.g.
`kmk-bista-msa-mathematik-2022`) is allowed: reuse its code scheme, add only codes
that are missing, never redefine an existing code. New slugs follow the existing
pattern (`kmk-bista-ahr-mathematik-2012`, `nrw-klp-g9-sii-physik`,
`lehrplanplus-by-gym-chemie`, …) and document their code scheme in `notes`.

**Granularity in the Oberstufe.** Still one teachable, assessable idea per topic
("Ableitungsregeln: Produkt- und Kettenregel", "Hardy-Weinberg-Gleichgewicht",
"Epochenumbruch 1789"), not whole Kurshalbjahre.

## Self-check before finishing

```bash
node tools/check-authoring.mjs authoring/<group>.json
```

It validates required fields, unique keys, prerequisite resolution, acyclicity,
grade order, evidence count, `{{name}}` placeholders, osMatch IDs and standard
keys against the sources you define (and the shared slugs above). Fix every error;
review the warnings.
