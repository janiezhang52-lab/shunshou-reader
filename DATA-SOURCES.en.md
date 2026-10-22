# Dictionary sources and licensing

[简体中文](DATA-SOURCES.md) | English

The public snapshots were pinned on 2026-10-05. Exact versions, input-file and shard SHA-256 values, and counts are in [metadata.json](extension/data/metadata.json); original inputs are preserved in [upstream/](upstream/). The build does not contact a dictionary API.

| Content | Source | Pinned Git commit | Upstream notice |
| --- | --- | --- | --- |
| American IPA | [ipa-dict](https://github.com/open-dict-data/ipa-dict), `data/en_US.txt` | `43c3570eb3553bdd19fccd2bd0091534889af023` | MIT |
| Chinese definitions | [ECDICT](https://github.com/skywind3000/ECDICT), `translation` in `ecdict.csv` | `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b` | MIT; maintainer statements cover commercial use and bundled offline lookup; see the [authorization review](ECDICT-AUTHORIZATION.en.md) |
| IPA upstream | [cmudict-ipa](https://github.com/lingz/cmudict-ipa) | `629483e9a7fa5b9ff11bb83e3fda6dcc25c5c511` | MIT |
| Pronunciation source | [CMUdict](https://github.com/cmusphinx/cmudict) | `74790861f652b15e4ac49015a90074ad62a27690` | Redistribution permitted with its notices retained |
| Stress-processing tool | [syllabify](https://github.com/kylebgorman/syllabify) | `d816db784436e9de87ec1ef9bd11b8e229853710` | MIT notice in `syllabify.py` |

ipa-dict identifies `en_US` as English (General American), based on cmudict-ipa with stress added using syllabify. Some upstream data comes from automated or partly automated conversion. This project does not run those conversion tools or generate pronunciations. For exact case-normalized word forms, it preserves `en_US.txt` values, including slashes, stress, and variants. Broad transcription may look different from a teaching dictionary and does not map each pronunciation to an individual meaning.

ECDICT's `phonetic` field has no per-entry US label and is **not used**. Only `translation` is extracted, converting literal `\n` markers to line breaks. Its README describes compilation from several sources. The repository MIT notice alone does not independently establish the rights history of every original entry. The project records the upstream license and explicit maintainer permission to redistribute the data, while acknowledging that the full historical rights chain has not been independently audited entry by entry. It did not scrape Cambridge, Oxford, or other paid dictionaries or copy their complete databases.

## Processing and coverage

The build merges exact word forms, lowercases keys, normalizes curly apostrophes to straight ones, and retains single ASCII English words of at most 64 characters, allowing internal apostrophes and hyphens. Multiword phrases and special-character keys are removed. It writes 26 first-letter JSON shards whose entries are `[US_IPA_or_null, Chinese_or_null]`.

It does not infer stems, transfer missing IPA from other forms, or use AI-generated definitions. Filtering and JSON restructuring are the only data processing performed by this project.

The result contains **440,843 word forms**: 124,987 with US IPA, 399,213 with nonempty `translation` (not necessarily Chinese in every entry), and 83,357 with both. These are coverage counts, not a reading hit rate or a human-verified accuracy score. Inflections, proper names, and new AI terminology may be absent. Old meanings, typos, and upstream pronunciation errors may remain. The interface identifies sources and missing fields and states that meanings are not selected from context.

Original notices for all five sources remain in [extension/licenses/](extension/licenses/). The original extension code uses the project's custom [LICENSE](LICENSE), which does not replace the dictionaries' own terms.

## 0.1.1: a sourced supplement for courses

The original CSV gives `courses` the translation `[医] 月经` and exchange `1:s3/0:course`. The `course` entry contains `s:courses` and `3:courses`, and its translation includes the educational sense. For this verified relationship, lookup adds the complete Chinese definition of `course` first, explicitly labels its source form, and preserves the original `courses` entry. No definition is invented, and IPA is neither replaced nor borrowed from `course`. The source data, shards, and metadata are unchanged. This is a specific display-layer supplement, not general stemming.

## 4.0 release candidate

Version 4.0 restored all original first-version shards byte for byte, retaining the `courses` supplement and each word form's own IPA. It does not use the 0.2.x inherited-form filtering or smaller dictionary. The [authorization review](ECDICT-AUTHORIZATION.en.md) records the project's reliance on upstream MIT permission and the remaining historical evidence gaps. Original-program rights and third-party data rights remain separate.
