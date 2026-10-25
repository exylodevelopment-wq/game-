"""Build the self-contained game and a verified downloadable ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import base64
import hashlib
import json
import re

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
manifest = json.loads((root / 'assets' / 'classic' / 'manifest.json').read_text())
embedded = {}
for key, metadata in manifest['files'].items():
    data = (root / metadata['file']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == metadata['sha256'], 'Modified upstream sprite: ' + key
    embedded[key] = 'data:image/png;base64,' + base64.b64encode(data).decode('ascii')
for script in re.findall(r'<script src="([^"]+)"></script>', html):
    source = (root / script).read_text()
    if script == 'classic-asset-files.js':
        source += '\nwindow.CLASSIC_ASSET_DATA=' + json.dumps(embedded) + ';\n'
    html = html.replace(f'<script src="{script}"></script>', '<script>\n' + source + '\n</script>')
assert '<script src=' not in html
output = root / 'dist' / 'Ultimul-Rasarit.html'
output.parent.mkdir(exist_ok=True)
output.write_text(html)
archive = output.with_name('Ultimul-Rasarit-JOACA.zip')
instructions = '''ULTIMUL RĂSĂRIT — VERSIUNEA 0.4 · SEMNAL PIERDUT

1. Descarcă și dezarhivează complet arhiva.
2. Clic dreapta pe index.html -> Deschide cu -> Chrome, Edge sau Firefox.
3. Începe o partidă nouă. Salvările 0.3 rămân separate.

WASD/săgeți: mișcare. Shift: alergare. E: cercetează / adună / interacționează.
Ridică manual obiectele din fereastra de loot. 1: schimbă arma găsită.
R: reîncarcă. Click/Space: atacă. B: rucsac. M: hartă. Escape: închide / pauză.
Pe telefon: joystick și butoane tactile.

MISIUNE: găsește atelierul radio R pe hartă și recuperează 2 baterii, 4 metal și
1 sfoară din regiune. Repară stația, rămâi aproape până termini transmisia de
90 de secunde, apoi mergi la debarcaderul E și interacționează pentru evacuare.
Semnalul atrage infectați. Poți continua explorarea după încheierea misiunii.

Lootul normal rămâne rar; bisericile nu generează arme sau muniție.
Omorurile nu acordă automat obiecte. Toate spriteurile necesare sunt incluse,
nu este necesară conexiune la Internet după descărcare.

Asseturi: 011eh/minidayz, fan reconstruction of Mini DAYZ. Vezi CREDITE-ASSETURI.txt.
'''
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as bundle:
    bundle.write(output, 'index.html')
    bundle.writestr('CUM-PORNESC.txt', instructions)
    bundle.writestr('CREDITE-ASSETURI.txt', (root / 'THIRD_PARTY_ASSETS.md').read_text())
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert bundle.read('index.html') == output.read_bytes()
print(f'{output} ({output.stat().st_size:,} bytes, {len(embedded)} verified sprites)')
print(f'{archive} ({archive.stat().st_size:,} bytes; verified)')
