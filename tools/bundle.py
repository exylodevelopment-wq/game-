"""Build a portable game and downloadable ZIP, including only the playable code."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
for script in ['loot.js', 'world.js', 'art.js', 'game.js']:
    html = html.replace(f'<script src="{script}"></script>', '<script>\n' + (root / script).read_text() + '\n</script>')
assert 'EMBEDDED_ART' not in html
assert '<script src=' not in html
output = root / 'dist' / 'Ultimul-Rasarit.html'
output.parent.mkdir(exist_ok=True)
output.write_text(html)
archive = output.with_name('Ultimul-Rasarit-JOACA.zip')
instructions = '''ULTIMUL RĂSĂRIT — VERSIUNEA 0.3

1. Descarcă și dezarhivează complet arhiva.
2. Clic dreapta pe index.html -> Deschide cu -> Chrome, Edge sau Firefox.
3. Începe o partidă nouă (lumea și salvările sunt diferite de versiunea 0.2).

WASD/săgeți: mișcare. Shift: alergare. E: cercetează / adună.
După cercetare, ridică manual obiectele dorite din fereastra de loot.
1: schimbă arma găsită. R: reîncarcă. Click/Space: atacă.
B: rucsac. M: hartă. Escape: închide / pauză.
Pe telefon: joystick și butoane tactile.

Armele și proviziile sunt rare. Unele case și corpuri nu conțin nimic.
Bisericile nu generează arme sau muniție. Bazele militare au șanse mai mari.
Omorurile nu acordă automat obiecte: cercetează corpurile cu E.
Grafică pixel art desenată pentru joc; nu este nevoie de internet sau fișiere imagine externe.
'''
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as bundle:
    bundle.write(output, 'index.html')
    bundle.writestr('CUM-PORNESC.txt', instructions)
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert bundle.read('index.html') == output.read_bytes()
print(f'{output} ({output.stat().st_size:,} bytes)')
print(f'{archive} ({archive.stat().st_size:,} bytes; verified)')
