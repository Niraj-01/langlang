# Exam wordlists

Inputs for `npm run audit` (scripts/audit-coverage.mjs). One CSV per exam;
replacing a file with a better list and re-running the audit is always safe —
nothing here touches the seeds.

| file | source | license / terms |
| --- | --- | --- |
| `jlpt_n5.csv`, `jlpt_n4.csv` | Jonathan Waller's JLPT resources (tanos.co.uk) — the community-standard N5/N4 vocab lists (the JLPT has no official public list since 2010) | Creative Commons BY |
| `goethe_a1.csv` | Goethe-Institut, Goethe-Zertifikat A1 (Start Deutsch 1) Wortliste — official PDF (`A1_SD1_Wortliste_02.pdf`) | © Goethe-Institut; used as a factual word inventory for personal study tracking |
| `goethe_a2.csv` | Goethe-Institut, Goethe-Zertifikat A2 Wortliste — official PDF | © Goethe-Institut; as above |

## Formats

- JLPT: `word,reading,meaning`. `reading` is empty when the headword is already
  kana. Suru verbs appear as `あいさつ・する` (tanos convention) — the audit
  normalizer strips `・`.
- Goethe: `word,article,raw`. `article` is `der|die|das` (or `der/das` where the
  list allows both); `raw` is the original headword line from the PDF, kept for
  review. Compound families from the PDF (`Geburts- (jahr, -ort, -tag)`,
  `(ab)fahren`) are already expanded into one row per full word.

## Provenance / regeneration

The Goethe CSVs were extracted from the official PDFs with a geometry-based
parser (headword column vs example column by x-position; verb-conjugation
lines skipped; ~15 hand-checked wrap fixups). Counts: A1 683 words / A2 1222 —
in line with the published ~650 / ~1300. The JLPT CSVs were converted from the
tanos.co.uk Mnemosyne exports (kanji→english joined with kanji→hiragana).
If you re-extract or hand-fix a list, keep the same columns.
