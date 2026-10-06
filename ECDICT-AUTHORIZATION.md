# ECDICT 授权核实

核实日期：2026-10-06。对象：第一版固定使用的 skywind3000/ECDICT 提交 bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b，尤其 ecdict.csv 的 word/translation 字段；不是增强版全部字典、也不是商业网站上其他词典。

## 结论

有直接、明确的上游依据支持按 MIT 公开分发该词库，而不只是使用程序代码：维护者两次明确回答数据库商业使用，其中最近一次明确包含随安装包提供离线查词。按通常开源依赖审查，可以合理依赖这些项目级授权，保留原版权及完整 MIT 许可。此前仅因缺少逐词来源表就建议整体替换、损失大量覆盖，判断过于保守。

这不是已取得每个历史第三方素材权利链的证明。没有发现可以定位到本版本具体使用词条的已证实许可冲突，也没有发现上游明确的“数据不适用 MIT”例外。资料不足不能改写成侵权结论；同样不能将维护者声明说成对所有第三方权利的独立保证。

## 直接证据

1. 固定提交的根 LICENSE 是标准 MIT，Copyright (c) 2025 Linwei。许可明确允许发布、分发、修改、销售，要求保留版权和许可文字，无付费、非商业、仅私用或代码限定条款。
   https://github.com/skywind3000/ECDICT/blob/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/LICENSE
2. 项目 README 将项目主体定义为英汉双解词典数据库，说明 CSV 数据转换、App 查询和词库嵌入。固定树包含数据、代码和根 LICENSE，没有单独数据许可或 NOTICE；CSV 字段也没有逐条来源/许可列。结合以下维护者明确回答，不能只因 MIT 文本采用 Software 术语就断言只授权代码。
   https://github.com/skywind3000/ECDICT/blob/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/README.md
3. Issue #43 的提问明确是数据库商用英语软件。OWNER skywind3000 于 2019-04-19 回复“可以，MIT 协议。”
   https://github.com/skywind3000/ECDICT/issues/43#issuecomment-484829135
4. Issue #134 中，2026-09-26 的提问明确是词库数据用于商业 App、随安装包离线查词、除保留 MIT 是否另有要求。OWNER skywind3000 于 2026-09-30 回复“可以用，没有”。这直接澄清数据及随包重分发范围。
   https://github.com/skywind3000/ECDICT/issues/134#issuecomment-5902723743
   评论由 GitHub REST API 获取并保存；网页文字抽取未显示评论，不应据此误报维护者未回答。该问题下其他用户对潜在著作权的忧虑是第三方意见，不是上游数据许可例外，也不是具体权利人侵权投诉。
5. OWNER 在 2017 年 Issue #6 表示数据是免费开源、没有版权争议。这是维护者来源陈述，可增强上游授权信赖，但不是独立完成逐条来源审计。
   https://github.com/skywind3000/ECDICT/issues/6#issuecomment-315002134

## 历史检查

当前可见 LICENSE 历史有两次提交。2021-02-12 的根提交 61e71e9384e45358a905e7d08f9d81d6e7f4cb36 由维护者提交，已同时包含词库和标准 MIT（2017 Linwei）；提交说明 remove old commits，且无父提交，故当前历史无法完整追踪更早导入。
https://github.com/skywind3000/ECDICT/commit/61e71e9384e45358a905e7d08f9d81d6e7f4cb36
2025-01-01 的 29864687312c0294e5cb12636933b57b5921cb8c 仅将版权年份从 2017 改为 2025，授权内容未变。不能误读为 2025 年才首次授权、或授权仅来自该次贡献者。
https://github.com/skywind3000/ECDICT/commit/29864687312c0294e5cb12636933b57b5921cb8c

## 具体证据缺口，及其影响

