import hashlib
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'

def make(name, paths):
    dest = OUT / name
    with zipfile.ZipFile(dest, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for base in paths:
            for file in sorted(base.rglob('*') if base.is_dir() else [base]):
                if not file.is_file() or '__pycache__' in file.parts: continue
                info = zipfile.ZipInfo(str(file.relative_to(ROOT)), date_time=(2026,10,5,0,0,0))
                info.compress_type=zipfile.ZIP_DEFLATED
                info.external_attr=0o644 << 16
                archive.writestr(info, file.read_bytes(), compresslevel=9)
    with zipfile.ZipFile(dest) as archive: assert archive.testzip() is None
    return f'{hashlib.sha256(dest.read_bytes()).hexdigest()}  {name}'

OUT.mkdir(exist_ok=True)
version = json.loads((ROOT/'extension'/'manifest.json').read_text())['version']
checksums = [make(f'shunshou-reader-{version}-extension.zip', [ROOT/'extension']),
             make(f'shunshou-reader-{version}-source.zip', [ROOT/p for p in ['extension','scripts','tests','upstream','authorization-evidence','README.md','DATA-SOURCES.md','TEST-REPORT.md','RELEASE-NOTES.md','docs','LICENSE','package.json','THIRD-PARTY-NOTICES.md','ECDICT-AUTHORIZATION.md']])]
(OUT/f'SHA256SUMS-{version}.txt').write_text('\n'.join(checksums)+'\n')
print('\n'.join(checksums))
