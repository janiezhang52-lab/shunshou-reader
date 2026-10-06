import {Dictionary} from './dictionary.js';

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
  if (message?.type !== 'hover-reader:lookup' || !sender.tab || sender.frameId !== 0) return false;
  // Content scripts send only a single token, never page text, URL, or history.
  dictionary.lookup(message.word).then(respond).catch(() => respond({status: 'error'}));
  return true;
});
