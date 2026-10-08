import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, writeFile, cp, mkdtemp, rm, mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidenceRoot=path.resolve(process.env.COMPATIBILITY_EVIDENCE_DIR || path.join(root,'../compatibility-evidence'));
await mkdir(evidenceRoot,{recursive:true});
const temporary=await mkdtemp(path.join(evidenceRoot,'temporary-'));
const results=[], errors=[], fetches=[], messages=[];
let context, server, page, worker, extensionId, tabId, port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const implementationFiles=['manifest.json','popup.js','background.js','core.js','content.js','dictionary.js','frames.js'];
const sourceHashes=Object.fromEntries(await Promise.all(implementationFiles.map(async file=>[file,createHash('sha256').update(await readFile(path.join(root,'extension',file))).digest('hex')])));
async function check(name,fn) {
  try { const details=await fn(); results.push({name,status:'passed',...(details?{details}:{})}); console.log('PASS',name); }
  catch(error) { results.push({name,status:'failed',error:String(error)}); console.error('FAIL',name,error); throw error; }
}
async function cardStates() {
  const cdp=await context.newCDPSession(page);
  try {
    const {root:dom}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
    const cards=[];
    function visit(node) {
      if(node.attributes?.includes('card'))cards.push(node);
      for(const child of [...(node.children||[]),...(node.shadowRoots||[]),...(node.contentDocument?[node.contentDocument]:[])])visit(child);
    }
    visit(dom);
    return await Promise.all(cards.map(async node=>{
      const {object}=await cdp.send('DOM.resolveNode',{nodeId:node.nodeId});
      const {result}=await cdp.send('Runtime.callFunctionOn',{objectId:object.objectId,
        functionDeclaration:`function(){const box=this.getBoundingClientRect(),host=this.getRootNode().host;return {visible:getComputedStyle(this).display!=='none'&&box.width>0&&box.height>0,text:this.textContent,frame:window.name||'top',url:location.href,popover:!!host?.matches(':popover-open'),modalAncestor:!!host?.closest('dialog[open]'),bounds:{left:box.left,top:box.top,right:box.right,bottom:box.bottom},viewport:{width:innerWidth,height:innerHeight}}}`,
        returnByValue:true});
      return result.value;
    }));
  } finally {await cdp.detach();}
}
async function waitCard(frame,pattern) {
  let states;
  for(let i=0;i<60;i++) {
    states=await cardStates();
    const card=states.find(s=>s.frame===frame&&s.visible&&pattern.test(s.text));
    if(card)return card;
    await sleep(80);
  }
  throw Error(`Expected ${frame} tooltip ${pattern}; actual ${JSON.stringify(states)}`);
}
async function hidden() {
  for(let i=0;i<12;i++){if(!(await cardStates()).some(s=>s.visible))return;await sleep(80);}
  assert.equal((await cardStates()).filter(s=>s.visible).length,0,'No tooltip should remain visible');
}
async function hover(locator) {
  await locator.evaluate(element=>element.scrollIntoView({block:'center',inline:'center'}));
  await sleep(100);await page.mouse.move(3,3);await sleep(25);
  const position=await locator.evaluate(element=>{
    if(element.matches('input,textarea,select'))return null;
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode,match=/[A-Za-z]+/.exec(node.textContent);if(!match)continue;
      const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
      const text=range.getBoundingClientRect(),box=element.getBoundingClientRect();
      return {x:text.left+text.width/2-box.left,y:text.top+text.height/2-box.top};
    }
    return null;
  });
  await locator.hover(position?{position}:{});
}
async function toggle(enabled) {
  const popup=await context.newPage();
  try {
    // A headless page cannot open Chrome's toolbar popup. Only target selection is
    // overridden; popup, background, content code and dictionary are unmodified.
    await popup.addInitScript(target=>{chrome.tabs.query=async()=>[{id:target,url:'http://127.0.0.1/'}];},tabId);
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    const button=popup.locator('#toggle');
    await button.waitFor();await button.waitFor({state:'visible'});
    await popup.waitForFunction(()=>!document.querySelector('#toggle').disabled);
    const text=await button.textContent();
    if(text===(enabled?'启用当前页':'暂停当前页'))await button.click();
    await popup.getByRole('button',{name:enabled?'暂停当前页':'启用当前页',exact:true}).waitFor();
    const status=await popup.locator('#status').textContent();
    if(enabled)assert.match(status,/已启用/);
    return status;
  } finally {await popup.close();await page.bringToFront();}
}
async function instrumentWorker(targetWorker) {
  await targetWorker.evaluate(()=>{
    globalThis.compatibilityFetches=[];globalThis.compatibilityMessages=[];
    const realFetch=globalThis.fetch;
    globalThis.fetch=async (...args)=>{
      compatibilityFetches.push(String(args[0]));
      if(globalThis.compatibilityDelayLetter&&String(args[0]).endsWith('/'+compatibilityDelayLetter+'.json'))await new Promise(r=>setTimeout(r,900));
      return realFetch(...args);
    };
    chrome.runtime.onMessage.addListener((message,sender)=>{
      if(message.type==='hover-reader:lookup')compatibilityMessages.push({message,frameId:sender.frameId});
      return false;
    });
  });
}
async function collectTraffic() {
  if(!worker)return;
  const traffic=await worker.evaluate(()=>({fetches:globalThis.compatibilityFetches||[],messages:globalThis.compatibilityMessages||[]}));
  fetches.push(...traffic.fetches);messages.push(...traffic.messages);
}
async function frameStates() {
  return worker.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId,allFrames:true},func:async()=>{
    if(!globalThis.__hoverReader)return {frame:window.name||'top',url:location.href,injected:false,overlays:document.querySelectorAll('[data-hover-reader-overlay]').length};
    // This asks the same content controller as the production popup/status path.
    return {frame:window.name||'top',url:location.href,injected:true,overlays:document.querySelectorAll('[data-hover-reader-overlay]').length};
  }}),tabId);
}

