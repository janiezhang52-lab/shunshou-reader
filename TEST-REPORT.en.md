# Shunshou Reader 4.1 acceptance report

[简体中文](TEST-REPORT.md) | English

Recorded on **2026-10-08**. This is an English account of the existing acceptance record, not a fresh validation run. Version 4.1 was reloaded in the user's Chrome and checked on five websites and six actual content pages. The dictionary and license files were unchanged from v4.0.

## Real content pages

After the user manually reloaded the installed extension, each site was enabled through the real toolbar. Checks used the page text without replacing extension interfaces or granting extra test permissions. Lookup checks displayed American IPA and Chinese definitions; the pause check confirmed that the same word no longer produced a card.

| Website / page | Word or operation | Recorded result | Local evidence filename |
| --- | --- | --- | --- |
| [OpenAI Academy: Get Started with Codex](https://academy.openai.com/learn/get-started-with-codex-zy8qn/lessons) | Deep body text: engineering | Pass | 顺手读4.1-Academy正文.jpg |
| Same Academy course | Fourth-level srcdoc interactive card: Understand | Pass | 顺手读4.1-Academy深层课件.jpg |
| Same Academy course | Body → outline → body; developers, without enabling again | Pass | 顺手读4.1-Academy导航后.jpg |
| Same Academy course | Pause through real toolbar; engineering | Pass: no card | 顺手读4.1-Academy暂停.jpg |
| Same Academy course | Resume through real toolbar; engineering | Pass: definition and IPA return | 顺手读4.1-Academy恢复.jpg |
| [Wikipedia: Machine learning](https://en.wikipedia.org/wiki/Machine_learning) | Body: development | Pass | 顺手读4.1-Wikipedia正文.jpg |
| [Python: An Informal Introduction to Python](https://docs.python.org/3/tutorial/introduction.html) | Body: distinguished | Pass | 顺手读4.1-Python正文.jpg |
| Same Python tutorial | Comment in a pre code block: comment | Pass | 顺手读4.1-Python代码注释.jpg |
| [MDN: Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) | Body: structure | Pass | 顺手读4.1-MDN正文.jpg |
| [TypeScript README on GitHub](https://github.com/microsoft/TypeScript/blob/main/README.md) | Body: language | Pass | 顺手读4.1-GitHub正文.jpg |
| [TypeScript CONTRIBUTING on GitHub](https://github.com/microsoft/TypeScript/blob/main/CONTRIBUTING.md) | Follow contribute link from README in the same page, without enabling again; engagement | Pass | 顺手读4.1-GitHub换文件后.jpg |

The six pages comprise one Academy course, one Wikipedia article, one Python tutorial, one MDN page, and two GitHub files. Academy body text, interactive cards, and outline navigation are scenarios within the same course. **The 11 images named above are local acceptance records and are not included in the public repository.** The README's two images are v4.0 local-demo captures, not substitutes for those records.

Later Academy chapters were locked by learning-progress requirements; these restrictions were not bypassed and those chapters were not counted as passing. The real MDN check covered body text only; code blocks were checked on the real Python page and in local automated tests. Results apply to these pages and scenarios, not every website, chapter, or embed. ChatGPT Learn remains unvalidated.

## Recorded automated checks

- Unit tests: **14/14** — eight dictionary tests and six frame-coordination tests.
- Browser workflow regression: **17/17** — hover, offline dictionary, cache, unknown words, layout, sensitive inputs, edge positioning, asynchronous cancellation, failure retries, popup enable/pause, and reload.
- Extension integration compatibility regression: **17/17** — nested iframes, srcdoc, late loading and source changes, unified pause, races, repeated resume, open/closed Shadow DOM, modal top layer, and background stop/restart.
- Content-layer checks: **11/11**, also covering `display:contents`, long-paragraph endings, words spanning tags, and fullscreen containers. These use real Chromium DOM with extension-message test doubles; they do not replace extension integration checks.

Automated integration checks use the real popup, background, content scripts, and offline data. Only isolated test copies receive local HTTP fixture permissions; toolbar-target selection is replaced in those copies. These results are separate from the real-toolbar acceptance checks above.

## Package consistency recorded at acceptance

The installed extension, v4.1 candidate folder, and extension ZIP each contained 45 files with matching per-file hashes. Seven extension source hashes in the compatibility record also matched. Production permissions remained only `activeTab` and `scripting`. The old v4.0 installation was backed up separately.

Extension ZIP SHA-256: `f5b563251af02fe6af1e2fff0fc1fd792134bcfd6fded5e1655bd962c8ad9cf6`.

## Run the checks

From the repository root:

```sh
npm test
npm run test:browser
npm run test:compat
npm run test:content
```

Install a compatible `playwright-core` and Chromium, or set `PLAYWRIGHT_CORE_PATH` and `CHROME_EXECUTABLE_PATH` to existing installations. The repository declares `playwright-core` 1.58.2. Packaging uses `python3 scripts/package.py`.

## Limitations

Browser internal pages, image text, unauthorized cross-origin frames (such as Vimeo inside Academy), extension stores, the built-in PDF viewer, and Canvas text are unsupported. Editable inputs and password fields are excluded. Definitions are dictionary entries, not meanings selected from context; entries may be missing.

A full reload or new tab requires enabling again. When a parent page scrolls, a card in a child iframe may move with that frame and remain visible until the next pointer action; it is still clipped to the frame boundary.

Download the existing version from the [v4.1 release](https://github.com/janiezhang52-lab/shunshou-reader/releases/tag/v4.1).
