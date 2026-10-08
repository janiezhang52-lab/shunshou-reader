const button = document.querySelector('#toggle');
const status = document.querySelector('#status');
let tabId, enabled = false;
function update(value) {
  enabled = value;
  button.textContent = enabled ? '暂停当前页' : '启用当前页';
  button.disabled = false;
  status.textContent = enabled ? '已启用 · 可以移回网页悬停查词' : '只在你启用的当前页面运行';
}
async function init() {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  tabId = tab?.id;
  if (!tabId || !/^https?:\/\//.test(tab.url || '')) throw Error('Restricted page');
  try {
    const response = await chrome.tabs.sendMessage(tabId, {type:'hover-reader:status'}, {frameId:0});
    update(Boolean(response?.enabled));
  } catch { update(false); }
}
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({type:'hover-reader:toggle', tabId, enabled:!enabled});
    if (!result || typeof result.enabled !== 'boolean') throw Error('No response');
    update(result.enabled);
  } catch {
    button.disabled = false;
    status.textContent = '无法启用：请刷新普通网页后重试。Chrome 内部页、商店页及 PDF 不支持。';
  }
});
init().catch(() => {
  button.textContent = '请先打开英文网页';
  status.textContent = 'Chrome 内部页、商店页、文件与 PDF 不支持';
});