try {
  const fixture=await readFile(path.join(root,'tests/compatibility-fixture.html'),'utf8');
  server=createServer(async(req,res)=>{
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const style='<style>body{font:24px/1.5 Arial;margin:18px;color:#243e36;background:#fff}p{margin:8px 0}iframe{display:block;width:1020px;height:140px;border:1px solid #ccc}</style>';
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/'){res.end(fixture);return;}
    if(url.pathname==='/child'){
      res.end(style+'<p>First embedded document: <span id="middleword">course</span></p><iframe id="nested" name="nested" src="/nested"></iframe><iframe id="interactive" name="interactive" srcdoc="&lt;style&gt;body{font:24px Arial;margin:18px}&lt;/style&gt;&lt;p&gt;Interactive card: &lt;span id=interactiveword&gt;help&lt;/span&gt;&lt;/p&gt;"></iframe>');return;
    }
    if(url.pathname==='/slow')await sleep(700);
    const word=url.pathname==='/replacement'?'science':url.pathname==='/slow'?'reading':'academy';
    res.end(style+`<p>Embedded reading: <span id="childword">${word}</span> <span id="freshword">zipper</span></p>`);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
  const extension=path.join(temporary,'extension');
  await cp(path.join(root,'extension'),extension,{recursive:true});
  const manifest=JSON.parse(await readFile(path.join(extension,'manifest.json'),'utf8'));
  // This is an explicitly test-only local host grant. The checked-in production
  // manifest is not edited and this suite does NOT prove a real activeTab UI grant.
  manifest.host_permissions=['http://127.0.0.1/*'];
  await writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
  context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{
    ...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{channel:'chromium'}),
    headless:true,chromiumSandbox:true,viewport:{width:1280,height:1000},
    ignoreDefaultArgs:['--disable-extensions','--unsafely-disable-devtools-self-xss-warnings'],
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');extensionId=new URL(worker.url()).host;
  await instrumentWorker(worker);
  page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.frameLocator('#primary').frameLocator('#nested').locator('#childword').waitFor();
  tabId=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(tab=>tab.url===url).id,page.url());
  await check('real popup enables top document, iframe and second-level iframe',async()=>{
    await toggle(true);
    for(const [frame,locator,pattern] of [
      ['top',page.locator('#academy'),/学院/],
      ['primary',page.frameLocator('#primary').locator('#middleword'),/课程/],
      ['nested',page.frameLocator('#primary').frameLocator('#nested').locator('#childword'),/学院/]
    ]){await hover(locator);const card=await waitCard(frame,pattern);assert.match(card.text,/美式/);}
    await page.screenshot({path:path.join(evidenceRoot,'nested-iframe.png')});
    return await frameStates();
  });
  await check('srcdoc interactive card uses real offline IPA and Chinese lookup',async()=>{
    await hover(page.frameLocator('#primary').frameLocator('#interactive').locator('#interactiveword'));
    const card=await waitCard('interactive',/help.*美式.*帮助/s);return {text:card.text};
  });
  await check('moving between parent and nested frames leaves only one visible card',async()=>{
    for(const [frame,locator] of [
      ['top',page.locator('#academy')],['nested',page.frameLocator('#primary').frameLocator('#nested').locator('#childword')],
      ['primary',page.frameLocator('#primary').locator('#middleword')],['interactive',page.frameLocator('#primary').frameLocator('#interactive').locator('#interactiveword')],['top',page.locator('#academy')]
    ]){await locator.hover();await waitCard(frame,/美式/);const visible=(await cardStates()).filter(s=>s.visible);assert.equal(visible.length,1,JSON.stringify(visible));assert.equal(visible[0].frame,frame);}
  });
  await check('iframe added after enable is automatically activated',async()=>{
    await page.evaluate(()=>{const frame=document.createElement('iframe');frame.id='dynamic';frame.name='dynamic';frame.src='/dynamic';document.querySelector('#primary').after(frame);});
    const target=page.frameLocator('#dynamic').locator('#childword');await target.waitFor();await sleep(400);await hover(target);await waitCard('dynamic',/学院/);
  });
  await check('changing existing iframe src activates its replacement document',async()=>{
    await page.locator('#dynamic').evaluate(frame=>{frame.src='/replacement';});
    const target=page.frameLocator('#dynamic').locator('#childword');await target.waitFor();await target.filter({hasText:'science'}).waitFor();await sleep(350);await hover(target);await waitCard('dynamic',/science.*美式/s);
  });
  await check('pause disables every existing document',async()=>{
    await toggle(false);
    for(const locator of [page.locator('#academy'),page.frameLocator('#primary').locator('#middleword'),page.frameLocator('#primary').frameLocator('#nested').locator('#childword'),page.frameLocator('#primary').frameLocator('#interactive').locator('#interactiveword'),page.frameLocator('#dynamic').locator('#childword')]){
      await hover(locator);await sleep(480);await hidden();
    }
  });
  await check('pause while an iframe is loading cannot re-enable that iframe',async()=>{
    await toggle(true);
    await page.locator('#dynamic').evaluate(frame=>{frame.src='/slow';});
    await toggle(false);
    const target=page.frameLocator('#dynamic').locator('#childword');await target.filter({hasText:'reading'}).waitFor();await sleep(600);await hover(target);await sleep(650);await hidden();
  });
  await check('resume and repeated activation produce one overlay per document',async()=>{
    await toggle(true);
    await toggle(false);await toggle(true);await toggle(false);await toggle(true);
    for(const [frame,locator] of [['top',page.locator('#academy')],['primary',page.frameLocator('#primary').locator('#middleword')],['nested',page.frameLocator('#primary').frameLocator('#nested').locator('#childword')],['interactive',page.frameLocator('#primary').frameLocator('#interactive').locator('#interactiveword')],['dynamic',page.frameLocator('#dynamic').locator('#childword')]]){await hover(locator);await waitCard(frame,/美式/);}
    const states=await frameStates();assert.ok(states.length>=5);assert.ok(states.every(s=>s.result.overlays===1),JSON.stringify(states));return states;
  });
  await check('delayed real dictionary response cannot resurrect a paused tooltip',async()=>{
    await worker.evaluate(()=>{globalThis.compatibilityDelayLetter='q';});
    await hover(page.locator('#quokka'));await waitCard('top',/正在加载本地词库/);await toggle(false);await sleep(1200);await hidden();
    await worker.evaluate(()=>{globalThis.compatibilityDelayLetter=null;});await toggle(true);await hover(page.locator('#quokka'));await waitCard('top',/quokka.*美式/s);
  });
  await check('static form, label, pre, code and split inline word remain readable',async()=>{
    for(const [selector,pattern] of [['#formword',/学院/],['#labelword',/课程/],['#preword',/学院/],['#codeword',/课程/],['#split strong',/学院/]]){await hover(page.locator(selector));await waitCard('top',pattern);}
  });
  await check('open shadow text is readable while editable and sensitive fields stay ignored',async()=>{
    await hover(page.locator('#shadowword'));await waitCard('top',/学院/);
    for(const selector of ['#input','#textarea','#password','#editable','#ariaedit','#shadoweditable']){await hover(page.locator(selector));await sleep(480);await hidden();}
  });
  await check('closed shadow read-only text is readable and editable descendants stay ignored',async()=>{
    async function hoverClosed(key) {
      const point=await page.evaluate(key=>{
        const element=window.compatibilityClosedFixture[key];element.scrollIntoView({block:'center'});
        const range=document.createRange();range.selectNodeContents(element);
        const box=key==='word'||key==='editable'?range.getBoundingClientRect():element.getBoundingClientRect();
        return {x:box.left+box.width/2,y:box.top+box.height/2};
      },key);
      await page.mouse.move(3,3);await page.mouse.move(point.x,point.y);
    }
    await hoverClosed('word');await waitCard('top',/学院/);
    for(const key of ['input','editable']){await hoverClosed(key);await sleep(480);await hidden();}
  });
  await check('modal tooltip is in the top layer and remains within viewport',async()=>{
    await page.evaluate(()=>{scrollTo(0,0);document.querySelector('#modal').showModal();});
    await hover(page.locator('#modalword'));const card=await waitCard('top',/knowledge.*美式/s);
    assert.ok(card.popover||card.modalAncestor,'Tooltip must use top layer or belong to active modal');
    assert.ok(card.bounds.left>=0&&card.bounds.top>=0&&card.bounds.right<=card.viewport.width&&card.bounds.bottom<=card.viewport.height);
    await page.screenshot({path:path.join(evidenceRoot,'modal-tooltip.png')});await page.locator('#closemodal').click();return card;
  });
  await check('complete page reload requires explicit enable and then reactivates nested content',async()=>{
    await page.reload();await page.frameLocator('#primary').frameLocator('#nested').locator('#childword').waitFor();
    for(const locator of [page.locator('#academy'),page.frameLocator('#primary').frameLocator('#nested').locator('#childword')]){await hover(locator);await sleep(500);await hidden();}
    const before=await frameStates();assert.ok(before.every(state=>!state.result.injected),JSON.stringify(before));
    await toggle(true);await hover(page.frameLocator('#primary').frameLocator('#nested').locator('#childword'));await waitCard('nested',/学院/);
  });
  await check('lookup payloads stay single-word and dictionary reads stay local',async()=>{
    await collectTraffic();assert.ok(fetches.length>0&&messages.length>0);
    assert.ok(messages.some(entry=>entry.frameId>0),'Expected a real child-frame lookup');
    assert.ok(messages.every(({message})=>Object.keys(message).sort().join(',')==='type,word'&&/^[a-z]+(?:['-][a-z]+)*$/.test(message.word)));
    assert.ok(fetches.every(url=>url.startsWith(`chrome-extension://${extensionId}/data/`)));
    await writeFile(path.join(evidenceRoot,'lookup-traffic.json'),JSON.stringify({fetches,messages},null,2)+'\n');
    return {lookups:messages.length,childLookups:messages.filter(entry=>entry.frameId>0).length,dictionaryFetches:fetches.length};
  });
  await check('service-worker stop and restart preserves enabled content documents',async()=>{
    const cdp=await context.newCDPSession(page);const versions=[];
    cdp.on('ServiceWorker.workerVersionUpdated',event=>versions.push(...event.versions));
    await cdp.send('ServiceWorker.enable');
    for(let i=0;i<30&&!versions.some(v=>v.scriptURL===worker.url());i++)await sleep(100);
    const version=versions.find(v=>v.scriptURL===worker.url()&&v.runningStatus==='running');assert.ok(version,'Running extension worker must be observable');
    await cdp.send('ServiceWorker.stopWorker',{versionId:version.versionId});
    await sleep(150);await hover(page.frameLocator('#primary').frameLocator('#nested').locator('#freshword'));
    await waitCard('nested',/zipper.*美式/s);
    for(let i=0;i<20&&!versions.some(v=>v.versionId===version.versionId&&v.runningStatus==='stopped');i++)await sleep(50);
    const lifecycle=versions.filter(v=>v.versionId===version.versionId).map(v=>v.runningStatus);
    await writeFile(path.join(evidenceRoot,'worker-restart.json'),JSON.stringify({versionId:version.versionId,lifecycle,versions},null,2)+'\n');
    const stopped=lifecycle.indexOf('stopped');
    assert.ok(stopped>=0,'CDP must confirm the worker actually stopped');
    assert.ok(lifecycle.slice(stopped+1).includes('running'),'CDP must confirm worker restart after nested lookup');
    await cdp.detach();
    return {stoppedVersion:version.versionId,restarted:true};
  });
  await check('fixture and browser report no uncaught page errors',async()=>assert.deepEqual(errors,[]));
  await rm(path.join(evidenceRoot,'failure.png'),{force:true});
} catch(error) {
  process.exitCode=1;
  if(page&&!page.isClosed())await page.screenshot({path:path.join(evidenceRoot,'failure.png')}).catch(()=>{});
  console.error(error);
} finally {
  await context?.close();if(server)await new Promise(resolve=>server.close(resolve));
  await rm(temporary,{recursive:true,force:true});
  await writeFile(path.join(evidenceRoot,'compatibility-results.json'),JSON.stringify({date:new Date().toISOString(),testEnvironment:'Isolated headless Chromium. Only http://127.0.0.1/* receives a test host grant; the production manifest and runtime code are unchanged. Real popup code uses only a headless tab-target override. This is not evidence of a real activeTab toolbar grant or third-party website compatibility.',sourceHashes,results,errors},null,2)+'\n');
}
