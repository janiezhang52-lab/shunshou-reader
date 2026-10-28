# Chinese–English documentation coverage / 中英文资料覆盖

Review date / 检查日期: 2026-10-22. This is a documentation-only update. Chinese material is retained; no program behavior, license terms, or release package is changed. / 本次只更新公开资料，保留中文，不改功能、许可证条文或发布包。

## Coverage / 覆盖表

| Chinese source / 中文来源 | English entry / 英文入口 | Scope / 范围 |
| --- | --- | --- |
| [README.md](../README.md) | [README.en.md](../README.en.md) | Overview, install, upgrade, limitations / 介绍、安装、升级、限制 |
| [RELEASE-NOTES.md](../RELEASE-NOTES.md) | [RELEASE-NOTES.en.md](../RELEASE-NOTES.en.md) | Existing v4.1 release notes / 原有版本说明 |
| [TEST-REPORT.md](../TEST-REPORT.md) | [TEST-REPORT.en.md](../TEST-REPORT.en.md) | Recorded results, scope, commands / 历史结果、范围、命令 |
| [DATA-SOURCES.md](../DATA-SOURCES.md) | [DATA-SOURCES.en.md](../DATA-SOURCES.en.md) | Sources, processing, coverage / 来源、处理、覆盖 |
| [ECDICT-AUTHORIZATION.md](../ECDICT-AUTHORIZATION.md) | [ECDICT-AUTHORIZATION.en.md](../ECDICT-AUTHORIZATION.en.md) | Review and evidence gaps / 授权核查与证据缺口 |
| [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) | [THIRD-PARTY-NOTICES.en.md](../THIRD-PARTY-NOTICES.en.md) | License boundaries / 许可边界 |
| [extension/sources.html](../extension/sources.html) | [docs/DICTIONARY-AND-PRIVACY.en.md](../docs/DICTIONARY-AND-PRIVACY.en.md) | English companion; packaged UI unchanged / 英文伴读，包内界面不变 |

## Images / 图片

[English screenshot guide](SCREENSHOTS.en.md) covers all five existing PNGs. All were visually inspected; no image pixels were edited. The two README images remain explicitly labeled v4.0 local-demo captures. The 11 v4.1 real-site evidence images are not public and were not recreated. / 已查看全部五张 PNG，提供英文图注，不改像素；首页两图为 v4.0 本地演示，11 张 v4.1 留档图未公开、未伪造。

## Exclusions and pending items / 排除与待确认

- `LICENSE`: original Chinese legal text unchanged; English legal translation pending separate confirmation. / 中文法律原文保留，英文法律译本待专项确认。
- `extension/THIRD-PARTY-NOTICES.md` and `extension/ECDICT-AUTHORIZATION.md`: packaged duplicates remain byte-identical; root English companions cover their subject matter. Installed UI, manifest strings, and package contents are not localized in this documentation-only change. / 包内副本和界面不改动，英文说明置于仓库。
- Upstream README/license texts, raw dictionaries, `authorization-evidence/`, source comments, test fixtures, internal logs, and historical commits are preserved as evidence/code, not translated. / 上游原文、数据、证据、代码注释、测试样本、内部日志、历史提交不翻译。
- Existing GitHub release bodies and assets are unchanged. The repository now supplies English release notes; no release is published or modified. / 已有 release 正文与包不改动，英文版本说明在仓库内提供。

## Validation / 检查

See the checks recorded below. Historical acceptance claims in translated pages remain explicitly attributed to the original reports; they are not presented as new end-to-end tests. / 翻译中的历史验收结论注明原有记录，不冒充本次端到端测试。

- `npm test`: **14/14 passed**. Browser workflow, compatibility, content-layer and real-site acceptance tests were not rerun. / 单元测试通过；浏览器与实站验收未重跑。
- Local Markdown/image destinations and balanced code fences checked; `git diff --check` passed. / 本地链接、图片目标、代码围栏及差异空白检查通过。
- Across both repositories, 32 unique public HTTPS destinations returned HTTP 200 on 2026-10-22, including release/download URLs. HTTP availability does not verify every anchor, private-reporting permission, or page content claim. / 两仓库共 32 个 HTTPS 地址返回 200，不等于逐一验证锚点、私密报告权限或内容结论。
- Runtime files, original legal texts, and image pixels match the base commit. No release ZIP was rebuilt. / 运行文件、法律原文和图片与基线一致，未重打包。

## Preview integration review — 2026-10-28 / 英文预览导航复核

The earlier 2026-10-22 checks above remain historical. This follow-up integrates the existing main-branch preview documents into the same documentation PR; it does not change either runtime or republish a release. / 上述 2026-10-22 检查仍为历史记录；本次在原文档 PR 中接入 main 已有预览说明，不改运行程序或发布包。

| Material / 资料 | Scope and navigation / 范围与入口 |
| --- | --- |
| [README.md](../README.md) / [README.en.md](../README.en.md) | Original v4.1 Chinese interface and English-to-Chinese dictionary; both link to the separate English preview and installation record / 原版双语文档均链接到独立英文运行预览与安装记录 |
| [ENGLISH-PREVIEW.md](../ENGLISH-PREVIEW.md) | v4.2.1 English interface and English-to-English dictionary; links back to both documentation languages / 链接返回中英文说明 |
| [INSTALLATION-CHECK.md](../INSTALLATION-CHECK.md) | Recorded 2026-10-24 checks for the English preview, with return navigation / 英文预览的 2026-10-24 历史检查及返回导航 |

The two new main-branch pages are already in English; their Chinese-edition entry is retained, and no duplicate translation file is introduced. / main 新增两页已有英文，保留中文版本入口，不重复创建译本。

Follow-up validation: all relative Markdown/image destinations and anchors in the combined public documentation were checked; release tags and named assets were checked through GitHub metadata. No runtime, browser, clean-machine, or live Host acceptance tests were rerun, and release ZIPs were not downloaded or rehashed in this follow-up. / 本次检查合并后公开文档的相对链接、图片目标、锚点，以及 GitHub release 与附件记录；未重跑功能、浏览器、新机安装或真实 Host 验收，未下载或重算发布包哈希。
