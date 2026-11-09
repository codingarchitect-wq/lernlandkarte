# Romanian Curriculum Taxonomy — authoring format

This taxonomy uses the data model of the German taxonomy in `../de-taxonomy` (itself modelled
on Marble's os-taxonomy): fine-grained **micro-topics** (graph nodes) with plain-language
descriptions, 3 mastery **evidence** items, a topic **type**, subject + domain, a grade range,
an **assessmentPrompt**, links to **curriculum standards** and a **prerequisite DAG**
(hard/soft edges with a one-line reason). It adds Romanian-specific fields and a crosswalk to
the German taxonomy (`deMatches`).

Authors write one file per subject group in `authoring/<group>.json`. A build step merges all
files, assigns stable IDs (`ro_` + hash of key), derives ages from grades and writes `data/*.json`.

## Scope

* **Clasa pregătitoare to clasa a XII-a.** Grade numbers: `0` = clasa pregătitoare (CP),
  `1`–`12` = clasele I–XII. Cycles: învățământ primar CP–IV, gimnazial V–VIII (Evaluarea
  Națională at the end of VIII), liceal IX–XII (Bacalaureat).
* **Liceu = filiera teoretică**, the four specialisations: profil real — matematică-informatică
  (`MI`), științe ale naturii (`SN`); profil umanist — științe sociale (`SS`), filologie (`FIL`).
* Ages are derived: `ageRangeStart = gradeStart + 6`, `ageRangeEnd = gradeEnd + 7`
  (CP ≈ 6–7, clasa I ≈ 7–8, clasa a IV-a ≈ 10–11, clasa a VIII-a ≈ 14–15, clasa a XII-a ≈ 18–19).
* Romania has **one national curriculum**: the *programe școlare* approved by ministerial order,
  with weekly hours set by the *planuri-cadru*. There are no regional variants, so grade placement
  follows the programme. Use `notes` for real variation (e.g. a topic taught only in CDȘ/CDEOȘ
  optionals, textbook differences, the transition between old and new liceu programmes).
* **Liceu transition.** New framework plans (OMEC 4.350/2025) and new programmes (OM 6.930/2025,
  OMEC 3.716/2026, more to follow) apply from clasa a IX-a in 2026–2027, X in 2027–28, XI in
  2028–29, XII in 2029–30. Use the **new programmes** wherever they exist (approved version, or the
  public-consultation version on edu.ro if the approved PDF can't be downloaded — say which in the
  source `notes`). Where a subject has no new programme for a grade yet, use the programme still in
  force for that grade (2004–2009 liceu programmes) or the published *proiecție curriculară*, and
  say so in `notes`.

## Subjects (fixed names, key prefixes and tiers)

Use exactly these subject names. One subject runs across cycles even when the programme's
title changes; note the official title per grade in the subject `description`.

| subject (`name`) | `nameEn` | prefix | tier | programmes it covers |
|---|---|---|---|---|
| Limba și literatura română | Romanian Language and Literature | `lr-` | core | Comunicare în limba română (CP–II), Limba și literatura română (III–XII) |
| Matematică | Mathematics | `ma-` | core | the mathematics part of Matematică și explorarea mediului (CP–II), Matematică (III–XII) |
| Științe ale naturii | Natural Sciences | `sn-` | core | the *explorarea mediului* part of MEM (CP–II), Științe ale naturii (III–IV) |
| Biologie | Biology | `bi-` | core | V–XII |
| Fizică | Physics | `fi-` | core | VI–XII |
| Chimie | Chemistry | `ch-` | core | VII–XII |
| Istorie | History | `is-` | core | IV–XII, incl. liceu *Istoria comunismului din România* (XII) and *Istoria evreilor. Holocaustul* (XI) |
| Geografie | Geography | `ge-` | core | IV–XII |
| Educație civică și socială | Civic and Social Education | `ec-` | core | Educație civică (III–IV), Educație socială (V–VIII) |
| Științe socio-umane | Social Sciences and Philosophy | `su-` | core | liceu: Logică (IX), Psihologie and Sociologie (X), Filosofie (XI), Economie și educație antreprenorială (XII) |
| Limba engleză | English | `en-` | core | Limba modernă 1, English (CP–XII) |
| Informatică și TIC | Computer Science and ICT | `in-` | core | Informatică și TIC (V–VIII), TIC (IX–XII), Informatică (CS for MI/SN) |
| Limba franceză | French | `fr-` | extended | Limba modernă 2, French (V–XII) |
| Limba latină | Latin | `la-` | extended | Limba latină și cultura romanică (VII), Limba latină (FIL, IX–XII) |
| Educație muzicală | Music | `mu-` | extended | Muzică și mișcare (CP–IV), Educație muzicală (V–XII) |
| Arte vizuale | Visual Arts | `av-` | extended | Arte vizuale și abilități practice (CP–IV, art part), Educație plastică (V–VIII), Educație vizuală (IX–XII) |
| Educație fizică și sport | Physical Education and Sport | `ef-` | extended | CP–XII |
| Religie | Religion | `re-` | extended | Religie (CP–XII); base it on the Orthodox programme (the majority denomination) and note others |
| Educație tehnologică | Technology Education | `et-` | extended | the *abilități practice* part of AVAP (CP–IV), Educație tehnologică și aplicații practice (V–VIII) |
| Dezvoltare personală și consiliere | Personal Development and Guidance | `dp-` | extended | Dezvoltare personală (CP–II), Consiliere și dezvoltare personală (V–VIII), Dezvoltare personală și consiliere în carieră (IX–XII) |

## File shape

```jsonc
{
  "group": "pg-matematica",              // file slug = file name without .json
  "subjects": [                          // subjects authored in this file
    { "name": "Matematică", "nameEn": "Mathematics", "grades": [0, 8],
      "description": "1–3 English sentences on the subject's place in the Romanian system (official titles per cycle, weekly hours)" }
  ],
  "domains": [                           // domains as the programme structures the subject
    { "subject": "Matematică", "name": "Numere și operații", "nameEn": "Numbers and Operations",
      "basis": "Programa Matematică V–VIII (2017): competența generală 2 / conținuturi 'Numere naturale'" }
  ],
  "sources": [ /* curriculum catalogue entries you created — see below */ ],
  "topics":  [ /* see below */ ],
  "clusters": [ /* parent-friendly summaries — see below */ ]
}
```

### Topic

```jsonc
{
  "key": "ma-nr-scaderea-cu-trecere",    // REQUIRED unique, lowercase kebab (ASCII, no diacritics), subject prefix
  "type": "PROCEDURAL",                  // CONCEPTUAL | PROCEDURAL | REPRESENTATIONAL | LANGUAGE | META
  "subject": "Matematică",
  "domain": "Numere și operații",        // one of this file's domains for that subject
  "name": "Subtraction with regrouping", // English, short (2–6 words)
  "nameRo": "Scăderea cu trecere peste ordin",  // Romanian term a Romanian teacher/parent would use
  "description": "English, 1–3 sentences: the single teachable idea, with Romanian context where relevant.",
  "evidence": ["...", "...", "..."],     // EXACTLY 3 observable mastery criteria (English)
  "assessmentPrompt": "If {{name}} ... , can they ...?",   // English, contains {{name}}
  "gradeStart": 2, "gradeEnd": 2,        // 0 = clasa pregătitoare … 12 = clasa a XII-a
  "profiles": ["MI", "SN"],              // ONLY for gradeStart 9–12: which theoretical specialisations teach it
  "standards": ["ro-mem-cp-ii-2013:II.2.4"],   // catalogue keys "<slug>:<code>"
  "prerequisites": [                     // keys from YOUR file (liceu files: also keys of the pg-* files)
    { "key": "ma-nr-adunarea-fara-trecere", "strength": "hard", "reason": "One line why" }
  ],
  "externalPrerequisites": [             // prerequisites from OTHER subjects/files (resolved after merging)
    { "subject": "Limba și literatura română", "concept": "reading short instructions", "strength": "soft", "reason": "..." }
  ],
  "deMatches": [                         // closest German taxonomy topics (0–4); [] = no counterpart
    { "key": "ma-zo-schriftliche-subtraktion", "relation": "close", "note": "optional: what differs" }
  ],
  "romaniaSpecific": false,              // true if the content is specific to Romania / the Romanian language
  "notes": "optional: variation, optional-only status, old vs new programme",
  // Romanian versions of the English texts (added by a translation pass, see below):
  "descriptionRo": "…", "evidenceRo": ["…", "…", "…"], "assessmentPromptRo": "Dacă … poate {{name}} să …?", "notesRo": "…"
  // and "reasonRo" next to each prerequisite's / externalPrerequisite's "reason"
}
```

**Romanian texts.** The browser shows the page in Romanian or English. Names (`nameRo`) and
cluster summaries (`summaryRo`) are written with the topic; the other texts are translated
afterwards into `descriptionRo`, `evidenceRo`, `assessmentPromptRo`, `notesRo` and `reasonRo`
(`tools/merge-translations.mjs` merges a translation file). In `assessmentPromptRo`, `{{name}}`
must stand where a nominative noun phrase fits, because the page replaces it with
„copilul dumneavoastră”. The checker requires the set to be complete once a topic has it.

**Profiles.** Topics in the *trunchi comun* (TC) of all four specialisations get
`["MI","SN","SS","FIL"]`. Content from a specialisation's *curriculum de specialitate* (CS), or
from a programme that only some specialisations follow (e.g. Matematică for MI differs from
Matematică for SN, SS/FIL), lists only those profiles. Read the framework plans (hours per
specialisation, Anexele 2–5 of OMEC 4.350/2025) to decide. Optional CDEOȘ content is not
in scope unless it is a national optional most schools run.

**Granularity.** One topic = one teachable, assessable idea ("Scăderea cu trecere peste ordin",
"Teorema lui Pitagora", "Opera epică: narațiunea"). Don't bundle a whole chapter into one topic;
don't create difficulty tiers of the same idea. A revisit with genuinely new mastery in a later
grade (numbers to 100 vs. to 1 000) is a separate topic.

**Types.** CONCEPTUAL = understanding; PROCEDURAL = executable skill/strategy;
REPRESENTATIONAL = using/reading a representation (axa numerelor, hartă, diagramă, portativ);
LANGUAGE = subject vocabulary/terminology; META = learning, reflection, process competences.

**Prerequisites.** `hard` = cannot meaningfully learn the topic without it; `soft` = supports it.
Keep the graph acyclic; a prerequisite must not start in a later grade than the dependent topic
(equal grade is fine). Aim for 1–4 prerequisites per topic; only a handful of root topics
(mostly in clasa pregătitoare) should have none.

* **pg-\*.json files** (CP–VIII) may only use keys of their own file. For other subjects, use
  `externalPrerequisites` with a precise `concept` phrase (e.g. `{ "subject": "Matematică",
  "concept": "reading bar charts" }`); these are resolved after merging.
* **liceu-\*.json files** (IX–XII) may also use keys of any pg-\*.json file directly: connect
  your earliest topics to the gimnaziu topics they build on, so the graph flows from clasa
  pregătitoare to the Bacalaureat. Use `externalPrerequisites` for subjects in other liceu files.

### deMatches — the crosswalk to the German taxonomy

The German taxonomy (`../de-taxonomy/data/topics.json`, 2,225 topics, Vorschule – Klasse 13,
Gymnasium from Klasse 7) is the comparison target. Find candidates with the search tool (BM25
over German topics' English name, German name, description and evidence):

```bash
node tools/de-candidates.mjs --query "subtraction with regrouping" --subjects Mathematik --k 8
node tools/de-candidates.mjs --file authoring/pg-matematica.json --subjects Mathematik --k 6 > /tmp/cands.txt
```

German subjects to search, per Romanian subject:

| Romanian subject | German subjects |
|---|---|
| Limba și literatura română | Deutsch |
| Matematică | Mathematik |
| Științe ale naturii | Sachunterricht, Naturwissenschaften |
| Biologie / Fizică / Chimie | Biologie / Physik / Chemie, plus Naturwissenschaften, Sachunterricht for early topics |
| Istorie | Geschichte, Sachunterricht |
| Geografie | Erdkunde, Sachunterricht |
| Educație civică și socială | Politik und Wirtschaft, Sachunterricht, Religion & Ethik |
| Științe socio-umane | Religion & Ethik (Philosophie), Politik und Wirtschaft, Deutsch (argumentation) |
| Limba engleză / Limba franceză / Limba latină | Englisch / Französisch / Latein |
| Informatică și TIC | Informatik & Medienbildung |
| Educație muzicală / Arte vizuale / Educație fizică și sport / Religie | Musik / Kunst / Sport / Religion & Ethik |
| Educație tehnologică | Sachunterricht, Kunst, Informatik & Medienbildung |
| Dezvoltare personală și consiliere | Sachunterricht, Religion & Ethik, Deutsch, Politik und Wirtschaft |

Relations, from the Romanian topic's point of view:

| relation | meaning |
|---|---|
| `exact`   | Same concept and essentially the same mastery claim |
| `close`   | Same core concept; scope, context or examples differ (e.g. Romanian vs German spelling of the same principle, lei vs euro) |
| `broader` | The German topic is broader; the Romanian topic is one part of it |
| `narrower`| The German topic covers only a part of the Romanian topic |
| `related` | Adjacent idea worth linking, but not coverage of the same skill |

Match on content, not on grade: a German topic taught two years earlier or later is still a
match (the comparison measures exactly that timing difference). Use `[]` when the German
taxonomy has nothing comparable (Romanian grammar specifics, Romanian literature, Romanian
history and geography, Orthodox religion content, …). Don't force matches; honest gaps are a
result. Prefer 1–3 high-quality matches.

### Sources / curriculum catalogue

One catalogue entry per programme you use:

```jsonc
{
  "slug": "ro-matematica-v-viii-2017",     // ro-<subject>-<grades>-<year>; liceu: add the specialisation, e.g. ro-matematica-mi-ix-xii-2025
  "country": "RO",
  "name": "Programa școlară pentru disciplina Matematică, clasele a V-a – a VIII-a",
  "version": "Anexa nr. 2 la OMEN nr. 3393/28.02.2017",
  "sourceUrl": "https://… (a URL you opened yourself)",
  "level": "Clasele a V-a – a VIII-a",
  "textIncluded": false,
  "notes": "Official programme (copy hosted by ISJ Suceava). Codes = official numbering of the competențe specifice, prefixed with the grade. Titles are paraphrases.",
  "standards": [
    { "code": "V.1.2", "area": "CG1: identificarea unor date, mărimi și relații matematice",
      "titleRo": "Identificarea fracțiilor ordinare în contexte variate",
      "titleEn": "Recognise ordinary fractions in different contexts", "grades": "V" }
  ]
}
```

**Code scheme (all files).** Romanian programmes number their *competențe specifice* officially
(1.1, 1.2, 2.1, …) per grade. Code = `<GRADE>.<official number>` with GRADE ∈ `CP`, `I`, `II`,
…, `XII`, e.g. `V.1.2`, `CP.2.3`, `IX.3.1`. If a programme lists one set of competențe specifice
for several grades, use the first grade of the block and say which grades in `grades`
(e.g. `"grades": "IX-X"`). General competences may be added as `CG.<n>`. State the scheme in
`notes`, and whether the text is the approved version or a consultation draft.

**Text policy.** Do not copy official text. `titleRo`/`titleEn` are short paraphrases
(≤ ~15 words). Topic descriptions are your own words.

### Clusters (parent-friendly summaries)

One per (subject, domain, band) where you have topics. Bands: `0` (CP–II), `3` (III–IV),
`5` (V–VI), `7` (VII–VIII), `9` (IX–X), `11` (XI–XII). Never add a cluster another file
already has (the checker rejects it).

```json
{ "subject": "Matematică", "domain": "Numere și operații", "gradeStart": 0,
  "summary": "English, 1–2 sentences addressed to a parent: 'Your child is learning…'",
  "summaryRo": "Romanian version: 'Copilul dumneavoastră învață…'" }
```

## Self-check before finishing

```bash
node tools/check-authoring.mjs authoring/<group>.json
```

It validates required fields, subject names and key prefixes, unique keys, prerequisite
resolution, acyclicity, grade order, evidence count, `{{name}}` placeholders, profiles, German
keys in `deMatches`, standard keys against the catalogue entries, and duplicate clusters. Fix
every error; review the warnings.
