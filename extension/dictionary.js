export function normalizeWord(word) {
  if (typeof word !== 'string' || word.length > 64) return null;
  const key = word.toLowerCase().replaceAll('’', "'");
  return /^[a-z]+(?:['-][a-z]+)*$/.test(key) ? key : null;
}

export class Dictionary {
  constructor(loader) {
    this.loader = loader;
    this.shards = new Map();
    this.pending = new Map();
    this.cache = new Map();
  }
  async shard(letter) {
    if (this.shards.has(letter)) {
      const data = this.shards.get(letter);
      this.shards.delete(letter);
      this.shards.set(letter, data);
      return data;
    }
    if (this.pending.has(letter)) return this.pending.get(letter);
    const promise = (async () => {
      const data = await this.loader(letter);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid dictionary');
      this.shards.set(letter, data);
      while (this.shards.size > 4) this.shards.delete(this.shards.keys().next().value);
      return data;
    })();
    this.pending.set(letter, promise);
    try { return await promise; } finally { this.pending.delete(letter); }
  }
  async lookup(raw) {
    const word = normalizeWord(raw);
    if (!word) return {status: 'invalid'};
    if (this.cache.has(word)) return this.cache.get(word);
    const data = await this.shard(word[0]);
    const value = Object.hasOwn(data, word) ? data[word] : null;
    if (value !== null && (!Array.isArray(value) || value.length !== 2 || value.some(v => v !== null && typeof v !== 'string'))) {
      // Don't retain a damaged shard. A later hover can retry loading it.
      this.shards.delete(word[0]);
      throw Error('Damaged dictionary entry');
    }
    const result = {status: value ? 'found' : 'missing', word, ipa: value?.[0] || null, zh: value?.[1] || null};
    // Verified ECDICT exchange: courses = 1:s3/0:course, with reciprocal
    // course s:courses/3:courses. Supplement Chinese only; never reuse base IPA.
    if (word === 'courses') {
      const base = await this.lookup('course');
      if (base.zh) {
        result.zh = `course 的复数 / 第三人称单数：\n${base.zh}` +
          (result.zh ? `\n\ncourses 的原词条义：\n${result.zh}` : '');
        result.chineseSupplement = 'course';
      }
    }
    this.cache.set(word, result);
    while (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value);
    return result;
  }
}
