(() => {
  const sensitive = 'input,textarea,select,form,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"],[role="combobox"],[data-hover-reader-ignore],script,style,noscript,pre,code';
  function safe(element) {
    return element && !element.isContentEditable && !element.closest(sensitive);
  }
  function blockOf(element) {
    for (let el = element; el && el !== document.documentElement; el = el.parentElement) {
      if (!['inline', 'contents', 'inline-block', 'inline-flex'].includes(getComputedStyle(el).display)) return el;
    }
    return document.body;
  }
  function tokenAt(text, offset) {
    for (const match of text.matchAll(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g)) {
      const start = match.index, end = start + match[0].length;
      if (offset < start || offset > end) continue;
      // Don't look up fragments of Unicode words, identifiers, numbers, or email addresses.
      if (/[\p{L}\p{M}\p{N}_@]/u.test(text[start - 1] || '') || /[\p{L}\p{M}\p{N}_@]/u.test(text[end] || '')) continue;
      if (match[0].length > 64) continue;
      return {word: match[0].toLowerCase().replaceAll('’', "'"), start, end};
    }
    return null;
  }
  function wordAtPoint(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!safe(target)) return null;
    let node, offset;
    if (document.caretPositionFromPoint) {
      const caret = document.caretPositionFromPoint(x, y);
      node = caret?.offsetNode; offset = caret?.offset;
    } else {
      const caret = document.caretRangeFromPoint?.(x, y);
      node = caret?.startContainer; offset = caret?.startOffset;
    }
    if (!node || node.nodeType !== Node.TEXT_NODE || !safe(node.parentElement)) return null;
    const block = blockOf(node.parentElement);
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const parts = [];
    let text = '', caretOffset = null, previous = null, count = 0;
    // Bound work on huge/virtualized blocks. Only inspect text locally; never transmit it.
    while (walker.nextNode() && count++ < 500 && text.length < 20000) {
      const next = walker.currentNode;
      const parent = next.parentElement;
      if (!safe(parent) || getComputedStyle(parent).visibility === 'hidden' || !parent.getClientRects().length) {
        text += '\n'; previous = null; continue;
      }
      const subBlock = blockOf(parent);
      let separated = previous && previous.block !== subBlock;
      if (previous && !separated) {
        const gap = document.createRange();
        gap.setStartAfter(previous.node); gap.setEndBefore(next);
        separated = !!gap.cloneContents().querySelector('br,hr,input,textarea,select,[contenteditable]');
      }
      if (separated) text += '\n';
      const start = text.length;
      parts.push({node: next, start, end: start + next.length});
      if (next === node) caretOffset = start + offset;
      text += next.textContent;
      previous = {node: next, block: subBlock};
    }
    if (caretOffset === null) return null;
    const token = tokenAt(text, caretOffset);
    if (!token) return null;
    const first = parts.find(p => token.start >= p.start && token.start < p.end);
    const last = parts.find(p => token.end > p.start && token.end <= p.end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, token.start - first.start);
    range.setEnd(last.node, token.end - last.start);
    const rects = [...range.getClientRects()];
    const rect = rects.find(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    if (!rect) return null; // caret APIs snap to text even on blank space.
    return {word: token.word, range, rect};
  }
  globalThis.HoverReaderCore = {safe, tokenAt, wordAtPoint};
})();
