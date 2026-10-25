"""Import pinned, unchanged PNG sprites from the user-selected upstream checkout.
Usage: python3 tools/import_classic_assets.py /tmp/minidayz-reference
"""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

SOURCE_COMMIT = 'fa2e73a3f899bd59ded1a9e920eda92f822c32ba'
root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/minidayz-reference')
actual = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
if actual != SOURCE_COMMIT:
    raise SystemExit('Unexpected upstream revision; review asset mappings before importing.')
images = source / 'asset' / 'images'
# Read the explicit renderer requirements without invoking DOM/image loading.
listing = subprocess.check_output(['node', '-e', "globalThis.window=globalThis;require('./classic-actors.js');require('./classic-world-art.js');process.stdout.write(JSON.stringify([...new Set([...ClassicActors.paths,...ClassicWorldArt.paths])].sort()));"], cwd=root, text=True)
paths = set(json.loads(listing))
manifest_path = root / 'assets' / 'classic' / 'manifest.json'
old = json.loads(manifest_path.read_text())['files'] if manifest_path.exists() else {}
for key, info in old.items():
    stale = root / info['file']
    if key not in paths and stale.is_file() and hashlib.sha256(stale.read_bytes()).hexdigest() == info['sha256']:
        stale.unlink()
manifest = {}
for key in sorted(paths):
    original = images / key
    if not original.is_file():
        raise SystemExit('Missing upstream asset: ' + key)
    target = root / 'assets' / 'classic' / key
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(original, target)
    manifest[key] = {'file': target.relative_to(root).as_posix(),
                     'sha256': hashlib.sha256(original.read_bytes()).hexdigest()}
(root / 'assets' / 'classic' / 'manifest.json').write_text(json.dumps({
    'source': 'https://github.com/011eh/minidayz', 'commit': SOURCE_COMMIT, 'files': manifest
}, indent=2) + '\n')
(root / 'classic-asset-files.js').write_text('window.CLASSIC_ASSET_FILES = ' + json.dumps({
    key: value['file'] for key, value in manifest.items()
}, indent=2) + ';\n')
print(f'Imported {len(manifest)} unchanged PNGs from {SOURCE_COMMIT}.')
print('Total PNG bytes:', sum((root / value['file']).stat().st_size for value in manifest.values()))