| 来源 | 上游实际说明 | 尚缺什么 | 目前能作的判断 |
|---|---|---|---|
| EDictAZ.txt | README 称最初约两万释义来自他人提供的文本 | 原发布者、原版本及许可文本、导入记录 | 有来源名称，无完整历史权利链；不是已证实禁止分发 |
| cdict-1.0-1.rpm | README 将其称为开源字典数据 | 原 RPM 内版权/许可文件、发布版本、导入范围 | 维护者声明可依赖，但缺独立原始许可佐证 |
| fxsjy/diaosi | README 的 2017-04-07 历史明确导入英汉部分 | 该库公开根目录/README 未见独立许可证；需原许可、作者授权或导入时沟通证据；缺具体导入词条映射 | 这是具体待补证项，不能从“GitHub 可下载”自动推出 MIT，也不能证明导入时未获另行授权 |
| Wiki 所称 CEDIT | 双解释义表写 CEDIT，并提及把汉英资料反向整合 | 项目准确身份、版本、当时许可证、对应词条 | 不能自动认定就是今天的 CC-CEDICT，更不能把当前 CC BY-SA 4.0 追溯套到未知旧版本 |
| Wiktionary/Wikipedia、FOLDOC 及其他参考 | 双解释义页列出多种参考和整合校对方法 | 具体版本、中文/英文哪些字段直接复制或独立改写、相应署名/许可处理、词条映射 | 引用来源表不是逐条复制证明；若确认包含要求署名/同许可的素材，需按其实际版本履行条件 |
| TheFreeDictionary、Linguee、Babylon、UrbanDictionary、机器翻译等 | Wiki 将其列为参考资料 | 是否实际纳入当前 CSV、字段和文本、适用授权或独立编写证据 | 不能凭网站名字推断整个库违法或禁止分发；“免费访问”也不能单独证明可重分发 |

来源原页：
https://github.com/skywind3000/ECDICT/wiki/双解释义
https://github.com/fxsjy/diaosi
https://www.mdbg.net/chinese/dictionary?page=cc-cedict
当前 CC-CEDICT 官方页面确实声明 CC BY-SA 4.0，但 ECDICT 的 CEDIT 身份和年代未明确，因此这里只作为需要核对版本的实例，不作为已证实冲突。

## 可以保留什么，需要清理什么

- 项目级 MIT 及维护者离线随包许可支持保留第一版 ECDICT word/translation 数据，不需要仅凭未知来源删除整库。发行包须保留 ECDICT 原 MIT 与 Linwei 版权声明、固定版本及来源说明。
- 当前未确认出必须清除的具体违规词条范围；不能凭猜测制造清理名单。若后续得到第三方实际版本许可和词条对应关系，再对该部分补署名/适用许可或移除，而不是先清空词库。
- 自己程序的额外“不许商用/不许修改后分享”等限制不能覆盖或撤销 ECDICT 已给出的 MIT 权利；应将上游数据列为明确例外。MIT 不要求整个扩展开源，也没有要求将自己的程序改为 MIT。
- 第一版运行包只从 ECDICT 导出 word 和非空 translation，美式 IPA 来自独立 ipa-dict，不使用 ECDICT 英式 phonetic。完整源码包另含整个 CSV，故源码包重分发范围更广，仍应保留完整上游说明；不能以运行时没用其他字段为由忽略源码包已携带它们。
- 原统计 399213 是非空 translation 字段数量，不是已人工确认全部为中文、也不是人工验证的释义准确率。授权核实与 courses 等内容质量问题应分别处理。

## 核查范围与留存

已核固定 LICENSE/README/根文件树、LICENSE 两次历史、相关 issues 及 OWNER 评论、Wiki 来源说明、diaosi 公开目录与 README、CC-CEDICT 当前官方许可。未取得逐词历史来源表、原 EDictAZ/CDICT 的许可证、所有历史网站许可版本；未做全球诉讼或权利人公告穷尽检索。未找到具体冲突与证明不存在任何冲突是两个不同结论。

证据原文保存于 authorization-evidence/；固定 LICENSE 与 README 原文在 upstream/。本报告记述授权核查，不表示已经公开发布。
