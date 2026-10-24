# Shunshou Reader 4.2.1 — English preview

[Installation and usage check (2026-10-24)](INSTALLATION-CHECK.md)

Fixed the missing package-lock.json that caused npm ci to fail in the English source download, the obsolete displayed version 4.1, and the source packaging script which omitted lockfile and English reference/license files. Version 4.2.1 explicitly identifies the extension folder to select. Clean dependency install, 14 unit tests, dictionary regeneration, packaging, and real local-dictionary lookups passed. All 26 shards are included. Actual Load unpacked installation could not be tested because the browser tool blocks chrome://extensions; no workaround was used. Browser-level activation and every website/browser are not certified by these offline checks.

[Download the English preview](https://github.com/janiezhang52-lab/shunshou-reader/releases/tag/v4.2.1-en-preview.1) · [中文项目首页](README.md)

English interface, American IPA and English-to-English definitions. 229,668 exact word forms; 159,137 with English definitions, 124,987 with IPA, 54,456 with both. 14 unit tests and all 26 data shards checked. The earlier 4.2.0 development checks included 11 browser checks; those browser checks were not rerun in this download audit. Unpack and load the extension folder in a supported Chromium browser.



- [Shunshou-Reader-English-4.2.1-preview.zip](https://github.com/janiezhang52-lab/shunshou-reader/releases/download/v4.2.1-en-preview.1/Shunshou-Reader-English-4.2.1-preview.zip)
- [Shunshou-Reader-English-4.2.1-Source.zip](https://github.com/janiezhang52-lab/shunshou-reader/releases/download/v4.2.1-en-preview.1/Shunshou-Reader-English-4.2.1-Source.zip)
- `SHA256SUMS-reader-4.2.1.txt`: checksums for this release only.

Use the explicitly named **Shunshou-Reader-English-4.2.1-Source.zip** for the English implementation. GitHub-generated source archives reflect the existing repository tree and are not the English application package.

Packages were prepared before publication, so their local preparation-status notes are historical. This version page is the publication record. Existing original and third-party licenses remain in force.
