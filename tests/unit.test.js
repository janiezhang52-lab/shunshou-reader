import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Dictionary, normalizeWord} from '../extension/dictionary.js';

test('only accepts a single ASCII word; normalizes curly apostrophe and case', () => {
  assert.equal(normalizeWord('DON’T'), "don't");
  assert.equal(normalizeWord('well-being'), 'well-being');
  for (const value of ['hello world', '../a', '<script>', 'hello@x', 'abc123', 'café', 'a'.repeat(65), null, {}]) assert.equal(normalizeWord(value), null);
});

test('first lookup, repeat lookup, parallel shard requests, exact missing fields', async () => {
  let loads = 0;
  const dictionary = new Dictionary(async () => { loads++; await new Promise(r => setTimeout(r, 10)); return {academy:['/əˈkædəmi/', 'n. 学院'], absent:[null,'adj. 缺席的']}; });
  const [one,two] = await Promise.all([dictionary.lookup('Academy'), dictionary.lookup('absent')]);
  assert.equal(one.status, 'found'); assert.equal(two.ipa, null); assert.equal(loads, 1);
  assert.equal(await dictionary.lookup('academy'), one); assert.equal(loads, 1);
  assert.deepEqual(await dictionary.lookup('axqzzq'), {status:'missing',word:'axqzzq',ipa:null,zh:null});
});

test('loader failures are not cached; a later lookup can retry', async () => {
  let loads = 0;
  const dictionary = new Dictionary(async () => { if (++loads === 1) throw Error('fail'); return {hello:['/həˈloʊ/',null]}; });
  await assert.rejects(dictionary.lookup('hello'));
  assert.equal((await dictionary.lookup('hello')).status, 'found'); assert.equal(loads, 2);
});

test('bounded shard and word caches; invalid input never loads a file', async () => {
  let loads = 0;
  const dictionary = new Dictionary(async () => { loads++; return {}; });
  await dictionary.lookup('../private'); assert.equal(loads, 0);
  for (const char of 'abcdefghijk') await dictionary.lookup(char);
  assert.equal(dictionary.shards.size, 4);
  for (let i = 0; i < 300; i++) await dictionary.lookup('word' + String.fromCharCode(97 + Math.floor(i/26), 97 + i%26));
  assert.equal(dictionary.cache.size, 256);
});

test('damaged entry is rejected and shard is reloaded', async () => {
  let loads = 0;
  const dictionary = new Dictionary(async () => (++loads === 1 ? {bad:{ipa:'fake'}} : {bad:['/bæd/',null]}));
  await assert.rejects(dictionary.lookup('bad'));
  assert.equal((await dictionary.lookup('bad')).ipa, '/bæd/'); assert.equal(loads, 2);
});

test('real packaged data has separate US and Chinese coverage; no fabricated fallback', async () => {
  const dictionary = new Dictionary(async letter => JSON.parse(await readFile(new URL(`../extension/data/${letter}.json`, import.meta.url), 'utf8')));
  const academy = await dictionary.lookup('academy');
  assert.equal(academy.ipa, '/əˈkædəmi/'); assert.match(academy.zh, /学院/);
  const prompt = await dictionary.lookup('prompt'); assert.ok(prompt.ipa); assert.ok(prompt.zh);
  const missing = await dictionary.lookup('zzzxnonexistentword'); assert.equal(missing.status, 'missing');
  const metadata = JSON.parse(await readFile(new URL('../extension/data/metadata.json', import.meta.url), 'utf8'));
  assert.ok(metadata.with_both < metadata.with_chinese);
  const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.permissions, ['activeTab','scripting']);
  for (const permission of ['host_permissions','optional_host_permissions','content_scripts','web_accessible_resources']) assert.equal(manifest[permission], undefined);
});

test('courses supplements verified course meanings while keeping its own exact IPA', async () => {
  let loads = 0;
  const data = JSON.parse(await readFile(new URL('../extension/data/c.json', import.meta.url), 'utf8'));
  const dictionary = new Dictionary(async () => { loads++; return data; });
  const result = await dictionary.lookup('COURSES');
  assert.match(result.zh, /课程/);
  assert.match(result.zh, /courses 的原词条义：\n\[医\] 月经/);
  assert.equal(result.chineseSupplement, 'course');
  assert.equal(result.ipa, data.courses[0]);
  assert.notEqual(result.ipa, data.course[0]);
  assert.ok(result.zh.includes(data.course[1]));
  assert.equal(await dictionary.lookup('courses'), result);
  assert.equal(loads, 1);
  assert.equal((await dictionary.lookup('course')).zh, data.course[1]);
});

test('courses with missing base Chinese keeps exact data and never borrows IPA', async () => {
  const dictionary = new Dictionary(async () => ({courses:[null,'[医] 月经'],course:['/kɔɹs/',null]}));
  const result = await dictionary.lookup('courses');
  assert.equal(result.ipa, null);
  assert.equal(result.zh, '[医] 月经');
  assert.equal(result.chineseSupplement, undefined);
});
