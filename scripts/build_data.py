"""Reproducible, offline projection of pinned upstream files. No IPA conversion."""
import csv
import hashlib
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
UP = ROOT / 'upstream'
OUT = ROOT / 'extension' / 'data'
WORD = re.compile(r"[a-z]+(?:['-][a-z]+)*\Z")

def key(value):
    return value.strip().lower().replace('’', "'")

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def build():
    entries = {}
    ipa_path = UP / 'open-dict-data--ipa-dict--data--en_US.txt'
    zh_path = UP / 'skywind3000--ECDICT--ecdict.csv'
    for line in ipa_path.read_text().splitlines():
        raw, ipa = line.split('\t', 1)
        word = key(raw)
        if WORD.fullmatch(word) and len(word) <= 64:
            # Preserve the upstream transcription verbatim, including variants/stress.
            entries.setdefault(word, [None, None])[0] = ipa
    for row in csv.DictReader(zh_path.open(newline='', encoding='utf-8-sig')):
        word = key(row['word'])
        zh = row['translation'].strip().replace('\\n', '\n')
        if WORD.fullmatch(word) and len(word) <= 64 and zh:
            entries.setdefault(word, [None, None])[1] = zh
    OUT.mkdir(exist_ok=True)
    shards = {}
    for char in 'abcdefghijklmnopqrstuvwxyz':
        data = {w: entries[w] for w in sorted(entries) if w[0] == char}
        file = OUT / f'{char}.json'
        file.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
        shards[file.name] = {'sha256': digest(file), 'entries': len(data), 'bytes': file.stat().st_size}
    stats = {
        'entries': len(entries), 'with_us_ipa': sum(bool(v[0]) for v in entries.values()),
        'with_chinese': sum(bool(v[1]) for v in entries.values()),
        'with_both': sum(bool(v[0] and v[1]) for v in entries.values()),
        'policy': 'Exact lowercase ASCII single words, internal apostrophe/hyphen. No lemma inference or IPA generation.',
        'pins': json.loads((UP / 'pins.json').read_text()),
        'upstream_sha256': {p.name: digest(p) for p in sorted(UP.iterdir()) if p.is_file()},
        'shards': shards,
    }
    (OUT / 'metadata.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2) + '\n')
    licenses = ROOT / 'extension' / 'licenses'
    shutil.copyfile(ROOT / 'LICENSE', licenses / 'hover-reader.txt')
    for repo in ['open-dict-data--ipa-dict', 'skywind3000--ECDICT', 'lingz--cmudict-ipa', 'cmusphinx--cmudict']:
        shutil.copyfile(UP / f'{repo}--LICENSE', licenses / f'{repo}.txt')
    source = (UP / 'kylebgorman--syllabify--syllabify.py').read_text().split('# syllabify.py:')[0]
    (licenses / 'kylebgorman--syllabify.txt').write_text('\n'.join(line.removeprefix('# ').removeprefix('#') for line in source.splitlines()[1:]) + '\n')
    print(json.dumps({k: stats[k] for k in ['entries', 'with_us_ipa', 'with_chinese', 'with_both']}, indent=2))

if __name__ == '__main__':
    build()
