# 数据来源和许可

2026-10-05 固定公开快照。完整版本、原文件 SHA-256、每个分片 SHA-256 与精确条数见 `extension/data/metadata.json`；原文件保留在 `upstream/`。构建不联系任何词典 API。

| 内容 | 来源 | 固定 Git commit | 声明 |
|---|---|---|---|
| 美式 IPA | [ipa-dict](https://github.com/open-dict-data/ipa-dict)，`data/en_US.txt` | `43c3570eb3553bdd19fccd2bd0091534889af023` | MIT，保留第三方原许可 |
| 中文释义 | [ECDICT](https://github.com/skywind3000/ECDICT)，`ecdict.csv` 的 translation | `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b` | MIT；维护者明确确认数据商用及离线随包分发，见 ECDICT-AUTHORIZATION.md |
| IPA 上游声明 | [cmudict-ipa](https://github.com/lingz/cmudict-ipa) | `629483e9a7fa5b9ff11bb83e3fda6dcc25c5c511` | MIT |
| 发音数据来源声明 | [CMUdict](https://github.com/cmusphinx/cmudict) | `74790861f652b15e4ac49015a90074ad62a27690` | CMU 允许源/二进制再分发并要求保留声明 |
| 重音整理工具声明 | [syllabify](https://github.com/kylebgorman/syllabify) | `d816db784436e9de87ec1ef9bd11b8e229853710` | MIT 声明在 syllabify.py 文件头 |

ipa-dict README 将 en_US 明确标为 English (General American)，并说明美国英语数据基于 cmudict-ipa，经 syllabify 增补重音。它提供的是现有 IPA 数据，部分源于上游自动/半自动转换；本项目不运行这些转换程序，也不推算或生成任何发音。对大小写归一后的确切词形，原样保留 `en_US.txt` 值，包括斜线、重音和读音变体。其宽式转写可能与教学词典排版不同，且不提供音义一一对应。

ECDICT 的 `phonetic` 字段没有每条 US 标签，**完全不使用**。仅抽取中文 `translation`，把数据中表示换行的 `\n` 转为换行。仓库 README 描述多来源汇编及补充收集，无法仅凭仓库 MIT 声明证明所有原始资料均已获逐条授权。本交付如实保留其仓库声明及这个限制；数据随包重分发已有维护者明确MIT许可；完整历史权利链仍未逐条独立核清。没有爬取 Cambridge、Oxford 等付费词典或复制它们的整库。

构建操作：精确词形合并两库；转小写；把弯撇号归一为直撇号；保留长度≤64 的单个 ASCII 英文词（可有内部撇号/连字符）；删除多词短语及特殊字符键；按首字母输出 26 个 JSON。条目是 `[US_IPA或null, 中文或null]`。不推断词干，不把缺失 IPA 从其他词形移植，也不使用 AI 生成释义。过滤与 JSON 重排是本项目唯一的数据加工。

结果：440,843 条，124,987 有 US IPA，399,213 有非空 translation（不保证每项均为中文），83,357 两者均有。覆盖数字是词形数，不是阅读命中率；常见变形、专名、AI 新词不保证命中。中文旧义、错字和上游发音误差可能存在。正式 UI 标明来源，分别显示缺失，并说明未按上下文选择词义。

`extension/licenses/` 中保留 ipa-dict、ECDICT、cmudict-ipa、CMUdict 与 syllabify 全部声明。本版扩展原创代码采用根目录 LICENSE 的专用个人使用与原样免费分享许可；不替代词库自身的许可条件。

## 0.1.1：courses 的有来源释义补充

原始 CSV 中 `courses` 的 translation 为 `[医] 月经`，exchange 为 `1:s3/0:course`；`course` 记录 `s:courses` 和 `3:courses`，translation 包含课程。查词时对这一已核对关系附上 `course` 的完整中文释义，优先展示并标明原形来源，原词条义仍保留。中文不自行编写，IPA 不替换、不借用原形值。原始词库、分片及元数据均未改动；这是查词展示层的特定补充，不是通用词干推断。

## 4.0 发布候选

完整恢复第一版全部分片，逐字节一致；保留 courses 中文补充和独立原词形 IPA。不采用 0.2.x 的词形继承过滤或小词库。按上游明确数据许可可合理依赖 MIT 重分发，具体审计与历史来源证据缺口见 ECDICT-AUTHORIZATION.md。原创许可和第三方词库权利分离。
