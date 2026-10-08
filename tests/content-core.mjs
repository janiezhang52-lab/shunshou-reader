import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {channel:'chromium'})});
const core = await readFile(new URL('../extension/core.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8');
const page = await browser.newPage({viewport:{width:1000,height:800}});
const failures = [];
page.on('pageerror', e => failures.push(String(e)));
const tests=[];
async function check(name, fn) { await fn(); tests.push(name); console.log('PASS', name); }
async function inject(frame) {
  await frame.evaluate(() => {
    globalThis.testMessages=[]; globalThis.testListeners=[];
    globalThis.chrome={runtime:{onMessage:{addListener(fn){testListeners.push(fn);}},async sendMessage(message){testMessages.push(message);return {status:'found',ipa:'/əˈkædəmi/',zh:'学院'};}}};
    const attach=Element.prototype.attachShadow;
    Element.prototype.attachShadow=function(options){const root=attach.call(this,options);this.testShadow=root;return root;};
  });
  await frame.addScriptTag({content:core}); await frame.addScriptTag({content});
}
async function hit(selector, word) {
  return page.locator(selector).evaluate((el,word) => {
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const n=walker.currentNode, i=n.textContent.indexOf(word); if(i<0)continue;
      const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+word.length);
      const r=range.getBoundingClientRect(), x=r.left+r.width/2,y=r.top+r.height/2;
      return {x,y,word:HoverReaderCore.wordAtPoint(x,y)?.word??null};
    }
    throw Error('Word not found');
  },word);
}
async function card() {return page.evaluate(()=>{const host=document.querySelector('[data-hover-reader-overlay]');const c=host?.testShadow.querySelector('.card');return {visible:!!c&&getComputedStyle(c).display!=='none',text:c?.textContent||'',topLayer:host?.matches(':popover-open'),count:document.querySelectorAll('[data-hover-reader-overlay]').length};});}
async function hover(selector,word) {const p=await hit(selector,word);await page.mouse.move(p.x,p.y);await page.waitForTimeout(470);return card();}
try {
  await page.setContent(`<style>body{font:20px/1.5 sans-serif;margin:20px}p,pre{margin:8px 0}iframe{display:block;width:400px;height:100px}dialog{padding:30px}</style>
    <p id="ordinary">hello academy reader</p><p><span id="contents" style="display:contents">academy</span></p><form><p id="form-prose">academy</p><input value="academy"><textarea>academy</textarea></form>
    <pre id="pre">academy</pre><code id="code">academy</code><p id="split">aca<strong>de</strong>my</p>
    <p id="editable" contenteditable>academy</p><p id="textbox" role="textbox">academy</p>
    <div id="shadow"></div><div id="private-shadow" role="textbox"></div><p id="unicode">café test123 first@example.com</p>
    <iframe srcdoc="<p>academy</p>"></iframe><dialog><p id="dialog-text">academy</p></dialog>`);
  await page.evaluate(()=>{
    document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<span id="nested"></span>';
    document.querySelector('#shadow').shadowRoot.querySelector('#nested').attachShadow({mode:'open'}).innerHTML='<p id="shadow-text">academy</p>';
    document.querySelector('#private-shadow').attachShadow({mode:'open'}).innerHTML='<p id="private-text">academy</p>';
  });
  await inject(page);
  await check('ordinary text, form explanation, pre and code remain readable', async()=>{
    for (const selector of ['#ordinary','#contents','#form-prose','#pre','#code']) assert.equal((await hit(selector,'academy')).word,'academy',selector);
  });
  await check('inline markup joins split words and whitespace has no token',async()=>{
    assert.equal((await hit('#split strong','de')).word,'academy');
    assert.equal(await page.evaluate(()=>HoverReaderCore.wordAtPoint(900,30)),null);
  });
  await check('nested open shadow text works; ARIA ancestor across shadow boundary stays private',async()=>{
    assert.equal((await hit('#shadow-text','academy')).word,'academy');
    assert.equal((await hit('#private-text','academy')).word,null);
  });
  await check('editable text, ARIA textbox, Unicode, identifier and email fragments are excluded',async()=>{
    for(const [selector,word] of [['#editable','academy'],['#textbox','academy'],['#unicode','café'],['#unicode','test123'],['#unicode','first']]) assert.equal((await hit(selector,word)).word,null,selector);
    for(const selector of ['input','textarea']) assert.equal(await page.locator(selector).evaluate(el=>HoverReaderCore.safe(el)),false);
  });
  await check('hover works after 500 nodes and after 20k characters',async()=>{
    await page.evaluate(()=>{
      const many=document.createElement('p');many.id='many';many.style.cssText='height:60px;overflow:auto';
      for(let i=0;i<700;i++){const span=document.createElement('span');span.textContent='earlier ';many.append(span);}
      const last=document.createElement('span');last.id='last';last.textContent='academy';many.append(last);document.body.prepend(many);last.scrollIntoView();
    });
    assert.equal((await hit('#last','academy')).word,'academy');
    await page.evaluate(()=>{
      document.querySelector('#many').remove();const large=document.createElement('pre');large.id='large';large.style.cssText='height:60px;overflow:auto;white-space:pre-wrap';large.textContent='earlier '.repeat(4000)+'academy';document.body.prepend(large);large.scrollTop=large.scrollHeight;
    });
    assert.equal((await hit('#large','academy')).word,'academy');
    await page.locator('#large').evaluate(el=>el.remove());await page.evaluate(()=>scrollTo(0,0));
  });
  await check('380ms hover delay, unchanged page layout, and idempotent reinjection',async()=>{
    const before=await page.locator('#ordinary').boundingBox();await page.evaluate(()=>__hoverReader.setEnabled(true));
    const p=await hit('#ordinary','academy');await page.mouse.move(p.x,p.y);await page.waitForTimeout(200);assert.equal((await card()).visible,false);
    await page.waitForTimeout(300);assert.equal((await card()).visible,true);assert.match((await card()).text,/学院/);
    await page.addScriptTag({content});assert.equal((await card()).count,1);
    assert.deepEqual(await page.locator('#ordinary').boundingBox(),before);
  });
  await check('entering an iframe hides the parent document tooltip',async()=>{
    const iframe=await page.locator('iframe').boundingBox();await page.mouse.move(iframe.x+20,iframe.y+20);await page.waitForTimeout(80);assert.equal((await card()).visible,false);
  });
  await check('modal dialog text displays tooltip in browser top layer',async()=>{
    await page.locator('dialog').evaluate(el=>el.showModal());const state=await hover('#dialog-text','academy');assert.equal(state.visible,true);assert.equal(state.topLayer,true);
    await page.locator('dialog').evaluate(el=>el.close());
  });
  await check('fullscreen text keeps the tooltip above the fullscreen surface',async()=>{
    await page.locator('#ordinary').evaluate(el=>el.requestFullscreen());await page.waitForTimeout(150);
    const state=await hover('#ordinary','academy');assert.equal(state.visible,true);assert.equal(state.topLayer,true);
    await page.evaluate(()=>document.exitFullscreen());
  });
  await check('dynamic iframe mutation requests a versioned sync; paused pending sync is cancelled',async()=>{
    await page.evaluate(()=>{testMessages.length=0;const frame=document.createElement('iframe');frame.srcdoc='<p>academy</p>';document.body.append(frame);});
    await page.waitForTimeout(350);
    const messages=await page.evaluate(()=>testMessages.filter(m=>m.type==='hover-reader:sync-frames'));
    assert.equal(messages.length,1);assert.equal(messages[0].generation,1);assert.ok(messages[0].sessionId);
    await page.evaluate(()=>{testMessages.length=0;document.querySelector('iframe').srcdoc='<p>reader</p>';});
    await page.evaluate(()=>__hoverReader.setEnabled(false));await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>testMessages.filter(m=>m.type==='hover-reader:sync-frames').length),0);
    await page.evaluate(()=>{__hoverReader.setEnabled(true);document.querySelector('iframe').srcdoc='<p>resumed</p>';});await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>testMessages.filter(m=>m.type==='hover-reader:sync-frames').length),1);
  });
  await check('child documents start disabled and reject an older generation after pause',async()=>{
    const child=page.frames()[1];await inject(child);
    assert.equal(await child.evaluate(()=>__hoverReader.state().enabled),false);
    await child.evaluate(()=>{const nested=document.createElement('iframe');nested.srcdoc='<p>academy</p>';document.body.append(nested);});await page.waitForTimeout(100);
    await child.evaluate(()=>testListeners.forEach(fn=>fn({type:'hover-reader:frame-state',sessionId:'test-session',enabled:true,generation:3},{},()=>{})));
    await page.waitForTimeout(300);assert.equal(await child.evaluate(()=>testMessages.filter(m=>m.type==='hover-reader:sync-frames').length),1);
    await child.evaluate(()=>testListeners.forEach(fn=>fn({type:'hover-reader:frame-state',sessionId:'test-session',enabled:true,generation:3},{},()=>{})));
    await page.waitForTimeout(300);assert.equal(await child.evaluate(()=>testMessages.filter(m=>m.type==='hover-reader:sync-frames').length),1);
    const state=await child.evaluate(()=>{
      for(const message of [{enabled:true,generation:4},{enabled:false,generation:5},{enabled:true,generation:4}]) testListeners.forEach(fn=>fn({type:'hover-reader:frame-state',sessionId:'test-session',...message},{},()=>{}));
      return __hoverReader.state();
    });
    assert.deepEqual(state,{enabled:false,generation:5,sessionId:'test-session'});
  });
  assert.deepEqual(failures,[]);console.log(JSON.stringify({status:'passed',tests:tests.length}));
} finally {await browser.close();}
