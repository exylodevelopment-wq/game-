"""Embed the game sources and the user-provided artwork in one portable HTML file."""
import base64
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
assets = {name: 'data:image/png;base64,' + base64.b64encode((root / 'assets' / file).read_bytes()).decode('ascii')
          for name, file in [('locations', 'locations.png'), ('survivor', 'survivor.png'), ('zombies', 'zombies.png')]}
embedded = '<script>window.EMBEDDED_ART=' + json.dumps(assets) + ';</script>\n'
html = html.replace('<script src="art.js"></script>', embedded + '<script>\n' + (root / 'art.js').read_text() + '\n</script>')
html = html.replace('<script src="game.js"></script>', '<script>\n' + (root / 'game.js').read_text() + '\n</script>')
output = root / 'dist' / 'Ultimul-Rasarit.html'
output.parent.mkdir(exist_ok=True)
output.write_text(html)
print(f'{output} ({output.stat().st_size:,} bytes)')


# ZIP delivery avoids document viewers showing the HTML source instead of running it.
archive = output.with_name('Ultimul-Rasarit-JOACA.zip')
instructions = """ULTIMUL RĂSĂRIT — CUM PORNEȘTI JOCUL

1. Descarcă și dezarhivează complet arhiva.
2. Pe calculator, clic dreapta pe index.html -> Deschide cu -> Chrome, Edge sau Firefox.
3. Apasă ÎNCEPE SUPRAVIEȚUIREA.

Previzualizarea fișierelor din chat poate afișa codul; jocul trebuie deschis în browser din folderul dezarhivat.
Toate imaginile și codul jocului sunt deja incluse. Nu copia codul manual.

Pe Android este necesar un browser care permite HTML local.
Pe iPhone/iPad previzualizarea Fișiere poate să nu execute jocul; este necesar un site sau o aplicație care rulează HTML local.
"""
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as bundle:
    bundle.write(output, 'index.html')
    bundle.writestr('CUM-PORNESC.txt', instructions)
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert bundle.read('index.html') == output.read_bytes()
print(f'{archive} ({archive.stat().st_size:,} bytes; verified)')
