import {Dictionary, normalizeWord} from './dictionary.js';
import {FrameCoordinator, sameState} from './frames.js';

const frames = new FrameCoordinator(chrome);

const dictionary = new Dictionary(async letter => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(chrome.runtime.getURL(`data/${letter}.json`), {signal: controller.signal});
    if (!response.ok) throw Error('Dictionary unavailable');
    return await response.json();
  } finally { clearTimeout(timeout); }
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  let operation;
  if (message?.type === 'hover-reader:toggle') {
    // Only the extension's popup may change the main document's authority.
    if (sender.url !== chrome.runtime.getURL('popup.html')) return false;
    operation = frames.toggle(message.tabId, message.enabled);
  } else if (message?.type === 'hover-reader:sync-frames') {
    operation = (async () => {
      const state = await frames.ownSenderState(sender);
      if (!state || state.generation !== message.generation || state.sessionId !== message.sessionId) return {status:'disabled'};
      const result = await frames.synchronize(sender.tab.id);
      return result.state ? {...result.state, frames:result.acknowledged} : {status:'disabled'};
    })();
  } else if (message?.type === 'hover-reader:lookup') {
    // Lookup payloads contain one token, never page text, URL, or history.
    const word = normalizeWord(message.word);
    if (!word) { respond({status:'invalid'}); return false; }
    operation = (async () => {
      const state = await frames.ownSenderState(sender);
      if (!state) return {status:'disabled'};
      const result = await dictionary.lookup(word);
      return sameState(state, await frames.state(sender.tab.id)) ? result : {status:'disabled'};
    })();
  } else return false;
  operation.then(respond).catch(() => respond({status:'error'}));
  return true;
});
