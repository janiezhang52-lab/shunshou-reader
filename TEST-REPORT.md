# 顺手读 4.1 验收报告

2026-10-08。4.1 已在用户的 Chrome 中重新加载，并通过 5 个网站、6 个实际内容页面的悬停验收。OpenAI Academy 的深层正文与互动卡片已经能够显示中文释义和美式音标；课程目录往返和 GitHub 同页文件导航后仍能继续查词。本版修改网页兼容性，词库及许可文件与原 4.0 保持一致。

## 多网站实际内容页

以下结果来自真实 Chrome 中已安装的 4.1。用户手动重新加载扩展后，逐站通过真实工具栏启用，再在页面文字上悬停；没有替换扩展接口或额外授予测试权限。查词场景均实际显示了美式 IPA 和中文释义；暂停场景验证了同一单词不再出现浮窗。

| 网站与内容页面 | 实际悬停或操作 | 结果 | 截图文件 |
| --- | --- | --- | --- |
| [OpenAI Academy，Get Started with Codex 课程](https://academy.openai.com/learn/get-started-with-codex-zy8qn/lessons) | 深层正文 engineering | 通过 | 顺手读4.1-Academy正文.jpg |
| 同一 Academy 课程 | 第 4 层 srcdoc 互动卡片 Understand | 通过 | 顺手读4.1-Academy深层课件.jpg |
| 同一 Academy 课程 | 正文 → 课程目录 → 返回正文；悬停 developers，未再次启用 | 通过 | 顺手读4.1-Academy导航后.jpg |
| 同一 Academy 课程 | 通过真实工具栏暂停；悬停相同 engineering | 通过，未出现浮窗 | 顺手读4.1-Academy暂停.jpg |
| 同一 Academy 课程 | 通过真实工具栏恢复；再次悬停相同 engineering | 通过，释义与音标恢复 | 顺手读4.1-Academy恢复.jpg |
| [Wikipedia，Machine learning 文章](https://en.wikipedia.org/wiki/Machine_learning) | 正文 development | 通过 | 顺手读4.1-Wikipedia正文.jpg |
| [Python，An Informal Introduction to Python 教程](https://docs.python.org/3/tutorial/introduction.html) | 正文 distinguished | 通过 | 顺手读4.1-Python正文.jpg |
| 同一 Python 教程 | pre 代码块中的注释 comment | 通过 | 顺手读4.1-Python代码注释.jpg |
| [MDN，Document Object Model 文档](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) | 正文 structure | 通过 | 顺手读4.1-MDN正文.jpg |
| [GitHub，microsoft/TypeScript 的 README.md](https://github.com/microsoft/TypeScript/blob/main/README.md) | 正文 language | 通过 | 顺手读4.1-GitHub正文.jpg |
| [GitHub，microsoft/TypeScript 的 CONTRIBUTING.md](https://github.com/microsoft/TypeScript/blob/main/CONTRIBUTING.md) | 从 README 的 contribute 链接同页导航进入，未再次启用；悬停 engagement | 通过 | 顺手读4.1-GitHub换文件后.jpg |

页面计数为 Academy 课程 1 页、Wikipedia 1 页、Python 1 页、MDN 1 页、GitHub 2 页。Academy 正文、互动卡片和目录往返属于同一课程的不同场景，不重复计为多个网站或课程。11 张截图为本地验收留档，未随公开源码发布；上表列出留档文件名。

Academy 后续章节受到网站学习进度限制，本次没有绕过限制，也没有将未解锁章节计为通过。MDN 的真实验收限于正文；代码块已通过 Python 实页及本地自动测试验证。以上结果证明这些页面和场景可用，不代表所有网站、所有章节或所有嵌入内容均已验证。ChatGPT Learn 尚未完成验证。

## 自动化验证

- 单元测试 14/14：8 项词库测试，6 项框架协调测试。
- 浏览器流程回归 17/17：原有悬停、离线词库、缓存、未知词、排版、敏感输入、边缘定位、异步取消、失败重试、弹窗启停与刷新。
- 新增扩展集成兼容回归 17/17：二层 iframe、srcdoc、后加载和换源、统一暂停、竞态、重复恢复、开放及封闭 Shadow DOM、modal 顶层、后台停止重启等。
- 内容层专项验证 11/11：还包含 display:contents、长正文末尾、跨标签拼词及全屏容器。此组使用真实 Chromium DOM，但扩展消息有测试替身；不替代扩展集成验证。

自动集成测试使用真实 popup、background、内容脚本和离线数据，仅向隔离测试副本授予本机 HTTP fixture 权限。测试副本中的工具栏目标选择经过替换。这些自动测试与上面的真实 Chrome 工具栏和内容页验收分别记录。

## 安装与交付一致性

已安装扩展、4.1 候选目录和扩展 ZIP 均为 45 个文件，逐文件哈希完全一致。兼容回归记录中的 7 个扩展源码哈希仍与当前版本匹配。生产包权限仍仅为 activeTab 和 scripting，没有新增持续访问所有网站的权限。旧 4.0 已另行备份。

扩展包 SHA-256：`f5b563251af02fe6af1e2fff0fc1fd792134bcfd6fded5e1655bd962c8ad9cf6`。

## 运行方式

```sh
npm test
npm run test:browser
npm run test:compat
npm run test:content
```

安装兼容的 playwright-core 以及 Chromium，或通过 PLAYWRIGHT_CORE_PATH 与 CHROME_EXECUTABLE_PATH 指定已安装路径。产物打包：python3 scripts/package.py。

## 使用边界

浏览器内部页、图片文字和未授权跨域嵌入暂不支持。扩展商店、内置 PDF 查看器和 Canvas 中的文字也暂不支持。未授权跨域 iframe 的例子包括 Academy 内的 Vimeo 视频。输入框、密码框和可编辑区域不取词。显示的是词典义，不按上下文选义；词库可能缺词。

全页刷新或新标签页需重新启用。父页面滚动时，子 iframe 中已显示的卡片可能随 frame 移动后才在下一次指针动作时收起，仍受 frame 边界裁剪。

4.1 版本的公开下载入口见 [Release](https://github.com/janiezhang52-lab/shunshou-reader/releases/tag/v4.1)。
