"""Download public dictionary snapshots only; never reads browser or page data."""
import concurrent.futures
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'upstream'
FILES = {
    'open-dict-data/ipa-dict': ['README.md', 'LICENSE', 'data/en_US.txt'],
    'skywind3000/ECDICT': ['README.md', 'LICENSE', 'ecdict.csv'],
    'lingz/cmudict-ipa': ['README.md', 'LICENSE'],
    'cmusphinx/cmudict': ['README', 'LICENSE'],
    'kylebgorman/syllabify': ['README.md', 'syllabify.py'],
}

def read(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'HoverReader-local-build'})
    return urllib.request.urlopen(req, timeout=90)

def pin(repo):
    with read(f'https://api.github.com/repos/{repo}/commits?per_page=1') as r:
        return repo, json.load(r)[0]['sha']

def download(task):
    repo, sha, name = task
    dest = OUT / (repo.replace('/', '--') + '--' + name.replace('/', '--'))
    with read(f'https://raw.githubusercontent.com/{repo}/{sha}/{name}') as r, dest.open('wb') as out:
        while chunk := r.read(1024 * 1024):
            out.write(chunk)
    print(dest.name, dest.stat().st_size, flush=True)

if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    pins_file = OUT / 'pins.json'
    if pins_file.exists():
        pins = json.loads(pins_file.read_text())
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            pins = dict(pool.map(pin, FILES))
        pins_file.write_text(json.dumps(pins, indent=2) + '\n')
    print(json.dumps(pins, indent=2), flush=True)
    tasks = [(repo, pins[repo], name) for repo, names in FILES.items() for name in names]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(download, tasks))
