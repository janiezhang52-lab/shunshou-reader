// The top document owns state. No enabled-tab registry survives (or needs to
// survive) service-worker suspension; every operation asks the current document.
export function validState(value) {
  return value && typeof value.enabled === 'boolean' &&
    Number.isSafeInteger(value.generation) && value.generation >= 0 &&
    typeof value.sessionId === 'string' && value.sessionId.length > 0;
}

export function sameState(a, b) {
  return validState(a) && validState(b) && a.enabled === b.enabled &&
    a.generation === b.generation && a.sessionId === b.sessionId;
}

export class FrameCoordinator {
  constructor(api, {delay = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
    this.api = api;
    this.delay = delay;
    this.pending = new Map();
  }

  async state(tabId, destination = {frameId: 0}) {
    try {
      const state = await this.api.tabs.sendMessage(tabId, {type:'hover-reader:status'}, destination);
      return validState(state) ? state : null;
    } catch { return null; }
  }

  destination(frame) {
    // A frame ID can be reused when its document navigates. Target the exact
    // document returned by executeScript whenever Chrome supplies its ID.
    return frame.documentId ? {documentId:frame.documentId} : {frameId:frame.frameId};
  }

  async ownSenderState(sender) {
    if (sender.id !== this.api.runtime.id || !Number.isInteger(sender.tab?.id) || !Number.isInteger(sender.frameId)) return null;
    const [authority, local] = await Promise.all([
      this.state(sender.tab.id),
      this.state(sender.tab.id, this.destination(sender))
    ]);
    return authority?.enabled && sameState(authority, local) ? authority : null;
  }

  async fanout(tabId, frames, expected) {
    const current = await this.state(tabId);
    if (!sameState(current, expected)) return {state:current, acknowledged:0, superseded:true};
    const children = frames.filter(frame => frame.frameId !== 0);
    const responses = await Promise.allSettled(children.map(frame => this.api.tabs.sendMessage(tabId, {
      type:'hover-reader:frame-state', ...expected
    }, this.destination(frame))));
    const acknowledged = responses.filter(result => result.status === 'fulfilled' && sameState(result.value, expected)).length;
    // A disappearing/navigating child is expected. Its new document will be
    // initialized disabled and picked up by the iframe load notification.
    return {state:await this.state(tabId), acknowledged, attempted:children.length};
  }

  async synchronizeOnce(tabId) {
    const before = await this.state(tabId);
    if (!before?.enabled) return {state:before, acknowledged:0};
    const frames = await this.api.scripting.executeScript({
      target:{tabId, allFrames:true}, files:['core.js', 'content.js']
    });
    return this.fanout(tabId, frames, before);
  }

  synchronize(tabId) {
    const running = this.pending.get(tabId);
    if (running) {
      running.dirty = true;
      return running.promise;
    }
    const job = {dirty:true, promise:null};
    this.pending.set(tabId, job);
    job.promise = (async () => {
      let result;
      do {
        // Coalesce frame additions from several nested documents into one pass.
        await this.delay(80);
        job.dirty = false;
        result = await this.synchronizeOnce(tabId);
      } while (job.dirty && result.state?.enabled);
      return result;
    })().finally(() => { if (this.pending.get(tabId) === job) this.pending.delete(tabId); });
    return job.promise;
  }

  async toggle(tabId, enabled) {
    if (!Number.isInteger(tabId) || tabId < 0 || typeof enabled !== 'boolean') throw Error('Invalid target');
    if (enabled) await this.api.scripting.executeScript({
      target:{tabId, frameIds:[0]}, files:['core.js', 'content.js']
    });
    const authority = await this.api.tabs.sendMessage(tabId, {type:'hover-reader:enable', enabled}, {frameId:0});
    if (!validState(authority)) throw Error('No main document response');
    if (enabled) {
      const result = await this.synchronize(tabId);
      if (!validState(result.state)) throw Error('Page changed during activation');
      return {...result.state, frames:result.acknowledged};
    }
    // Discover installed controllers without injecting a new content script.
    // Pause must not wait behind an in-flight activation or frame-loading pass.
    const frames = await this.api.scripting.executeScript({
      target:{tabId, allFrames:true}, func:() => Boolean(globalThis.__hoverReader)
    });
    const result = await this.fanout(tabId, frames.filter(frame => frame.result), authority);
    if (!validState(result.state)) throw Error('Page changed during pause');
    return {...result.state, frames:result.acknowledged};
  }
}
