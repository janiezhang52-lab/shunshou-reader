# Installation and usage check — 2026-10-24

[English preview and downloads](ENGLISH-PREVIEW.md) · [中文项目首页](README.md) · [Original-edition English documentation](README.en.md)

Scope: the **v4.2.1 English preview**. These recorded checks do not replace the original v4.1 acceptance report.

Fixed the missing package-lock.json that caused npm ci to fail in the English source download, the obsolete displayed version 4.1, and the source packaging script which omitted lockfile and English reference/license files. Version 4.2.1 explicitly identifies the extension folder to select. Clean dependency install, 14 unit tests, dictionary regeneration, packaging, and real local-dictionary lookups passed. All 26 shards are included. Actual Load unpacked installation could not be tested because the browser tool blocks chrome://extensions; no workaround was used. Browser-level activation and every website/browser are not certified by these offline checks.

The Chinese edition is retained. Public downloads were fetched again and matched their SHA-256 checksums. Package integrity and runtime checks are separate from clean-machine installation and external-service acceptance.
