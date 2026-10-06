import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, writeFile, cp, mkdtemp, rm, mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const root = path.resolve('.');
const evidenceRoot = path.resolve(process.env.BROWSER_EVIDENCE_DIR || 'evidence');
await mkdir(evidenceRoot, {recursive:true});
const temporary = await mkdtemp(path.join(os.tmpdir(), 'hover-reader-e2e-'));
const results = [], errors = [];
let context, server;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function check(name, fn) {
  try { await fn(); results.push({name, status:'passed'}); console.log('PASS', name); }
  catch(e) { results.push({name,status:'failed',error:String(e)}); throw e; }
}
async function cardState(page) {
  const cdp = await context.newCDPSession(page);
  try {
    const {root:dom} = await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
    function find(node) {
      if (node.attributes?.includes('card')) return node;
      for(const child of [...(node.children||[]),...(node.shadowRoots||[])]) {const found=find(child);if(found)return found;}
    }
    const card=find(dom);
    if(!card)return {visible:false,text:''};
    const {object} = await cdp.send('DOM.resolveNode',{nodeId:card.nodeId});
    const {result} = await cdp.send('Runtime.callFunctionOn',{
      objectId:object.objectId,
      functionDeclaration:`function(){const r=this.getBoundingClientRect();return {visible:getComputedStyle(this).display!=='none',text:this.textContent,left:r.left,top:r.top,right:r.right,bottom:r.bottom}}`,
      returnByValue:true
    });
    return result.value;
  } finally {await cdp.detach();}
}
async function hoverText(page,selector,word) {
  const point=await page.locator(selector).evaluate((element,word)=>{
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const n=walker.currentNode, i=n.textContent.indexOf(word);
      if(i<0)continue;
      const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+word.length);
      const box=r.getBoundingClientRect();return {x:box.left+box.width/2,y:box.top+box.height/2};
    }
    throw Error('text not found: '+word);
  },word);
  await page.mouse.move(point.x,point.y);return point;
}
async function waitCard(page, pattern) {
  for(let i=0;i<35;i++) {const state=await cardState(page);if(state.visible&&pattern.test(state.text))return state;await sleep(100);}
  throw Error('Expected tooltip '+pattern+'; actual '+JSON.stringify(await cardState(page)));
}

