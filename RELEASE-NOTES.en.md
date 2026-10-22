# Shunshou Reader 4.1 — course content and website compatibility

[简体中文](RELEASE-NOTES.md) | English

Version 4.1 extends lookup to nested iframes and course content loaded after the page opens, so authorized embedded text can show Chinese definitions and American English IPA.

- Page-wide enable/pause uses actual document IDs for child documents. When pause and loading overlap, the latest state wins.
- Authorized child documents can query the offline dictionary. Coordination can recover after the background worker is reclaimed instead of relying only on in-memory state.
- Lookup supports text in web components, `display:contents`, read-only form descriptions, code blocks, and the ends of long paragraphs. Editable areas remain excluded.
- Cards work with modal and fullscreen containers; moving between embedded documents clears the previous card.
- The v4.0 dictionary, licenses, offline lookup, and `activeTab`/`scripting` permissions are retained. No website-access permission was added.

The [recorded acceptance report](TEST-REPORT.en.md) covers five websites and six content pages in real Chrome: OpenAI Academy, Wikipedia, Python, MDN, and GitHub. It includes deep course content, Python code comments, course-outline navigation, and GitHub file navigation. Locked Academy chapters were excluded. Automated checks and real-toolbar checks are recorded separately.

## Unsupported content

Browser internal pages, image text, unauthorized cross-origin embeds, extension stores, the built-in PDF viewer, and Canvas text are unsupported. Password fields, editable inputs, and content-editable areas are excluded.

## Install or upgrade

Download `shunshou-reader-4.1-extension.zip` from the [v4.1 release](https://github.com/janiezhang52-lab/shunshou-reader/releases/tag/v4.1), extract it, and load the `extension` folder in Chrome. Back up the old folder before replacing its files and reloading the extension, or disable the old version before loading the new one. Re-enable after a full page reload or opening a new tab. See the [installation guide](README.en.md).

`shunshou-reader-4.1-source.zip` contains the complete source. `SHA256SUMS-4.1.txt` provides checksums for both ZIPs. This English document accompanies the existing release; it does not announce a new release or new validation run.
