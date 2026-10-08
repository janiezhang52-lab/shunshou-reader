(() => {
  if (globalThis.__hoverReader) return; // reinjection is idempotent
  const core = globalThis.HoverReaderCore;
  let enabled = false, host, shadow, card, timer, raf, current, epoch = 0;
  const isTop = window === window.top;
  let generation = 0, sessionId = isTop ? (crypto.randomUUID?.() || [...crypto.getRandomValues(new Uint32Array(4))].map(n => n.toString(16)).join('-')) : null, frameTimer;
  const observedRoots = new WeakSet();
  let lastPoint;
  const cache = new Map();
  const controller = new AbortController();
  const options = {capture: true, passive: true, signal: controller.signal};

  function overlayParent() {
    if (document.fullscreenElement) return document.fullscreenElement;
    // Chromium 110–113 has no Popover API. Attach to a modal dialog so its
    // top layer does not cover the tooltip. Newer Chromium uses a popover.
    let element = current?.range.startContainer.parentElement;
    while (element) {
      if (element.matches?.('dialog[open]')) return element;
      element = element.parentElement || element.getRootNode()?.host;
    }
    return document.documentElement;
  }
  function ensureCard() {
    if (host?.isConnected) {
      const parent = overlayParent();
      if (host.parentNode !== parent) parent.append(host);
      return;
    }
    host = document.createElement('div');
    host.id = 'hover-reader-overlay';
    host.setAttribute('data-hover-reader-overlay', '');
    host.style.cssText = 'all:initial!important;position:fixed!important;left:0!important;top:0!important;margin:0!important;padding:0!important;border:0!important;width:0!important;height:0!important;z-index:2147483647!important;pointer-events:none!important;';
    if (typeof host.showPopover === 'function') host.setAttribute('popover', 'manual');
    shadow = host.attachShadow({mode: 'closed'});
    const style = document.createElement('style');
    style.textContent = `
      :host { color-scheme: light; }
      .card { all:initial; box-sizing:border-box; position:fixed; display:none; width:max-content;
        max-width:min(340px, calc(100vw - 20px)); max-height:calc(100vh - 20px); overflow:hidden;
        border:1px solid #d9e4df; border-radius:13px; padding:14px 16px; background:#fbfdfc;
        box-shadow:0 8px 30px #142b2424; color:#193c32; font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        pointer-events:none; text-align:left; white-space:normal; overflow-wrap:anywhere; }
      .word { display:block; font-size:18px; font-weight:650; margin-bottom:5px; }
      .ipa { display:block; color:#28705b; font-family:'Arial','Segoe UI',sans-serif; margin-bottom:9px; }
      .meaning { display:block; white-space:pre-line; color:#243e36; }
      .note { display:block; margin-top:10px; font-size:10px; line-height:1.4; color:#688077; }
    `;
    card = document.createElement('div'); card.className = 'card';
    card.setAttribute('role', 'tooltip'); card.setAttribute('lang', 'zh-CN');
    shadow.append(style, card); overlayParent().append(host);
  }
  function hide() {
    clearTimeout(timer); cancelAnimationFrame(raf); raf = null; epoch++; current = null;
    if (card) card.style.display = 'none';
    try { if (host?.matches(':popover-open')) host.hidePopover(); } catch {}
  }
  function line(cls, text) {
    const el = document.createElement('span'); el.className = cls; el.textContent = text;
    card.append(el);
  }
  function render(hit, result) {
    ensureCard(); card.replaceChildren();
    line('word', hit.word);
    if (result.status === 'loading') line('meaning', '正在加载本地词库…');
    else if (result.status === 'error') {
      line('meaning', '本地词库加载失败');
      line('note', '移开后再悬停可重试。若扩展刚更新，请刷新页面并重新启用。');
    } else {
      line('ipa', result.ipa ? `美式  ${result.ipa}` : '美式 IPA：词库未收录');
      line('meaning', result.zh ? result.zh.slice(0, 900) + (result.zh.length > 900 ? '\n…（释义较长，已截断）' : '') : '中文释义：词库未收录');
      const supplement = result.chineseSupplement ? `（含 ${result.chineseSupplement} 词条补充）` : '';
      line('note', `IPA · ipa-dict en_US / CMU　中文 · ECDICT${supplement}\n离线词典义，未按上下文选择释义`);
    }
    card.style.display = 'block';
    // A z-index alone cannot escape a website's modal/fullscreen top layer.
    try { if (host.showPopover && !host.matches(':popover-open')) host.showPopover(); } catch {}
    const r = hit.rect;
    const box = card.getBoundingClientRect();
    const left = Math.max(10, Math.min(r.left, innerWidth - box.width - 10));
    let top = r.bottom + 9;
    if (top + box.height > innerHeight - 10) top = r.top - box.height - 9;
    top = Math.max(10, Math.min(top, innerHeight - box.height - 10));
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  }
  async function lookup(word) {
    if (cache.has(word)) return cache.get(word);
    let timeout;
    try {
      const result = await Promise.race([
        chrome.runtime.sendMessage({type: 'hover-reader:lookup', word}),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('Timeout')), 6000); })
      ]);
      if (!result || !['found', 'missing'].includes(result.status)) return {status: 'error'};
      cache.set(word, result);
      while (cache.size > 256) cache.delete(cache.keys().next().value);
      return result;
    } catch { return {status: 'error'}; }
    finally { clearTimeout(timeout); }
  }
  function same(a, b) {
    return a && b && a.word === b.word && a.range.startContainer === b.range.startContainer && a.range.startOffset === b.range.startOffset && a.range.endContainer === b.range.endContainer && a.range.endOffset === b.range.endOffset;
  }
  function inspect() {
    raf = null;
    if (!enabled || !lastPoint || document.hidden) return;
    let hit;
    try { hit = core.wordAtPoint(lastPoint.x, lastPoint.y); } catch { hit = null; }
    if (!hit) { hide(); return; }
    if (same(current, hit)) return;
    hide(); current = hit;
    const requestEpoch = epoch;
    timer = setTimeout(async () => {
      if (!enabled || epoch !== requestEpoch || !hit.range.startContainer.isConnected) return;
      render(hit, {status: 'loading'});
      const result = await lookup(hit.word);
      if (enabled && epoch === requestEpoch && hit.range.startContainer.isConnected) render(hit, result);
    }, 380);
  }
  function state() { return {enabled, generation, sessionId}; }
  function setEnabled(value) {
    // Only the main document owns the user's enable/pause state. The background
    // copies this versioned state to each authorized child document.
    if (!isTop) return state();
    enabled = Boolean(value); generation++; hide();
    clearTimeout(frameTimer); frameTimer = null;
    if (enabled && scanRoots(document)) syncFrames();
    return state();
  }
  function setFrameState(message) {
    if (isTop || !Number.isSafeInteger(message.generation) || message.generation < 0 || typeof message.sessionId !== 'string') return state();
    if (sessionId === message.sessionId && message.generation < generation) return state();
    if (sessionId === message.sessionId && message.generation === generation && enabled === Boolean(message.enabled)) return state();
    const activating = Boolean(message.enabled) && (!enabled || sessionId !== message.sessionId);
    enabled = Boolean(message.enabled); generation = message.generation; sessionId = message.sessionId;
    hide(); clearTimeout(frameTimer); frameTimer = null;
    if (enabled && scanRoots(document) && activating) syncFrames();
    return state();
  }
  function syncFrames() {
    if (!enabled || frameTimer) return;
    const expectedGeneration = generation, expectedSession = sessionId;
    frameTimer = setTimeout(() => {
      frameTimer = null;
      if (!enabled || generation !== expectedGeneration || sessionId !== expectedSession) return;
      chrome.runtime.sendMessage({type:'hover-reader:sync-frames', generation, sessionId}).catch(() => {});
    }, 180);
  }
  function scanRoots(root) {
    if (root instanceof ShadowRoot && !observedRoots.has(root)) {
      observedRoots.add(root);
      observer.observe(root, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['src', 'srcdoc']});
      root.addEventListener('load', event => { if (event.target?.matches?.('iframe,frame')) syncFrames(); }, options);
    }
    let hasFrames = Boolean(root.matches?.('iframe,frame') || root.querySelector?.('iframe,frame'));
    const ownShadow = root.nodeType === Node.ELEMENT_NODE && core.shadowRootOf(root);
    if (ownShadow) hasFrames = scanRoots(ownShadow) || hasFrames;
    for (const element of root.querySelectorAll?.('*') || []) {
      const elementShadow = core.shadowRootOf(element);
      if (elementShadow) hasFrames = scanRoots(elementShadow) || hasFrames;
    }
    return hasFrames;
  }
  document.addEventListener('pointermove', event => {
    if (!enabled || event.pointerType === 'touch' || event.buttons) { hide(); return; }
    for (const node of event.composedPath()) { if (node instanceof ShadowRoot && !observedRoots.has(node)) scanRoots(node); }
    if (event.composedPath().some(node => node.matches?.('iframe,frame'))) { hide(); return; }
    lastPoint = {x: event.clientX, y: event.clientY};
    // Coalesce to one hit test per animation frame; always process the final position.
    if (!raf) raf = requestAnimationFrame(inspect);
  }, options);
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget || event.relatedTarget.matches?.('iframe,frame')) hide();
  }, options);
  document.addEventListener('pointerover', event => { if (event.target?.matches?.('iframe,frame')) hide(); }, options);
  for (const name of ['scroll', 'pointerdown', 'focusin']) document.addEventListener(name, hide, options);
  for (const name of ['blur', 'resize', 'pagehide']) window.addEventListener(name, hide, options);
  document.addEventListener('visibilitychange', hide, options);
  document.addEventListener('fullscreenchange', hide, options);
  document.addEventListener('load', event => { if (event.target?.matches?.('iframe,frame')) syncFrames(); }, options);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); }, {capture:true, signal:controller.signal});
  const observer = new MutationObserver(records => {
    if (current && (!current.range.startContainer.isConnected || current.range.toString().toLowerCase().replaceAll('’', "'") !== current.word)) hide();
    if (!enabled) return;
    for (const record of records) {
      if (record.type === 'attributes' && record.target.matches?.('iframe,frame')) syncFrames();
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE || node.hasAttribute('data-hover-reader-overlay')) continue;
        if (scanRoots(node)) syncFrames();
      }
    }
  });
  observer.observe(document.documentElement || document, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['src', 'srcdoc']});
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'hover-reader:status') { respond(state()); return false; }
    if (message?.type === 'hover-reader:enable' && isTop) { respond(setEnabled(message.enabled)); return false; }
    if (message?.type === 'hover-reader:frame-state') { respond(setFrameState(message)); return false; }
    return false;
  });
  globalThis.__hoverReader = {setEnabled, state};
})();
