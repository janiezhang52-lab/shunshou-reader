"""Audit packaged fields against their pinned upstream originals and all hashes."""
import csv
import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'extension' / 'data'
UP = ROOT / 'upstream'
meta = json.loads((DATA / 'metadata.json').read_text())
def sha(file): return hashlib.sha256(file.read_bytes()).hexdigest()
for filename, expected in meta['upstream_sha256'].items():
    assert sha(UP / filename) == expected, filename
ipa = {}
for line in (UP / 'open-dict-data--ipa-dict--data--en_US.txt').read_text().splitlines():
    word, value = line.split('\t', 1)
    ipa[word.strip().lower().replace('’', "'")] = value
zh = {row['word'].strip().lower().replace('’', "'"): row['translation'].strip().replace('\\n', '\n')
      for row in csv.DictReader((UP / 'skywind3000--ECDICT--ecdict.csv').open(newline='', encoding='utf-8-sig')) if row['translation'].strip()}
counts = {'entries':0,'with_us_ipa':0,'with_chinese':0,'with_both':0}
for filename, details in meta['shards'].items():
    file = DATA / filename
    assert sha(file) == details['sha256'], filename
    entries = json.loads(file.read_text())
    assert len(entries) == details['entries']
    for word, (us, chinese) in entries.items():
        if us: assert us == ipa[word], ('IPA differs from source', word)
        if chinese: assert chinese == zh[word], ('Chinese differs from source', word)
        counts['entries'] += 1
        counts['with_us_ipa'] += bool(us)
        counts['with_chinese'] += bool(chinese)
        counts['with_both'] += bool(us and chinese)
assert counts == {key: meta[key] for key in counts}
report = {'status':'passed','counts':counts,'checks':['all upstream SHA-256','all 26 shard SHA-256','every IPA is identical to the exact upstream en_US entry','every Chinese field is identical to ECDICT translation with only newline decoding','all reported coverage counts']}
(ROOT / 'evidence' / 'data-integrity.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
