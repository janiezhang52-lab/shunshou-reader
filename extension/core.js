(() => {
  // A form, a code sample, and a documentation <pre> can contain readable prose.
  // Exclude actual editing controls, including controls inside open shadow trees.
  const sensitive = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"],[role="combobox"],[data-hover-reader-ignore],[data-hover-reader-overlay],script,style,noscript';
  function shadowRootOf(element) {
    if (!element || element.hasAttribute?.('data-hover-reader-overlay')) return null;
    if (element.shadowRoot) return element.shadowRoot;
    try { return globalThis.chrome?.dom?.openOrClosedShadowRoot?.(element) || null; } catch { return null; }
  }
  function composedParent(element) {
    return element?.assignedSlot || element?.parentElement || element?.getRootNode()?.host || null;
  }
  function safe(element) {
    if (!element) return false;
    for (let el = element, depth = 0; el && depth++ < 128; el = composedParent(el)) {
      if (el.isContentEditable || el.matches(sensitive)) return false;
    }
    return true;
  }
  function blockOf(element) {
    // Keep a Range in one DOM tree; never concatenate text across shadow roots.
    for (let el = element; el; el = el.parentElement) {
      if (!['inline', 'contents', 'inline-block', 'inline-flex'].includes(getComputedStyle(el).display)) return el;
      if (!el.parentElement) return el.getRootNode().host ? el.getRootNode() : el;
    }
    return document.body || document.documentElement;
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
  function hitTarget(x, y) {
    let target = document.elementFromPoint(x, y);
    const roots = [];
    for (let depth = 0; target && depth < 32; depth++) {
      const root = shadowRootOf(target);
      if (!root) break;
      roots.push(root);
      const child = root.elementFromPoint?.(x, y);
      if (!child || child === target) break;
      target = child;
    }
    return {target, roots};
  }
  function caretAt(x, y, target, roots) {
    let node, offset;
    if (document.caretPositionFromPoint) {
      let caret;
      try { caret = document.caretPositionFromPoint(x, y, {shadowRoots: roots}); }
      catch { caret = document.caretPositionFromPoint(x, y); }
      node = caret?.offsetNode; offset = caret?.offset;
    }
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      const caret = document.caretRangeFromPoint?.(x, y);
      node = caret?.startContainer; offset = caret?.startOffset;
    }
    if (node?.nodeType === Node.TEXT_NODE && node.getRootNode() === target.getRootNode()) return {node, offset};
    // Older Chromium caret APIs retarget open-shadow text to its host. Fall back
    // to the small hit element, with a strict work bound and exact text geometry.
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let count = 0, chars = 0;
    while (walker.nextNode() && count++ < 100 && chars < 20000) {
      const text = walker.currentNode;
      if (!safe(text.parentElement)) continue;
      for (const match of text.textContent.matchAll(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g)) {
        chars += match[0].length;
        if (chars > 20000) break;
        const range = document.createRange();
        range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
        if ([...range.getClientRects()].some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return {node:text, offset:match.index};
      }
    }
    return {};
  }
  function wordAtPoint(x, y) {
    const {target, roots} = hitTarget(x, y);
    if (!safe(target)) return null;
    const {node, offset} = caretAt(x, y, target, roots);
    if (!node || !safe(node.parentElement)) return null;
    const block = blockOf(node.parentElement);
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    // Center bounded work on the hovered text, instead of losing every word
    // beyond the first 500 nodes / 20k characters of a large article or code block.
    walker.currentNode = node;
    const before = [], after = [];
    let length = 0;
    while (before.length < 100 && length < 10000 && walker.previousNode()) {
      const n = walker.currentNode; before.push(n); length += n.length;
    }
    walker.currentNode = node; length = 0;
    while (after.length < 100 && length < 10000 && walker.nextNode()) {
      const n = walker.currentNode; after.push(n); length += n.length;
    }
    const nodes = [...before.reverse(), node, ...after];
    const parts = [];
    let text = '', caretOffset = null, previous = null;
    for (const next of nodes) {
      const parent = next.parentElement;
      if (!safe(parent) || getComputedStyle(parent).visibility !== 'visible' || (!parent.getClientRects().length && getComputedStyle(parent).display !== 'contents')) {
        text += '\n'; previous = null; continue;
      }
      const subBlock = blockOf(parent);
      let separated = previous && previous.block !== subBlock;
      if (previous && !separated) {
        const gap = document.createRange();
        gap.setStartAfter(previous.node); gap.setEndBefore(next);
        separated = !!gap.cloneContents().querySelector('br,hr,input,textarea,select,[contenteditable],iframe');
      }
      if (separated) text += '\n';
      const sourceStart = next === node ? Math.max(0, offset - 256) : next.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING ? Math.max(0, next.length - 256) : 0;
      const sourceEnd = next === node ? Math.min(next.length, offset + 256) : Math.min(next.length, sourceStart + 256);
      const value = next.textContent.slice(sourceStart, sourceEnd);
      if (sourceStart > 0 && text.length) text += '\n';
      const start = text.length;
      parts.push({node:next, start, end:start + value.length, sourceStart});
      if (next === node) caretOffset = start + offset - sourceStart;
      text += value;
      // A cut through a long text node must not join an artificial word boundary.
      if (sourceEnd < next.length) text += '\n';
      previous = {node:next, block:subBlock};
    }
    if (caretOffset === null) return null;
    const token = tokenAt(text, caretOffset);
    if (!token) return null;
    const first = parts.find(p => token.start >= p.start && token.start < p.end);
    const last = parts.find(p => token.end > p.start && token.end <= p.end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, first.sourceStart + token.start - first.start);
    range.setEnd(last.node, last.sourceStart + token.end - last.start);
    const rect = [...range.getClientRects()].find(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    if (!rect) return null; // Caret APIs snap to text even on blank space.
    return {word:token.word, range, rect};
  }
  globalThis.HoverReaderCore = {safe, tokenAt, wordAtPoint, shadowRootOf};
})();
