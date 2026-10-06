import {createRequire} from 'node:module';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const profile = await mkdtemp(path.join(os.tmpdir(),'hover-reader-smoke-'));
const extension = path.resolve('extension');
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, chromiumSandbox: true,
    ignoreDefaultArgs: ['--disable-extensions', '--unsafely-disable-devtools-self-xss-warnings'],
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  console.log('Extension service worker:', worker.url());
  const page = await context.newPage();
  await page.goto('https://academy.openai.com', {waitUntil:'domcontentloaded', timeout:30000});
  console.log('Real page:', page.url(), await page.title());
  await page.keyboard.press('Alt+Shift+D');
  await new Promise(r=>setTimeout(r,1000));
  console.log('Pages:',context.pages().map(p=>p.url()));
  console.log('Permission probe:', await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    try { return await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>document.title}); }
    catch(e) { return String(e); }
  }));
} finally { await context?.close(); await rm(profile,{recursive:true,force:true}); }