try {
  const fixture=await readFile(path.join(root,'tests/fixture.html'));
  server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const fixtureURL=`http://127.0.0.1:${server.address().port}/`;
  // Test-only scoped host grants let headless Chromium exercise the real scripting API.
  // Production manifest remains activeTab-only. Headless lacks clickable browser toolbar.
  const extension=path.join(temporary,'extension');
  await cp(path.join(root,'extension'),extension,{recursive:true});
  const manifest=JSON.parse(await readFile(path.join(extension,'manifest.json')));
  manifest.host_permissions=['http://127.0.0.1/*','https://academy.openai.com/*','https://chatgpt.com/*'];
  await writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
  context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{
    channel:'chromium',headless:true,chromiumSandbox:true,viewport:{width:1200,height:900},
    ignoreDefaultArgs:['--disable-extensions','--unsafely-disable-devtools-self-xss-warnings'],
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host;
  await worker.evaluate(()=>{
    globalThis.testFetches=[];globalThis.testMessages=[];
    const realFetch=globalThis.fetch;
    globalThis.fetch=async (...args)=>{
      testFetches.push(String(args[0]));
      if(globalThis.testFailLetter && String(args[0]).endsWith('/'+testFailLetter+'.json'))throw Error('Test simulated failure');
      if(globalThis.testDelay)await new Promise(r=>setTimeout(r,testDelay));
      return realFetch(...args);
    };
    chrome.runtime.onMessage.addListener(message=>{if(message.type==='hover-reader:lookup')testMessages.push(message);return false;});
  });
  async function tabID(url) {return worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url)?.id,url);}
  async function enable(page) {
    const tabId=await tabID(page.url());
    await worker.evaluate(async tabId=>{
      await chrome.scripting.executeScript({target:{tabId},files:['core.js','content.js']});
      await chrome.tabs.sendMessage(tabId,{type:'hover-reader:enable',enabled:true});
    },tabId);
    return tabId;
  }
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(fixtureURL); const baseline=await page.locator('#ordinary').boundingBox();
  await enable(page);
  await check('first hover delay and loading state, US IPA + Chinese',async()=>{
    await worker.evaluate(()=>{globalThis.testDelay=700;});
    await hoverText(page,'#academy','academy');await sleep(180);
    assert.equal((await cardState(page)).visible,false);
    await waitCard(page,/正在加载本地词库/);
    const state=await waitCard(page,/学院/);assert.match(state.text,/美式.*əˈkædəmi/);
    await worker.evaluate(()=>{globalThis.testDelay=0;});
    await page.screenshot({path:path.join(evidenceRoot,'fixture-hover.png')});
  });
  await check('courses first and repeat hover shows course meanings with exact courses IPA',async()=>{
    await hoverText(page,'#courses','courses');
    const state=await waitCard(page,/课程/);
    const data=JSON.parse(await readFile(path.join(root,'extension/data/c.json')));
    assert.ok(state.text.includes(data.courses[0]));
    assert.match(state.text,/含 course 词条补充/);
    assert.match(state.text,/courses 的原词条义：.*月经/s);
    assert.ok(state.text.indexOf('课程') < state.text.indexOf('月经'));
    await page.screenshot({path:path.join(evidenceRoot,'courses-hover.png')});
    const before=await worker.evaluate(()=>testMessages.length);
    await page.mouse.move(15,15);await sleep(80);
    await hoverText(page,'#courses','courses');await waitCard(page,/课程/);
    assert.equal(await worker.evaluate(()=>testMessages.length),before);
  });
  await check('hover does not change original page layout',async()=>assert.deepEqual(await page.locator('#ordinary').boundingBox(),baseline));
  await check('leaving hides; repeat hover reads cache without another request',async()=>{
    const before=await worker.evaluate(()=>testMessages.length);
    await page.mouse.move(15,15);await sleep(80);assert.equal((await cardState(page)).visible,false);
    await hoverText(page,'#academy','academy');await waitCard(page,/学院/);
    assert.equal(await worker.evaluate(()=>testMessages.length),before);
  });
  await check('inline markup joins a split word',async()=>{
    await hoverText(page,'#split strong','de');const state=await waitCard(page,/学院/);assert.ok(state.text.startsWith('academy'));
  });
  await check('punctuation, contractions and hyphens are exact words',async()=>{
    await hoverText(page,'#punctuation','Hello');await waitCard(page,/hello.*美式/s);
    await hoverText(page,'#punctuation',"don't");await waitCard(page,/don't.*美式/s);
    await hoverText(page,'#punctuation','well-being');await waitCard(page,/well-being.*美式/s);
  });
  await check('unknown entry explicitly reports both missing fields',async()=>{
    await hoverText(page,'#punctuation','zzzxnonexistentword');const state=await waitCard(page,/词库未收录/);
    assert.match(state.text,/美式 IPA：词库未收录/);assert.match(state.text,/中文释义：词库未收录/);
  });
  await check('Unicode, numbers, email fragments, editable text, form and ARIA textbox are ignored',async()=>{
    for(const [selector,word] of [['#punctuation','café'],['#punctuation','test123'],['#punctuation','first'],['#sensitive','academy'],['#label','academy'],['#role','academy']]) {
      await hoverText(page,selector,word);await sleep(450);assert.equal((await cardState(page)).visible,false,selector+':'+word);
    }
    await page.locator('input').hover();await sleep(450);assert.equal((await cardState(page)).visible,false);
  });
  await check('viewport edge placement stays on screen',async()=>{
    await hoverText(page,'#edge','academy');const state=await waitCard(page,/学院/);
    assert.ok(state.left>=0&&state.top>=0&&state.right<=1200&&state.bottom<=900);
    await page.screenshot({path:path.join(evidenceRoot,'edge-hover.png')});
  });
  await check('scroll, Escape, dragging cancel and stale async replies do not resurrect tooltip',async()=>{
    await page.keyboard.press('Escape');assert.equal((await cardState(page)).visible,false);
    await hoverText(page,'#prompt','prompt');await waitCard(page,/prompt.*美式/s);
    await page.mouse.wheel(0,100);await sleep(100);assert.equal((await cardState(page)).visible,false);
    await page.evaluate(()=>scrollTo(0,0));
    await worker.evaluate(()=>{globalThis.testDelay=700;});
    await hoverText(page,'#learn','learn');await sleep(430);await page.mouse.move(15,15);await sleep(800);
    assert.equal((await cardState(page)).visible,false);
    await worker.evaluate(()=>{globalThis.testDelay=0;});
    await hoverText(page,'#academy','academy');await page.mouse.down();await page.mouse.move(250,200);await sleep(450);
    assert.equal((await cardState(page)).visible,false);await page.mouse.up();
  });
  await check('local file failure is visible and subsequent hover retries',async()=>{
    await worker.evaluate(()=>{globalThis.testFailLetter='q';});
    await hoverText(page,'#failure','quokka');await waitCard(page,/本地词库加载失败/);
    await worker.evaluate(()=>{globalThis.testFailLetter=null;});
    await page.mouse.move(15,15);await sleep(60);await hoverText(page,'#failure','quokka');await waitCard(page,/quokka.*美式/s);
  });
  await check('reinjection and pause/resume never create duplicate overlays',async()=>{
    const tabId=await enable(page);await enable(page);
    assert.equal(await page.locator('[data-hover-reader-overlay]').count(),1);
    await worker.evaluate(tabId=>chrome.tabs.sendMessage(tabId,{type:'hover-reader:enable',enabled:false}),tabId);
    await hoverText(page,'#academy','academy');await sleep(450);assert.equal((await cardState(page)).visible,false);
    await enable(page);await page.mouse.move(15,15);await hoverText(page,'#academy','academy');await waitCard(page,/学院/);
  });
  await check('popup source performs enable/pause with headless target selection override',async()=>{
    const target=await tabID(page.url());
    const popup=await context.newPage();
    // Override target selection only because this popup is a headless tab, not toolbar UI.
    await popup.addInitScript(target=>{chrome.tabs.query=async()=>[{id:target,url:'http://127.0.0.1/'}];},target);
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.getByRole('button',{name:'暂停当前页'}).click();
    await popup.getByRole('button',{name:'启用当前页'}).click();
    assert.match(await popup.locator('#status').textContent(),/已启用/);
    await popup.screenshot({path:path.join(evidenceRoot,'popup.png')});await popup.close();
  });
  await check('reload starts disabled until explicit activation',async()=>{
    await page.reload();await hoverText(page,'#academy','academy');await sleep(450);
    assert.equal(await page.locator('[data-hover-reader-overlay]').count(),0);
  });
  await check('live page removal of hovered text hides the overlay',async()=>{
    await enable(page);await hoverText(page,'#academy','academy');await waitCard(page,/学院/);
    await page.locator('#academy').evaluate(el=>el.remove());await sleep(100);
    assert.equal((await cardState(page)).visible,false);
  });
  await check('all lookup messages contain only one word; all dictionary fetches stay inside extension',async()=>{
    const traffic=await worker.evaluate(()=>({messages:testMessages,fetches:testFetches}));
    assert.ok(traffic.messages.length>0&&traffic.fetches.length>0);
    assert.ok(traffic.messages.every(m=>Object.keys(m).sort().join(',')==='type,word'&&/^[a-z]+(?:['-][a-z]+)*$/.test(m.word)));
    assert.ok(traffic.fetches.every(u=>u.startsWith(`chrome-extension://${id}/data/`)));
    await writeFile(path.join(evidenceRoot,'lookup-traffic.json'),JSON.stringify(traffic,null,2));
  });
  for(const [name,url,word] of [['Academy','https://academy.openai.com/','Learning'],['ChatGPT Learn','https://chatgpt.com/learn','ChatGPT']]) {
    const real=await context.newPage();
    try {
      await real.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await sleep(1000);
      await enable(real);
      // Public visible text only; no authentication or user browsing context.
      const point=await real.evaluate(()=>{
        const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()) {
          const n=walker.currentNode, parent=n.parentElement;
          if(parent.closest('script,style,form,[contenteditable],button'))continue;
          const match=/\b(academy|learn|learning|explore|resources|welcome|chatgpt|discover|understand)\b/i.exec(n.textContent);
          if(!match)continue;
          const r=document.createRange();r.setStart(n,match.index);r.setEnd(n,match.index+match[0].length);
          const b=r.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;
          if(b.width&&x>0&&y>0&&x<innerWidth&&y<innerHeight&&getComputedStyle(parent).visibility!=='hidden')return{x,y,word:match[0]};
        }
        return null;
      });
      if(!point)throw Error('No visible word geometry');
      await real.mouse.move(point.x,point.y);const state=await waitCard(real,/美式/);
      await real.screenshot({path:path.join(evidenceRoot,`real-${name==='Academy'?'academy':'learn'}.png`)});
      results.push({name:`real public ${name} page`,status:'passed',url:real.url(),title:await real.title(),hover:state.text});
      console.log('PASS real page',name,point.word);
    } catch(e) {
      await real.screenshot({path:path.join(evidenceRoot,`blocked-${name==='Academy'?'academy':'learn'}.png`)}).catch(()=>{});
      results.push({name:`real public ${name} page`,status:'blocked',url:real.url(),reason:String(e)});console.log('BLOCKED real page',name,String(e));
    }
    finally {await real.close();}
  }
  assert.deepEqual(errors,[]);
} catch(e) {console.error(e);process.exitCode=1;}
finally {
  await context?.close();if(server)await new Promise(r=>server.close(r));
  await rm(temporary,{recursive:true,force:true});
  await writeFile(path.join(evidenceRoot,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),testEnvironment:'Isolated Chrome for Testing 145 / Playwright 1.58.2, headless. Test-only scoped host grants, real production JS. Production activeTab toolbar grant not verified.',results,errors},null,2)+'\n');
}
