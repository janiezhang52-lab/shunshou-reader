# ECDICT authorization review

[简体中文](ECDICT-AUTHORIZATION.md) | English

Review date: **2026-10-06**. This English account describes the existing project review of `skywind3000/ECDICT` at `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b`, especially `word` and `translation` in `ecdict.csv`. It does not cover every enhanced dictionary or other dictionaries on commercial websites. It is not a new legal opinion or a change to license terms.

## Recorded conclusion

The review found direct upstream support for distributing the dictionary data under MIT, beyond permission for program code alone. The maintainer twice answered questions about commercial database use; the later answer explicitly covered shipping data in an app for offline lookup. The review therefore considered reliance on that project-level permission reasonable, with the full copyright and MIT text retained. Its earlier recommendation to replace the whole dictionary solely because an entry-by-entry provenance table was unavailable was considered too conservative.

This is not proof of the complete historical rights chain for every third-party source. The review found neither a confirmed conflict tied to specific entries used in this version nor an explicit upstream exception excluding data from MIT. Missing evidence is not proof of infringement; equally, maintainer statements are not an independent guarantee of all third-party rights.

## Direct evidence recorded by the review

1. The pinned [LICENSE](https://github.com/skywind3000/ECDICT/blob/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/LICENSE) is standard MIT, copyright 2025 Linwei, with no paid-use, noncommercial, personal-use-only, or code-only restriction.
2. The pinned [README](https://github.com/skywind3000/ECDICT/blob/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/README.md) describes an English–Chinese dictionary database, CSV conversion, app lookup, and embedding. The tree has data, code, and a root license, with no separate data license or NOTICE; the CSV has no per-entry source/license columns. Read together with the maintainer's replies, the word “Software” in MIT alone does not establish a code-only grant.
3. In [issue #43](https://github.com/skywind3000/ECDICT/issues/43#issuecomment-484829135), the question concerned commercial English-learning software using the database. On 2019-04-19, owner skywind3000 replied “可以，MIT 协议。” — permission under MIT.
4. In [issue #134](https://github.com/skywind3000/ECDICT/issues/134#issuecomment-5902723743), the 2026-09-26 question explicitly asked about commercial apps, bundling for offline lookup, and requirements beyond retaining MIT. On 2026-09-30, the owner replied “可以用，没有” — use is allowed, with no additional requirements. The reply was retrieved and saved through GitHub's REST API even though webpage text extraction did not show it. Other users' copyright concerns in the discussion are third-party opinions, not an upstream license exception or a specific rights-holder complaint.
5. In [issue #6](https://github.com/skywind3000/ECDICT/issues/6#issuecomment-315002134), the owner described the data as free/open and without copyright disputes in 2017. This supports reliance on the maintainer's account but is not an independent entry-by-entry audit.

## License history

The visible history has two license commits. The maintainer's [2021-02-12 root commit](https://github.com/skywind3000/ECDICT/commit/61e71e9384e45358a905e7d08f9d81d6e7f4cb36) already included the dictionary and standard MIT with 2017 Linwei copyright. Its message says “remove old commits” and it has no parent, so earlier imports cannot be fully traced through this history. The [2025-01-01 commit](https://github.com/skywind3000/ECDICT/commit/29864687312c0294e5cb12636933b57b5921cb8c) changed only the year to 2025, not the grant. It was not the first grant of permission.

## Specific evidence gaps

| Source named upstream | Upstream account | Missing evidence and implication |
| --- | --- | --- |
| EDictAZ.txt | About 20,000 initial definitions came from a supplied text file | Original publisher, version, license, and import records; a named source is not a complete rights chain or proof that redistribution is forbidden |
| cdict-1.0-1.rpm | Described as open-source dictionary data | Original RPM notices, release, and import scope; the maintainer's account lacks independent original-license corroboration |
| fxsjy/diaosi | README history records import of its English–Chinese portion on 2017-04-07 | No independent license was found in the public root/README; original terms, author permission, or import correspondence and entry mappings remain needed. Public availability alone does not imply MIT, nor prove no separate permission existed |
| CEDIT named in the wiki | Bilingual definitions page mentions reversing and integrating Chinese–English materials | Exact identity, version, contemporary license, and entries; it cannot automatically be equated with today's CC-CEDICT or assigned today's terms retroactively |
| Wiktionary/Wikipedia, FOLDOC, and other references | Listed among references and integration/proofreading methods | Versions, fields copied or independently rewritten, attribution/license handling, and entry mappings. A reference list is not proof of copying; confirmed material must meet its actual applicable terms |
| TheFreeDictionary, Linguee, Babylon, UrbanDictionary, machine translation, etc. | Named as references in the wiki | Whether material entered this CSV, which fields/text, and permission or independent authorship evidence. Site names alone do not prove the entire database unlawful; free access does not establish redistribution rights |

Source pages recorded: [ECDICT bilingual-definitions wiki](https://github.com/skywind3000/ECDICT/wiki/双解释义), [fxsjy/diaosi](https://github.com/fxsjy/diaosi), and [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict). The review noted CC-CEDICT's CC BY-SA 4.0 terms, but did not treat them as a confirmed conflict because the identity and date of ECDICT's “CEDIT” were unresolved.

## Retention and follow-up

- The review supports keeping the first-version ECDICT `word`/`translation` data under project-level MIT and the maintainer's bundled-offline-use permission. Distributions must retain the original MIT text, Linwei copyright, pinned version, and source information.
- No specific set of entries requiring removal was confirmed. If source versions, terms, and entry mappings become available, address the affected portion through attribution, applicable licensing, or removal instead of guessing a removal list.
- Restrictions on the project's own program cannot override ECDICT's independent MIT rights. MIT does not require the whole extension or original program to use MIT.
- The runtime extracts only `word` and nonempty `translation`; American IPA comes from ipa-dict, not ECDICT's `phonetic`. The full source ZIP also carries the entire CSV, so its redistribution scope is broader and requires retaining the full upstream notices.
- The figure 399,213 counts nonempty translation fields. It is not a count of manually confirmed Chinese entries or an accuracy rate. Authorization and content-quality issues such as `courses` are separate questions.

## Scope and retained records

The review checked the pinned license, README, root tree, two license-history commits, relevant issues and owner comments, wiki source notes, diaosi's public directory and README, and the CC-CEDICT license page. It did not obtain per-entry historical provenance, original EDictAZ/CDICT licenses, or all historical website terms, nor perform an exhaustive worldwide litigation or rights-holder-notice search. Finding no specific conflict is different from proving none exists.

Original evidence is retained in [authorization-evidence/](authorization-evidence/); pinned license and README texts are in [upstream/](upstream/). The original report documented an authorization review, not proof that a release had already been published at the time of writing.
