# Dictionary and privacy

[English overview](../README.en.md) · [中文原页](../extension/sources.html)

An English companion to the extension's existing Chinese information page. This is documentation for v4.1; the installed interface and package are unchanged.

## Pronunciation and definitions

American IPA is read directly from ipa-dict's `data/en_US.txt`, identified upstream as General American and based on CMUdict through cmudict-ipa and syllabify. Shunshou Reader does not convert or infer IPA and preserves upstream stress marks and variants. It does not treat ECDICT's region-unspecified pronunciation as American IPA. Upstream processing includes semi-automated conversion, so not every entry has been reviewed by a pronunciation specialist. Broad transcription may contain errors; pronunciations of homographs are not paired with individual meanings. General American IPA does not represent every US regional pronunciation.

Definitions come from ECDICT's `translation` field, not online translation. Community dictionary entries can contain old meanings or typos and may omit specialized AI usage. Missing entries display “词库未收录” (not in the dictionary), rather than a guessed definition.

The data contains 440,843 word forms: 124,987 with American IPA, 399,213 with a nonempty translation field, and 83,357 with both. The translation count does not guarantee that every entry is Chinese. Keys are single ASCII English words, optionally with internal apostrophes or hyphens; lookup ignores case and normalizes curly apostrophes. There is no general stemming, so new words, brands, abbreviations, some plurals, and terminology may be absent. See [data sources](../DATA-SOURCES.en.md) for the specific `courses` supplement.

Original third-party licenses are in [extension/licenses/](../extension/licenses/). The [authorization review](../ECDICT-AUTHORIZATION.en.md) records the ECDICT maintainer's permission and historical provenance gaps. The original program's custom personal-use and unmodified-sharing license does not restrict independently licensed third-party MIT data. The Chinese [LICENSE](../LICENSE) remains authoritative; no English legal license is introduced.

## Permissions and data handling

The extension requests only `activeTab` and `scripting`. Clicking **启用当前页** (Enable current page) injects hover lookup into the authorized page. Word recognition happens locally near the pointer. Lookup messages carry one word; separate messages coordinate page enable/pause and loading. Dictionary queries read bundled JSON. There are no network lookups, accounts, API keys, telemetry, history/clipboard permissions, or saved lookup history.

In-memory caches hold up to 256 query results and up to four letter shards in the background. Caches disappear when their page or extension process ends. The card is a separate node and does not rewrite the original text or layout. Editable inputs, password fields, content-editable areas, and ARIA text-input areas are excluded. Ordinary body text, read-only form descriptions, and English in code blocks can be queried.

## Page support

Enable again after a full reload or opening a new tab. Lookup handles ordinary HTML and currently authorized embedded documents, including authorized frames loaded later. Chrome internal pages, extension stores, the built-in PDF viewer, image text, and Canvas are unsupported. Unauthorized cross-origin embeds are not read automatically. The extension checks readable text near the pointer rather than scanning an entire long article.

Pinned dictionary versions, SHA-256 values, offline rebuild scripts, and the [acceptance report](../TEST-REPORT.en.md) are available in the repository/source package.
