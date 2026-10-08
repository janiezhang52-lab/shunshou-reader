import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FrameCoordinator, sameState} from '../extension/frames.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

function fixture() {
  const documents = new Map([
    ['top', {frameId:0, documentId:'top', installed:true, state:{enabled:false, generation:0, sessionId:'session-a'}}],
    ['child', {frameId:2, documentId:'child', installed:false, state:{enabled:false, generation:0, sessionId:null}}],
    ['nested', {frameId:5, documentId:'nested', installed:false, state:{enabled:false, generation:0, sessionId:null}}]
  ]);
  const calls = [];
  const api = {
    runtime:{id:'reader'},
    tabs:{async sendMessage(tabId, message, destination) {
      assert.equal(tabId, 42);
      const document = destination.documentId ? documents.get(destination.documentId) : [...documents.values()].find(item => item.frameId === destination.frameId);
      if (!document?.installed) throw Error('No receiver');
      calls.push({kind:'message', message, destination});
      if (message.type === 'hover-reader:enable') {
        assert.equal(document.frameId, 0);
        document.state = {...document.state, enabled:message.enabled, generation:document.state.generation + 1};
      } else if (message.type === 'hover-reader:frame-state') {
        assert.notEqual(document.frameId, 0);
        if (message.sessionId !== document.state.sessionId || message.generation >= document.state.generation) {
          document.state = {enabled:message.enabled, generation:message.generation, sessionId:message.sessionId};
        }
      }
      return {...document.state};
    }},
    scripting:{async executeScript(request) {
      calls.push({kind:'injection', request});
      const targets = [...documents.values()].filter(document => request.target.allFrames || request.target.frameIds.includes(document.frameId));
      if (request.files) for (const document of targets) document.installed = true;
      const result = targets.map(document => ({frameId:document.frameId, documentId:document.documentId, result:request.files ? null : document.installed}));
      if (api.afterInjection) await api.afterInjection(request, result);
      return result;
    }}
  };
  const coordinator = new FrameCoordinator(api, {delay:async () => {}});
  return {api, coordinator, documents, calls};
}

test('activation and pause acknowledge all child documents; authority remains in the main frame', async () => {
  const {coordinator, documents, calls} = fixture();
  const active = await coordinator.toggle(42, true);
  assert.equal(active.enabled, true);
  assert.equal(active.frames, 2);
  for (const document of documents.values()) assert.ok(sameState(document.state, active));
  const paused = await coordinator.toggle(42, false);
  assert.equal(paused.generation, 2);
  for (const document of documents.values()) assert.ok(sameState(document.state, paused));
  const childChanges = calls.filter(call => call.message?.type === 'hover-reader:frame-state');
  assert.ok(childChanges.every(call => call.destination.documentId && !('frameId' in call.destination)));
  assert.equal(calls.filter(call => call.kind === 'injection' && call.request.files).length, 2);
});

test('a suspended/recreated worker recovers authority and validates each sender without a registry', async () => {
  const {api, coordinator, documents} = fixture();
  await coordinator.toggle(42, true);
  const restarted = new FrameCoordinator(api, {delay:async () => {}});
  const sender = {id:'reader', tab:{id:42}, frameId:5, documentId:'nested'};
  assert.ok((await restarted.ownSenderState(sender)).enabled);
  assert.equal(await restarted.ownSenderState({...sender, id:'other-extension'}), null);
  assert.equal(await restarted.ownSenderState({...sender, documentId:'departed-document'}), null);
  documents.get('nested').state.enabled = false;
  assert.equal(await restarted.ownSenderState(sender), null);
});

test('bursts of iframe notifications coalesce into one injection pass', async () => {
  const {api, documents, calls} = fixture();
  documents.get('top').state = {enabled:true, generation:1, sessionId:'session-a'};
  const gate = deferred();
  const coordinator = new FrameCoordinator(api, {delay:() => gate.promise});
  const one = coordinator.synchronize(42);
  const two = coordinator.synchronize(42);
  const three = coordinator.synchronize(42);
  assert.equal(one, two);
  assert.equal(two, three);
  gate.resolve();
  await Promise.all([one, two, three]);
  assert.equal(calls.filter(call => call.kind === 'injection').length, 1);
});

test('pause wins while activation injection is in flight and does not wait behind it', async () => {
  const {api, coordinator, documents} = fixture();
  const started = deferred(), release = deferred();
  api.afterInjection = async request => {
    if (request.files && request.target.allFrames) { started.resolve(); await release.promise; }
  };
  const enabling = coordinator.toggle(42, true);
  await started.promise;
  const paused = await coordinator.toggle(42, false);
  assert.equal(paused.enabled, false);
  release.resolve();
  assert.equal((await enabling).enabled, false);
  for (const document of documents.values()) assert.ok(sameState(document.state, paused));
});

test('a navigation during injection cannot apply the previous document session to children', async () => {
  const {api, coordinator, documents, calls} = fixture();
  api.afterInjection = async request => {
    if (request.files && request.target.allFrames) {
      documents.get('top').state = {enabled:false, generation:0, sessionId:'session-b'};
    }
  };
  const result = await coordinator.toggle(42, true);
  assert.equal(result.enabled, false);
  assert.equal(result.sessionId, 'session-b');
  assert.equal(calls.filter(call => call.message?.type === 'hover-reader:frame-state').length, 0);
});

test('a frame added while a sync is in progress gets one trailing pass', async () => {
  const {api, coordinator, documents, calls} = fixture();
  documents.get('top').state = {enabled:true, generation:1, sessionId:'session-a'};
  let once = true;
  api.afterInjection = async request => {
    if (once && request.files && request.target.allFrames) {
      once = false;
      documents.set('late', {frameId:9, documentId:'late', installed:false, state:{enabled:false, generation:0, sessionId:null}});
      coordinator.synchronize(42);
    }
  };
  await coordinator.synchronize(42);
  assert.ok(sameState(documents.get('late').state, documents.get('top').state));
  assert.equal(calls.filter(call => call.kind === 'injection').length, 2);
});
